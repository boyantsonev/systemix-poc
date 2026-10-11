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

// Per-test only — the "does NOT touch the loop dir" test below requires
// experiments/ to be absent by default.
function seedHypothesis(id: string, goal: string) {
  const dir = path.join(tmp, "experiments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${id}.mdx`),
    `---\ntype: experiment\nid: ${id}\ngoal: ${goal}\nstatus: running\n---\n\nBody.\n`,
  );
}

function readRecord() {
  return fs.readFileSync(path.join(tmp, "contract", "engagement", "landing.mdx"), "utf8");
}

function readQueue() {
  return JSON.parse(fs.readFileSync(path.join(tmp, ".systemix", "queue.json"), "utf8"));
}

// The dashboard's own same-origin request (PATCH is local-only).
function patchReq(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost:3001/api/queue", {
    method: "PATCH",
    headers: { "content-type": "application/json", origin: "http://localhost:3001", ...headers },
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
      { id: "b", type: "experiment-validation", status: "pending", experimentId: "h1" },
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

describe("PATCH /api/queue — memory write-back (Phase D)", () => {
  function seedLearnings() {
    fs.mkdirSync(path.join(tmp, "experiments"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "experiments", "LEARNINGS.md"),
      [
        "# Learnings", "",
        "## Memory", "",
        "Memory is written only from closed experiments.", "",
        "*No entries yet.* The first entry lands when an experiment closes.", "",
        "## Decision log", "", "x", "",
      ].join("\n"),
      "utf8",
    );
  }

  it("approving a hypothesis decision appends a provenance entry to ## Memory", async () => {
    seedLearnings();
    seedHypothesis("velocity-gap", "landing-validation");
    seedQueue([
      {
        id: "hyp-1",
        type: "experiment-validation",
        status: "pending",
        experimentId: "velocity-gap",
        hypothesis: "Reframing the hero around the velocity gap converts founders",
        context: "Variant B +38% on install_command_copied.",
        confidenceLevel: 0.82,
        requestedAt: "2026-06-01T00:00:00.000Z",
      },
    ]);
    const { PATCH } = await routes();
    const res = await PATCH(patchReq({ id: "hyp-1", action: "approved" }));
    expect(res.status).toBe(200);

    const idx = fs.readFileSync(path.join(tmp, "experiments", "LEARNINGS.md"), "utf8");
    expect(idx).toContain("from [velocity-gap]");
    expect(idx).toContain("decision: promote");
    expect(idx).toContain("confidence 0.82");
    expect(idx).not.toContain("No entries yet");
    expect(idx).toContain("## Decision log"); // section below survives
  });

  it("does not fail the decision when no learnings file exists", async () => {
    seedHypothesis("velocity-gap", "landing-validation");
    seedQueue([
      {
        id: "hyp-2",
        type: "experiment-validation",
        status: "pending",
        experimentId: "velocity-gap",
        context: "x",
        requestedAt: "2026-06-01T00:00:00.000Z",
      },
    ]);
    const { PATCH } = await routes();
    const res = await PATCH(patchReq({ id: "hyp-2", action: "approved" }));
    expect(res.status).toBe(200); // memory write is best-effort
  });
});

describe("PATCH /api/queue — hypothesis-proposal (the engine's generate stage)", () => {
  function proposalCard(over: Record<string, unknown> = {}) {
    return {
      id: "hypothesis-proposal-kit-cta-1",
      type: "hypothesis-proposal",
      status: "pending",
      experimentId: "kit-cta-2026-07",
      goal: "leads",
      hypothesis: "clearer kit CTA lifts requests",
      context: "ODI-B (score 16): underserved",
      confidence: 0.5,
      citedLearnings: [] as string[],
      payload: {
        id: "kit-cta-2026-07",
        section: "kit",
        goal: "leads",
        hypothesis: "clearer kit CTA lifts requests",
        metric: "kit-request-rate",
      },
      requestedAt: "2026-07-01T00:00:00.000Z",
      ...over,
    };
  }
  const contractPath = () => path.join(tmp, "experiments", "kit-cta-2026-07.mdx");

  it("approve scaffolds experiments/<id>.mdx from the payload and resolves the card", async () => {
    seedQueue([proposalCard()]);
    const { PATCH } = await routes();
    const res = await PATCH(patchReq({ id: "hypothesis-proposal-kit-cta-1", action: "approved" }));
    expect(res.status).toBe(200);

    const raw = fs.readFileSync(contractPath(), "utf8");
    expect(raw).toContain("status: running");
    expect(raw).toContain("metric: kit-request-rate");
    expect(raw).toContain("hypothesis: clearer kit CTA lifts requests");
    expect(readQueue().cards[0].status).toBe("approved");
  });

  it("approve backlinks the cited learnings (Used by:)", async () => {
    fs.mkdirSync(path.join(tmp, "experiments"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "experiments", "LEARNINGS.md"),
      [
        "# Learnings", "",
        "## Memory", "",
        "- **2026-06-01 · prior win** — confidence 0.9 · from [prior-x], decision: promote. Review by: 2026-09-01. Used by: —",
        "",
      ].join("\n"),
      "utf8",
    );
    seedQueue([proposalCard({ citedLearnings: ["prior-x"] })]);
    const { PATCH } = await routes();
    const res = await PATCH(patchReq({ id: "hypothesis-proposal-kit-cta-1", action: "approved" }));
    expect(res.status).toBe(200);

    const learnings = fs.readFileSync(path.join(tmp, "experiments", "LEARNINGS.md"), "utf8");
    expect(learnings).toContain("Used by: [kit-cta-2026-07]");
  });

  it("approve with a colliding experiment id 500s and the card stays pending", async () => {
    seedHypothesis("kit-cta-2026-07", "leads");
    seedQueue([proposalCard()]);
    const { PATCH } = await routes();
    const res = await PATCH(patchReq({ id: "hypothesis-proposal-kit-cta-1", action: "approved" }));
    expect(res.status).toBe(500);
    expect(readQueue().cards[0].status).toBe("pending");
  });

  it("reject flips status only — no contract is created", async () => {
    seedQueue([proposalCard()]);
    const { PATCH } = await routes();
    const res = await PATCH(patchReq({ id: "hypothesis-proposal-kit-cta-1", action: "rejected" }));
    expect(res.status).toBe(200);
    expect(fs.existsSync(contractPath())).toBe(false);
    expect(readQueue().cards[0].status).toBe("rejected");
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

  it("does NOT touch the loop dir (no such write)", async () => {
    seedQueue([engagementCard()]);
    const { PATCH } = await routes();
    await PATCH(patchReq({ id: "engagement-landing-1", action: "approved" }));
    expect(fs.existsSync(path.join(tmp, "experiments"))).toBe(false);
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

describe("PATCH /api/queue — local-only", () => {
  it("rejects a cross-origin PATCH and leaves the queue untouched", async () => {
    seedQueue([engagementCard()]);
    const { PATCH } = await routes();
    const res = await PATCH(
      patchReq({ id: "engagement-landing-1", action: "approved" }, { origin: "https://evil.example" }),
    );
    expect(res.status).toBe(403);
    expect(readQueue().cards[0].status).toBe("pending");
    expect(readRecord()).not.toMatch(/acknowledged/);
  });

  it("rejects a text/plain body", async () => {
    seedQueue([engagementCard()]);
    const { PATCH } = await routes();
    const res = await PATCH(
      patchReq({ id: "engagement-landing-1", action: "approved" }, { "content-type": "text/plain" }),
    );
    expect(res.status).toBe(415);
    expect(readQueue().cards[0].status).toBe("pending");
  });

  it("refuses unknown actions", async () => {
    seedQueue([engagementCard()]);
    const { PATCH } = await routes();
    const res = await PATCH(patchReq({ id: "engagement-landing-1", action: "pwned" }));
    expect(res.status).toBe(400);
    expect(readQueue().cards[0].status).toBe("pending");
  });
});

describe("PATCH /api/queue — card-driven writes stay inside the project allowlist", () => {
  const COMPONENT = [
    'import React from "react";',
    "",
    "export function Hero() {",
    "  return <div>hi</div>;",
    "}",
    "",
  ].join("\n");

  function instrumentationCard(over: Record<string, unknown> = {}) {
    return {
      id: "instr-1",
      type: "instrumentation-approval",
      status: "pending",
      component: "Hero",
      filePath: "src/components/Hero.tsx",
      posthogEventKey: "hero_render",
      requestedAt: "2026-10-01T00:00:00.000Z",
      ...over,
    };
  }

  function seedComponent(rel = path.join("src", "components", "Hero.tsx")) {
    fs.mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true });
    fs.writeFileSync(path.join(tmp, rel), COMPONENT, "utf8");
  }

  // A file outside the workspace that a hostile card would like to rewrite.
  let outside: string;
  beforeEach(() => {
    outside = fs.mkdtempSync(path.join(os.tmpdir(), "queue-outside-"));
    fs.writeFileSync(path.join(outside, "victim.tsx"), COMPONENT, "utf8");
  });
  afterEach(() => fs.rmSync(outside, { recursive: true, force: true }));

  it("instruments an allowlisted component (control)", async () => {
    seedComponent();
    seedQueue([instrumentationCard()]);
    const { PATCH } = await routes();
    const res = await PATCH(patchReq({ id: "instr-1", action: "approved" }));
    expect(res.status).toBe(200);
    const src = fs.readFileSync(path.join(tmp, "src", "components", "Hero.tsx"), "utf8");
    expect(src).toContain("component_name: 'hero_render'");
  });

  it.each([
    ["a `..` escape", () => path.relative(tmp, path.join(outside, "victim.tsx"))],
    ["an absolute path", () => path.join(outside, "victim.tsx")],
    ["a non-component file", () => "package.json"],
    ["a file outside src/", () => "victim.tsx"],
  ])("refuses %s as filePath", async (_label, target) => {
    fs.writeFileSync(path.join(tmp, "package.json"), "{}\n", "utf8");
    fs.writeFileSync(path.join(tmp, "victim.tsx"), COMPONENT, "utf8");
    seedQueue([instrumentationCard({ filePath: target() })]);
    const { PATCH } = await routes();
    const res = await PATCH(patchReq({ id: "instr-1", action: "approved" }));
    expect(res.status).toBe(400);
    expect(fs.readFileSync(path.join(outside, "victim.tsx"), "utf8")).toBe(COMPONENT);
    expect(fs.readFileSync(path.join(tmp, "victim.tsx"), "utf8")).toBe(COMPONENT);
    expect(fs.readFileSync(path.join(tmp, "package.json"), "utf8")).toBe("{}\n");
    expect(readQueue().cards[0].status).toBe("pending");
  });

  it("refuses a src/ symlink that resolves outside the repo", async () => {
    fs.mkdirSync(path.join(tmp, "src", "components"), { recursive: true });
    fs.symlinkSync(path.join(outside, "victim.tsx"), path.join(tmp, "src", "components", "Linked.tsx"));
    seedQueue([instrumentationCard({ filePath: "src/components/Linked.tsx" })]);
    const { PATCH } = await routes();
    const res = await PATCH(patchReq({ id: "instr-1", action: "approved" }));
    expect(res.status).toBe(400);
    expect(fs.readFileSync(path.join(outside, "victim.tsx"), "utf8")).toBe(COMPONENT);
  });

  it("refuses an event key that would break out of the generated string literal", async () => {
    seedComponent();
    seedQueue([instrumentationCard({ posthogEventKey: "x', pwned: (globalThis.pwned = 1), y: '" })]);
    const { PATCH } = await routes();
    const res = await PATCH(patchReq({ id: "instr-1", action: "approved" }));
    expect(res.status).toBe(400);
    expect(fs.readFileSync(path.join(tmp, "src", "components", "Hero.tsx"), "utf8")).toBe(COMPONENT);
  });

  it("still lets a human reject a malformed card (nothing is written)", async () => {
    seedQueue([instrumentationCard({ filePath: path.join(outside, "victim.tsx") })]);
    const { PATCH } = await routes();
    const res = await PATCH(patchReq({ id: "instr-1", action: "rejected" }));
    expect(res.status).toBe(200);
    expect(readQueue().cards[0].status).toBe("rejected");
    expect(fs.readFileSync(path.join(outside, "victim.tsx"), "utf8")).toBe(COMPONENT);
  });

  it("refuses an engagement recordPath outside contract/engagement/", async () => {
    fs.mkdirSync(path.join(tmp, "experiments"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "experiments", "LEARNINGS.md"), "# Learnings\n", "utf8");
    seedQueue([{ ...engagementCard(), recordPath: "experiments/LEARNINGS.md" }]);
    const { PATCH } = await routes();
    const res = await PATCH(patchReq({ id: "engagement-landing-1", action: "approved" }));
    expect(res.status).toBe(400);
    expect(fs.readFileSync(path.join(tmp, "experiments", "LEARNINGS.md"), "utf8")).toBe("# Learnings\n");
  });

  it("refuses an experimentId that isn't a slug", async () => {
    fs.writeFileSync(path.join(tmp, "contract", "engagement", "x.mdx"), RECORD, "utf8");
    seedQueue([
      {
        id: "hyp-x",
        type: "experiment-validation",
        status: "pending",
        experimentId: "../contract/engagement/x",
        context: "x",
      },
    ]);
    const { PATCH } = await routes();
    const res = await PATCH(patchReq({ id: "hyp-x", action: "approved" }));
    expect(res.status).toBe(400);
    expect(fs.readFileSync(path.join(tmp, "contract", "engagement", "x.mdx"), "utf8")).toBe(RECORD);
  });

  it("refuses a hypothesis proposal whose payload.id isn't a slug", async () => {
    seedQueue([
      {
        id: "prop-x",
        type: "hypothesis-proposal",
        status: "pending",
        payload: { id: "../escaped", hypothesis: "h", metric: "m" },
      },
    ]);
    const { PATCH } = await routes();
    const res = await PATCH(patchReq({ id: "prop-x", action: "approved" }));
    expect(res.status).toBe(400);
    expect(fs.existsSync(path.join(tmp, "escaped.mdx"))).toBe(false);
    expect(readQueue().cards[0].status).toBe("pending");
  });
});

describe("PATCH /api/queue — card fields from queue.json stay in their directory", () => {
  // queue.json is written by agents and the CLI, so a card's experimentId /
  // recordPath must never point a write outside experiments/ or contract/engagement/.
  const DECOY = "---\ntype: experiment\nid: decoy\nstatus: running\n---\n\n# not a contract\n";

  it.each(["../decoy", "nested/decoy", "..", "Upper-Case"])(
    "experiment-validation with experimentId %j 400s, writes nothing, card stays pending",
    async (experimentId) => {
      // experiments/../decoy.mdx resolves to <root>/decoy.mdx — outside the loop
      fs.writeFileSync(path.join(tmp, "decoy.mdx"), DECOY);
      seedQueue([
        { id: "exp-1", type: "experiment-validation", status: "pending", experimentId, context: "x" },
      ]);
      const { PATCH } = await routes();
      const res = await PATCH(patchReq({ id: "exp-1", action: "approved" }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(`Invalid experimentId on card: ${JSON.stringify(experimentId)}`);
      expect(fs.readFileSync(path.join(tmp, "decoy.mdx"), "utf8")).toBe(DECOY);
      expect(readQueue().cards[0].status).toBe("pending");
    },
  );

  it.each([
    "contract/decoy.mdx",
    "contract/engagement/../decoy.mdx",
    "contract/engagement/../../decoy.mdx",
    "decoy.mdx",
    "contract/engagement/nested/landing.mdx",
  ])(
    "engagement-snapshot with recordPath %j 400s, appends nowhere, card stays pending",
    async (recordPath) => {
      fs.writeFileSync(path.join(tmp, "contract", "decoy.mdx"), DECOY);
      fs.writeFileSync(path.join(tmp, "decoy.mdx"), DECOY);
      seedQueue([{ ...engagementCard(), recordPath }]);
      const { PATCH } = await routes();
      const res = await PATCH(patchReq({ id: "engagement-landing-1", action: "approved" }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/^Invalid recordPath on card: /);
      expect(fs.readFileSync(path.join(tmp, "contract", "decoy.mdx"), "utf8")).toBe(DECOY);
      expect(fs.readFileSync(path.join(tmp, "decoy.mdx"), "utf8")).toBe(DECOY);
      expect(readRecord()).toBe(RECORD);
      expect(readQueue().cards[0].status).toBe("pending");
    },
  );

  it("accepts the Windows-separator recordPath the CLI writes on win32", async () => {
    seedQueue([{ ...engagementCard(), recordPath: "contract\\engagement\\landing.mdx" }]);
    const { PATCH } = await routes();
    const res = await PATCH(patchReq({ id: "engagement-landing-1", action: "approved" }));
    expect(res.status).toBe(200);
    expect(readRecord()).toMatch(/acknowledged _\(dashboard\)_/);
  });
});
