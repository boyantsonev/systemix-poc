import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";

// POST /api/hermes/run is the driving port. QUEUE_PATH and HYPOTHESES_DIR bind to
// process.cwd() at module load, so each test chdirs into a fresh tmp workspace and
// re-imports the route (vi.resetModules) to re-bind those constants. Real fs, no mocks.

let tmp: string;
let originalCwd: string;

beforeEach(() => {
  originalCwd = process.cwd();
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "systemix-hermes-"));
  fs.mkdirSync(path.join(tmp, "contract", "hypotheses"), { recursive: true });
  fs.mkdirSync(path.join(tmp, ".systemix"), { recursive: true });
  process.chdir(tmp);
  vi.resetModules();
});

afterEach(() => {
  process.chdir(originalCwd);
  fs.rmSync(tmp, { recursive: true, force: true });
});

function writeContract(slug: string, frontmatter: string, body = "Body prose.") {
  fs.writeFileSync(
    path.join(tmp, "contract", "hypotheses", `${slug}.mdx`),
    `---\n${frontmatter}\n---\n\n${body}\n`,
    "utf8",
  );
}

function readQueue(): { cards: Array<Record<string, unknown>> } {
  return JSON.parse(fs.readFileSync(path.join(tmp, ".systemix", "queue.json"), "utf8"));
}

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/hermes/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function loadPost() {
  const mod = await import("@/app/api/hermes/run/route");
  return mod.POST;
}

describe("POST /api/hermes/run", () => {
  it("writes a pending hypothesis-validation card to the queue and returns its id", async () => {
    writeContract(
      "pricing-headline-v2",
      ['type: hypothesis', 'id: pricing-headline-v2', 'hypothesis: "Sharper headline lifts signups"', 'icp: founders', 'status: running', 'variants:', '  control: "A"', '  variant_b: "B"'].join("\n"),
    );
    const POST = await loadPost();

    const res = await POST(jsonRequest({ slug: "pricing-headline-v2" }) as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.cardId).toMatch(/^hermes-pricing-headline-v2-\d+$/);

    const queue = readQueue();
    expect(queue.cards).toHaveLength(1);
    const card = queue.cards[0];
    expect(card.type).toBe("hypothesis-validation");
    expect(card.hypothesisId).toBe("pricing-headline-v2");
    expect(card.status).toBe("pending");
    expect(card.hypothesis).toBe("Sharper headline lifts signups");
    expect(typeof card.context).toBe("string");
    expect(typeof card.proposal).toBe("string");
    expect(card.confidenceLevel).toBeGreaterThanOrEqual(0.6);
    expect(card.confidenceLevel).toBeLessThanOrEqual(0.89);
  });

  it("produces a deterministic confidence for identical hypothesis text", async () => {
    const fm = ['type: hypothesis', 'id: h-det', 'hypothesis: "Stable framing yields a stable read"', 'status: running'].join("\n");
    writeContract("h-det", fm);

    const POST = await loadPost();
    await POST(jsonRequest({ slug: "h-det" }) as never);
    const first = readQueue().cards[0].confidenceLevel;

    // Re-run: a new pending card supersedes the old one for the same hypothesis.
    await POST(jsonRequest({ slug: "h-det" }) as never);
    const queue = readQueue();
    const cardsForH = queue.cards.filter((c) => c.hypothesisId === "h-det" && c.status === "pending");

    expect(cardsForH).toHaveLength(1); // prior pending superseded
    expect(cardsForH[0].confidenceLevel).toBe(first); // synthesize() is deterministic
  });

  it.each([
    [{ slug: "" }, "empty slug"],
    [{}, "missing slug"],
    [{ slug: "../escape" }, "path-traversal slug"],
  ])("rejects %o with 400 (%s)", async (body) => {
    const POST = await loadPost();
    const res = await POST(jsonRequest(body) as never);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBeTruthy();
    expect(fs.existsSync(path.join(tmp, ".systemix", "queue.json"))).toBe(false);
  });

  it("returns 404 when the hypothesis contract file is missing", async () => {
    const POST = await loadPost();
    const res = await POST(jsonRequest({ slug: "never-created" }) as never);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/not found/i);
    expect(fs.existsSync(path.join(tmp, ".systemix", "queue.json"))).toBe(false);
  });

  it("returns 400 when the request body is not valid JSON", async () => {
    const POST = await loadPost();
    const badReq = new Request("http://localhost/api/hermes/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ not json",
    });
    const res = await POST(badReq as never);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/json/i);
  });
});
