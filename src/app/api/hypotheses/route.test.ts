import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

// POST /api/hypotheses is the driving port. HYPOTHESES_DIR binds to process.cwd()
// at import, so each test chdirs into a fresh tmp workspace and re-imports the route.
// Real fs (tmpdir), no mocks — mirrors packages/cli acceptance-test rigor.

let tmp: string;
let originalCwd: string;

beforeEach(() => {
  originalCwd = process.cwd();
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "systemix-hypotheses-"));
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

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/hypotheses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function loadPost() {
  return (await import("@/app/api/hypotheses/route")).POST;
}

describe("POST /api/hypotheses", () => {
  it("creates a parseable MDX contract from the hypothesis text and returns its slug", async () => {
    const POST = await loadPost();
    const res = await POST(
      jsonRequest({ hypothesis: "Sharper Headline Lifts Signups", icp: "founders" }) as never,
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.slug).toBe("sharper-headline-lifts-signups");

    const file = hypoFile("sharper-headline-lifts-signups");
    expect(fs.existsSync(file)).toBe(true);

    const { data } = matter(fs.readFileSync(file, "utf8"));
    expect(data.id).toBe("sharper-headline-lifts-signups");
    expect(data.type).toBe("hypothesis");
    expect(data.hypothesis).toBe("Sharper Headline Lifts Signups");
    expect(data.icp).toBe("founders");
  });

  it("prefers an explicit id over the hypothesis text and truncates the slug to 64 chars", async () => {
    const longId = "x".repeat(100);
    const POST = await loadPost();
    const res = await POST(jsonRequest({ hypothesis: "Some text", id: longId }) as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.slug).toBe("x".repeat(64));
    expect(fs.existsSync(hypoFile("x".repeat(64)))).toBe(true);
  });

  it.each([
    [{}, "missing hypothesis"],
    [{ hypothesis: "" }, "empty hypothesis"],
    [{ hypothesis: "   " }, "whitespace-only hypothesis"],
  ])("rejects %o with 400 (%s)", async (body) => {
    const POST = await loadPost();
    const res = await POST(jsonRequest(body) as never);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/required/i);
  });

  it("returns 409 when a hypothesis with the derived slug already exists", async () => {
    fs.writeFileSync(hypoFile("already-here"), "---\nid: already-here\n---\nbody\n", "utf8");
    const POST = await loadPost();

    const res = await POST(jsonRequest({ hypothesis: "Already Here" }) as never);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/already exists/i);
  });

  it("returns 400 when the request body is not valid JSON", async () => {
    const POST = await loadPost();
    const badReq = new Request("http://localhost/api/hypotheses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ broken",
    });
    const res = await POST(badReq as never);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/json/i);
  });
});
