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

describe("PATCH /api/queue — instrumentation-approval", () => {
  const COMPONENT = [
    "import React from 'react'",
    "",
    "export function Button(props: { label: string }) {",
    "  return <button>{props.label}</button>",
    "}",
    "",
  ].join("\n");

  function instrumentationCard(over: Record<string, unknown> = {}) {
    return {
      id: "instr-1",
      type: "instrumentation-approval",
      status: "pending",
      component: "Button",
      filePath: path.join("src", "components", "Button.tsx"),
      posthogEventKey: "button",
      ...over,
    };
  }

  function seedComponent(rel = path.join("src", "components", "Button.tsx")) {
    const abs = path.join(tmp, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, COMPONENT, "utf8");
    return abs;
  }

  it("instruments a component under src/ and resolves the card", async () => {
    const abs = seedComponent();
    seedQueue([instrumentationCard()]);
    const { PATCH } = await routes();
    const res = await PATCH(patchReq({ id: "instr-1", action: "approved" }));
    expect(res.status).toBe(200);
    const src = fs.readFileSync(abs, "utf8");
    expect(src).toContain("component_name: 'button'");
    expect(readQueue().cards[0].status).toBe("approved");
  });

  it("refuses a traversal filePath: the decoy outside the repo is untouched and the card stays pending", async () => {
    // A decoy that matches `function name(...) {` one level above the repo root.
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "queue-decoy-"));
    const decoy = path.join(outside, "file.tsx");
    fs.writeFileSync(decoy, COMPONENT, "utf8");
    try {
      const rel = path.relative(tmp, decoy); // ../queue-decoy-xxx/file.tsx
      expect(rel.startsWith("..")).toBe(true);
      seedQueue([instrumentationCard({ filePath: rel })]);
      const { PATCH } = await routes();
      const res = await PATCH(patchReq({ id: "instr-1", action: "approved" }));
      expect(res.status).toBe(500);
      expect((await res.json()).error).toMatch(/Invalid filePath/);
      expect(fs.readFileSync(decoy, "utf8")).toBe(COMPONENT);
      expect(readQueue().cards[0].status).toBe("pending");
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  it("refuses files inside the repo but outside src/ or without a .tsx/.jsx extension", async () => {
    for (const rel of ["next.config.tsx", path.join("src", "lib", "x.ts"), path.join("src", "..", "evil.tsx")]) {
      const abs = path.join(tmp, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, COMPONENT, "utf8");
      seedQueue([instrumentationCard({ filePath: rel })]);
      const { PATCH } = await routes();
      const res = await PATCH(patchReq({ id: "instr-1", action: "approved" }));
      expect(res.status).toBe(500);
      expect(fs.readFileSync(abs, "utf8")).toBe(COMPONENT);
      expect(readQueue().cards[0].status).toBe("pending");
    }
  });

  it("refuses a posthogEventKey with a quote — nothing is injected into the component", async () => {
    const abs = seedComponent();
    const evil = "x', evil: (() => { require('child_process') })(), y: '";
    seedQueue([instrumentationCard({ posthogEventKey: evil })]);
    const { PATCH } = await routes();
    const res = await PATCH(patchReq({ id: "instr-1", action: "approved" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/Invalid event key/);
    const src = fs.readFileSync(abs, "utf8");
    expect(src).toBe(COMPONENT);
    expect(src).not.toContain("child_process");
    expect(readQueue().cards[0].status).toBe("pending");
  });
});
