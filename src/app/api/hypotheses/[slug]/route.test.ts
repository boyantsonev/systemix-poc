import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

// PATCH /api/hypotheses/[slug] is the driving port. HYPOTHESES_DIR binds to
// process.cwd() at import, so each test chdirs into a fresh tmp workspace and
// re-imports the route. The key behaviour: surgical frontmatter edits that
// PRESERVE the MDX prose body. Real fs, no mocks.

let tmp: string;
let originalCwd: string;

const PROSE = [
  "## Why This Hypothesis",
  "",
  "A sharper headline communicates value faster. This prose MUST survive a PATCH.",
  "",
  "## Success Criteria",
  "",
  "- Primary metric: signup conversion",
].join("\n");

const ORIGINAL = [
  "---",
  "type: hypothesis",
  "id: pricing-headline-v2",
  "section: pricing",
  'hypothesis: "Original framing"',
  "icp: founders",
  "status: running",
  "created: 2026-06-01",
  "variants:",
  '  control: "A"',
  '  variant_b: "B"',
  "result: null",
  "decision: null",
  "confidence: null",
  "evidence-posthog: null",
  "evidence-social: null",
  "---",
  "",
  PROSE,
  "",
].join("\n");

beforeEach(() => {
  originalCwd = process.cwd();
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "systemix-patch-"));
  fs.mkdirSync(path.join(tmp, "contract", "hypotheses"), { recursive: true });
  process.chdir(tmp);
  vi.resetModules();
});

afterEach(() => {
  process.chdir(originalCwd);
  fs.rmSync(tmp, { recursive: true, force: true });
});

function hypoFile(slug: string): string {
  return path.join(tmp, "contract", "hypotheses", `${slug}.mdx`);
}

function seed(slug: string, content = ORIGINAL) {
  fs.writeFileSync(hypoFile(slug), content, "utf8");
}

function patchRequest(body: unknown): Request {
  return new Request("http://localhost/api/hypotheses/pricing-headline-v2", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

async function loadPatch() {
  return (await import("@/app/api/hypotheses/[slug]/route")).PATCH;
}

describe("PATCH /api/hypotheses/[slug]", () => {
  it("updates only the requested frontmatter field and preserves the prose body", async () => {
    seed("pricing-headline-v2");
    const PATCH = await loadPatch();

    const res = await PATCH(
      patchRequest({ status: "complete", hypothesis: "Revised framing" }) as never,
      ctx("pricing-headline-v2") as never,
    );
    expect(res.status).toBe(200);
    expect((await res.json())).toEqual({ ok: true, slug: "pricing-headline-v2" });

    const raw = fs.readFileSync(hypoFile("pricing-headline-v2"), "utf8");
    const { data, content } = matter(raw);

    // Requested fields changed...
    expect(data.status).toBe("complete");
    expect(data.hypothesis).toBe("Revised framing");
    // ...untouched fields preserved.
    expect(data.icp).toBe("founders");
    expect(data.section).toBe("pricing");
    // gray-matter (js-yaml) deserialises an unquoted ISO date to a Date; the
    // point is that `created` is preserved untouched across the PATCH.
    expect(new Date(data.created).toISOString().slice(0, 10)).toBe("2026-06-01");
    // Prose body survives byte-for-byte at the section level.
    expect(content).toContain("This prose MUST survive a PATCH.");
    expect(content).toContain("## Success Criteria");
    expect(content).toContain("- Primary metric: signup conversion");
  });

  it("replaces the variants block while keeping the prose body", async () => {
    seed("pricing-headline-v2");
    const PATCH = await loadPatch();

    const res = await PATCH(
      patchRequest({ variants: { control: "Plain headline", challenger: "Bold headline" } }) as never,
      ctx("pricing-headline-v2") as never,
    );
    expect(res.status).toBe(200);

    const raw = fs.readFileSync(hypoFile("pricing-headline-v2"), "utf8");
    const { data, content } = matter(raw);
    expect(Object.keys(data.variants)).toEqual(["control", "challenger"]);
    expect(data.variants.control).toBe("Plain headline");
    expect(data.variants.challenger).toBe("Bold headline");
    expect(content).toContain("This prose MUST survive a PATCH.");
  });

  it("does not clobber a populated evidence-posthog block with an empty form field", async () => {
    const withEvidence = ORIGINAL.replace(
      "evidence-posthog: null",
      ['evidence-posthog:', '  fetched_at: "2026-05-08"', '  source: "posthog"', "  confidence: 0.87"].join("\n"),
    );
    seed("pricing-headline-v2", withEvidence);
    const PATCH = await loadPatch();

    const res = await PATCH(
      patchRequest({ evidencePosthog: "", status: "complete" }) as never,
      ctx("pricing-headline-v2") as never,
    );
    expect(res.status).toBe(200);

    const { data } = matter(fs.readFileSync(hypoFile("pricing-headline-v2"), "utf8"));
    expect(data["evidence-posthog"]).toEqual({
      fetched_at: "2026-05-08",
      source: "posthog",
      confidence: 0.87,
    });
    expect(data.status).toBe("complete");
  });

  it("returns 400 for a path-traversal slug without reading any file", async () => {
    const PATCH = await loadPatch();
    const res = await PATCH(
      patchRequest({ status: "complete" }) as never,
      ctx("../../etc/passwd") as never,
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid slug/i);
  });

  it("returns 404 when the hypothesis file does not exist", async () => {
    const PATCH = await loadPatch();
    const res = await PATCH(
      patchRequest({ status: "complete" }) as never,
      ctx("ghost-hypothesis") as never,
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/not found/i);
  });

  it("returns 422 when the file has no parseable frontmatter", async () => {
    fs.writeFileSync(hypoFile("no-frontmatter"), "Just prose, no frontmatter fences.\n", "utf8");
    const PATCH = await loadPatch();
    const res = await PATCH(
      patchRequest({ status: "complete" }) as never,
      ctx("no-frontmatter") as never,
    );
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/frontmatter/i);
  });

  it("returns 400 when the request body is not valid JSON", async () => {
    seed("pricing-headline-v2");
    const PATCH = await loadPatch();
    const badReq = new Request("http://localhost/api/hypotheses/pricing-headline-v2", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "{ broken",
    });
    const res = await PATCH(badReq as never, ctx("pricing-headline-v2") as never);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/json/i);
  });
});
