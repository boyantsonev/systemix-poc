import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";

// PATCH /api/queue resolves cards. QUEUE_PATH binds to process.cwd() at import,
// so each test chdirs into a fresh tmp workspace and re-imports the route.
// Focus: engagement-snapshot cards write to the engagement record's log
// (NOT the hypotheses dir). Real fs, no mocks.

let tmp: string;
let originalCwd: string;

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

beforeEach(() => {
  originalCwd = process.cwd();
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "systemix-queue-"));
  fs.mkdirSync(path.join(tmp, ".systemix"), { recursive: true });
  fs.mkdirSync(path.join(tmp, "contract", "engagement"), { recursive: true });
  fs.writeFileSync(path.join(tmp, "contract", "engagement", "landing.mdx"), RECORD, "utf8");
  process.chdir(tmp);
  vi.resetModules();
});

afterEach(() => {
  process.chdir(originalCwd);
  fs.rmSync(tmp, { recursive: true, force: true });
});

function seedQueue(cards: unknown[]) {
  fs.writeFileSync(path.join(tmp, ".systemix", "queue.json"), JSON.stringify({ cards }), "utf8");
}
function readRecord() {
  return fs.readFileSync(path.join(tmp, "contract", "engagement", "landing.mdx"), "utf8");
}
function readQueue() {
  return JSON.parse(fs.readFileSync(path.join(tmp, ".systemix", "queue.json"), "utf8"));
}
function patch(body: unknown): Request {
  return new Request("http://localhost/api/queue", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
async function loadPatch() {
  return (await import("@/app/api/queue/route")).PATCH;
}

describe("PATCH /api/queue — engagement-snapshot", () => {
  it("acknowledge appends to the engagement log and resolves the card", async () => {
    seedQueue([engagementCard()]);
    const PATCH = await loadPatch();

    const res = await PATCH(patch({ id: "engagement-landing-1", action: "approved", note: "looks fine" }) as never);
    expect(res.status).toBe(200);

    expect(readRecord()).toMatch(/acknowledged — looks fine _\(dashboard\)_/);
    expect(readQueue().cards[0].status).toBe("approved");
  });

  it("flag-for-experiment is recorded as deferred", async () => {
    seedQueue([engagementCard()]);
    const PATCH = await loadPatch();

    await PATCH(patch({ id: "engagement-landing-1", action: "deferred" }) as never);
    expect(readRecord()).toMatch(/flagged-for-experiment _\(dashboard\)_/);
  });

  it("does NOT touch the hypotheses dir (no such write)", async () => {
    seedQueue([engagementCard()]);
    const PATCH = await loadPatch();
    await PATCH(patch({ id: "engagement-landing-1", action: "approved" }) as never);
    expect(fs.existsSync(path.join(tmp, "contract", "hypotheses"))).toBe(false);
  });

  it("404s for an unknown card id", async () => {
    seedQueue([engagementCard()]);
    const PATCH = await loadPatch();
    const res = await PATCH(patch({ id: "nope", action: "approved" }) as never);
    expect(res.status).toBe(404);
  });

  it("500s when the engagement record is missing", async () => {
    fs.rmSync(path.join(tmp, "contract", "engagement", "landing.mdx"));
    seedQueue([engagementCard()]);
    const PATCH = await loadPatch();
    const res = await PATCH(patch({ id: "engagement-landing-1", action: "approved" }) as never);
    expect(res.status).toBe(500);
  });
});
