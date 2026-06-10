import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { NextRequest } from "next/server";

// Phase C gates (docs/feature/contract-rework/ia-and-migration.md):
// approving from a contract surface mutates .systemix/queue.json, and the
// GET goal filter scopes cards to a goal via the hypothesis goal: backlink.
const prevCwd = process.cwd();
let tmp: string;

function seedQueue(cards: unknown[]) {
  fs.mkdirSync(path.join(tmp, ".systemix"), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, ".systemix", "queue.json"),
    JSON.stringify({ cards }, null, 2),
  );
}

function seedHypothesis(id: string, goal: string) {
  const dir = path.join(tmp, "contract", "hypotheses");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${id}.mdx`),
    `---\ntype: hypothesis\nid: ${id}\ngoal: ${goal}\nstatus: running\n---\n\nBody.\n`,
  );
}

async function routes() {
  return await import("./route");
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "queue-route-"));
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
    const res = await PATCH(
      new NextRequest("http://t/api/queue", {
        method: "PATCH",
        body: JSON.stringify({ id: "tok-1", action: "approved" }),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(200);

    const written = JSON.parse(
      fs.readFileSync(path.join(tmp, ".systemix", "queue.json"), "utf8"),
    );
    expect(written.cards[0].status).toBe("approved");
    expect(written.cards[0].resolvedAt).toBeTruthy();
    expect(written.cards[0].resolution.action).toBe("approved");
  });
});
