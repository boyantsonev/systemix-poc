import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { NextRequest } from "next/server";

// QUEUE_PATH binds to process.cwd() at import time, so each test chdirs into a
// fresh tmp workspace and re-imports the route. Real fs, no mocks.
//
// Two suites merged here:
// - Contract-rework Phase C gates: GET ?goal= scopes cards via the hypothesis
//   goal: backlink; approving mutates .systemix/queue.json.
// - Engagement loop (PR #48): engagement-snapshot cards write to the
//   engagement record's log (NOT the hypotheses dir).
const prevCwd = process.cwd();
let tmp: string;

const RECORD = [
  "---",
  "type: engagement",
  "id: landing",
  "surface: landing",
  "window_days: 30",
  "status: tracking",
  "evidence-posthog: null",
  "last-synced: null",
  "---",
  "",
  "# Landing engagement",
  "",
  "## Engagement Log",
  "",
  "_No snapshots yet._",
  "",
].join("\n");

function engagementCard(id = "engagement-landing-1") {
  return {
    id,
    type: "engagement-snapshot",
    recordPath: path.join("contract", "engagement", "landing.mdx"),
    surface: "landing",
    metric: "install conversion",
    baselineRate: 0.045,
    sessions: 800,
    confidenceLevel: 0.5,
    context: "800 visitors, 36 installs (4.5% conversion).",
    proposal: "healthy",
    requestedAt: new Date().toISOString(),
    status: "pending",
  };
}

function seedQueue(cards: unknown[]) {
  fs.writeFileSync(
    path.join(tmp, ".systemix", "queue.json"),
    JSON.stringify({ cards }, null, 2),
  );
}

// Per-test only — the "does NOT touch the hypotheses dir" test below requires
// contract/hypotheses to be absent by default.
function seedHypothesis(id: string, goal: string) {
  const dir = path.join(tmp, "contract", "hypotheses");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${id}.mdx`),
    `---\ntype: hypothesis\nid: ${id}\ngoal: ${goal}\nstatus: running\n---\n\nBody.\n`,
  );
}

function readRecord() {
  return fs.readFileSync(path.join(tmp, "contract", "engagement", "landing.mdx"), "utf8");
}

function readQueue() {
  return JSON.parse(fs.readFileSync(path.join(tmp, ".systemix", "queue.json"), "utf8"));
}

function patchReq(body: unknown): NextRequest {
  return new NextRequest("http://t/api/queue", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function routes() {
  return await import("./route");
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "queue-route-"));
  fs.mkdirSync(path.join(tmp, ".systemix"), { recursive: true });
  fs.mkdirSync(path.join(tmp, "contract", "engagement"), { recursive: true });
  fs.writeFileSync(path.join(tmp, "contract", "engagement", "landing.mdx"), RECORD, "utf8");
  process.chdir(tmp);
  vi.resetModules();
});

afterEach(() => {
  process.chdir(prevCwd);
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("GET /api/queue goal scoping", () => {
  it("returns only cards belonging to the goal (own goal field or hypothesis backlink)", async () => {
    seedHypothesis("h1", "landing-validation");
    seedQueue([
      { id: "a", type: "new-token", status: "pending", goal: "design-system" },
      { id: "b", type: "hypothesis-validation", status: "pending", hypothesisId: "h1" },
      { id: "c", type: "drift-resolution", status: "pending" },
    ]);
    const { GET } = await routes();

    const landing = await GET(new NextRequest("http://t/api/queue?goal=landing-validation"));
    const landingBody = await landing.json();
    expect(landingBody.cards.map((c: { id: string }) => c.id)).toEqual(["b"]);

    const ds = await GET(new NextRequest("http://t/api/queue?goal=design-system"));
    const dsBody = await ds.json();
    expect(dsBody.cards.map((c: { id: string }) => c.id)).toEqual(["a"]);
  });

  it("goal-scoped demo fallback is empty, never seeded", async () => {
    const { GET } = await routes();
    const res = await GET(new NextRequest("http://t/api/queue?goal=landing-validation"));
    const body = await res.json();
    expect(body.isDemo).toBe(true);
    expect(body.cards).toEqual([]);
  });
});

describe("PATCH /api/queue", () => {
  it("approving a card mutates .systemix/queue.json with status + resolution", async () => {
    seedQueue([
      {
        id: "tok-1",
        type: "new-token",
        status: "pending",
        token: "color.x",
        requestedAt: "2026-06-01T00:00:00.000Z",
      },
    ]);
    const { PATCH } = await routes();
    const res = await PATCH(patchReq({ id: "tok-1", action: "approved" }));
    expect(res.status).toBe(200);

    const written = readQueue();
    expect(written.cards[0].status).toBe("approved");
    expect(written.cards[0].resolvedAt).toBeTruthy();
    expect(written.cards[0].resolution.action).toBe("approved");
  });
});

describe("PATCH /api/queue — engagement-snapshot", () => {
  it("acknowledge appends to the engagement log and resolves the card", async () => {
    seedQueue([engagementCard()]);
    const { PATCH } = await routes();

    const res = await PATCH(
      patchReq({ id: "engagement-landing-1", action: "approved", note: "looks fine" }),
    );
    expect(res.status).toBe(200);

    expect(readRecord()).toMatch(/acknowledged — looks fine _\(dashboard\)_/);
    expect(readQueue().cards[0].status).toBe("approved");
  });

  it("flag-for-experiment is recorded as deferred", async () => {
    seedQueue([engagementCard()]);
    const { PATCH } = await routes();

    await PATCH(patchReq({ id: "engagement-landing-1", action: "deferred" }));
    expect(readRecord()).toMatch(/flagged-for-experiment _\(dashboard\)_/);
  });

  it("does NOT touch the hypotheses dir (no such write)", async () => {
    seedQueue([engagementCard()]);
    const { PATCH } = await routes();
    await PATCH(patchReq({ id: "engagement-landing-1", action: "approved" }));
    expect(fs.existsSync(path.join(tmp, "contract", "hypotheses"))).toBe(false);
  });

  it("404s for an unknown card id", async () => {
    seedQueue([engagementCard()]);
    const { PATCH } = await routes();
    const res = await PATCH(patchReq({ id: "nope", action: "approved" }));
    expect(res.status).toBe(404);
  });

  it("500s when the engagement record is missing", async () => {
    fs.rmSync(path.join(tmp, "contract", "engagement", "landing.mdx"));
    seedQueue([engagementCard()]);
    const { PATCH } = await routes();
    const res = await PATCH(patchReq({ id: "engagement-landing-1", action: "approved" }));
    expect(res.status).toBe(500);
  });
});
