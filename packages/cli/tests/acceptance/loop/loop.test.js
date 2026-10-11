"use strict";

/**
 * Acceptance tests — the Ralph runner (`systemix loop`). Real filesystem (tmp
 * dirs), injected evidence fetcher (the seam), fixed clock. Pins the Ralph
 * properties: one action per iteration over fresh file reads, explicit stop
 * states, close-proposal dedupe, and the covenant: the runner NEVER closes —
 * status stays `running` and the card is a proposal for a human.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const matter = require("gray-matter");

const exp = require("../../../src/lib/experiments");
const { runLoop, sweepLoop, evaluateEvidence } = require("../../../src/lib/loop");
const { loop } = require("../../../src/commands/loop");

const NOW = new Date("2026-07-04T00:00:00.000Z");

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "systemix-loop-"));
}
const readMdx = (root, id) =>
  matter(fs.readFileSync(path.join(root, "experiments", `${id}.mdx`), "utf8"));
const readQueue = (root) => {
  const p = path.join(root, ".systemix", "queue.json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : { cards: [] };
};
const fetcher = (variants) => async () => ({ wired: true, variants, source: "test" });

describe("systemix loop — the Ralph runner", () => {
  let root;
  beforeEach(() => {
    root = tmpRoot();
    exp.createExperiment(root, "x", { hypothesis: "bolder CTA lifts calls", now: NOW });
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it("stops blocked:not-measured when no posthog-event is wired (needs /measure)", async () => {
    const r = await runLoop(root, "x", { now: NOW, fetchEvidence: fetcher({}) });
    expect(r.stop).toBe("blocked:not-measured");
    expect(readQueue(root).cards).toHaveLength(0);
  });

  it("stops blocked:not-wired when the fetcher reports missing creds", async () => {
    exp.setMeasurement(root, "x", { event: "book_call_clicked" });
    const r = await runLoop(root, "x", { now: NOW, fetchEvidence: async () => ({ wired: false }) });
    expect(r.stop).toBe("blocked:not-wired");
  });

  it("high-band positive lift: pulls evidence (iter 1), queues promote proposal (iter 2) — and NEVER closes", async () => {
    exp.setMeasurement(root, "x", { event: "book_call_clicked" });
    const r = await runLoop(root, "x", { now: NOW, fetchEvidence: fetcher({ control: 100, variant_b: 130 }) });

    expect(r.stop).toBe("decision-ready");
    expect(r.iterations.map((it) => it.action)).toEqual(["pull+write", "queue-card"]);

    // evidence written back to the file (state lives on disk, not in the loop)
    const fm = readMdx(root, "x").data;
    expect(fm["evidence-posthog"]).toMatchObject({
      fetched_at: "2026-07-04",
      window_days: 30,
      samples: 230,
      variants: { control: 100, variant_b: 130 },
    });

    // the card is a PROPOSAL: promote @ 0.85, and the experiment is still running
    const cards = readQueue(root).cards;
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      type: "close-proposal",
      experimentId: "x",
      recommendedDecision: "promote",
      confidence: 0.85,
      proposedBy: "loop-runner",
      status: "pending",
    });
    expect(fm.status).toBe("running"); // the covenant: a human closes, not the runner
    expect(fm.decision).toBeNull();
  });

  it("re-running while a proposal is pending dedupes (no second card)", async () => {
    exp.setMeasurement(root, "x", { event: "book_call_clicked" });
    const opts = { now: NOW, fetchEvidence: fetcher({ control: 100, variant_b: 130 }) };
    await runLoop(root, "x", opts);
    const r2 = await runLoop(root, "x", opts);
    expect(r2.stop).toBe("decision-ready");
    expect(r2.iterations.at(-1).action).toBe("card-already-pending");
    expect(readQueue(root).cards).toHaveLength(1);
  });

  it("high-band negative lift recommends kill", async () => {
    exp.setMeasurement(root, "x", { event: "book_call_clicked" });
    await runLoop(root, "x", { now: NOW, fetchEvidence: fetcher({ control: 130, variant_b: 100 }) });
    expect(readQueue(root).cards[0].recommendedDecision).toBe("kill");
  });

  it("medium band (5–20% lift) recommends iterate at 0.6 — still above the default gate", async () => {
    exp.setMeasurement(root, "x", { event: "book_call_clicked" });
    const r = await runLoop(root, "x", { now: NOW, fetchEvidence: fetcher({ control: 100, variant_b: 110 }) });
    expect(r.stop).toBe("decision-ready");
    expect(readQueue(root).cards[0]).toMatchObject({ recommendedDecision: "iterate", confidence: 0.6 });
  });

  it("low band (<5% lift) stops waiting:insufficient-evidence — no card", async () => {
    exp.setMeasurement(root, "x", { event: "book_call_clicked" });
    const r = await runLoop(root, "x", { now: NOW, fetchEvidence: fetcher({ control: 100, variant_b: 102 }) });
    expect(r.stop).toBe("waiting:insufficient-evidence");
    expect(readQueue(root).cards).toHaveLength(0);
  });

  it("a raised medium threshold gates a medium verdict back to waiting (the dial is config)", async () => {
    exp.setMeasurement(root, "x", { event: "book_call_clicked" });
    const r = await runLoop(root, "x", {
      now: NOW,
      thresholds: { high: 0.85, medium: 0.7 }, // stricter dial than 0.6
      fetchEvidence: fetcher({ control: 100, variant_b: 110 }),
    });
    expect(r.stop).toBe("waiting:insufficient-evidence");
  });

  it("stops already-complete on a closed experiment", async () => {
    exp.setMeasurement(root, "x", { event: "book_call_clicked" });
    exp.closeExperiment(root, "x", { result: "done", decision: "promote", confidence: 0.9, now: NOW });
    const r = await runLoop(root, "x", { now: NOW, fetchEvidence: fetcher({ control: 1 }) });
    expect(r.stop).toBe("already-complete");
  });

  it("re-pulls when the fresh evidence is the OTHER writer's shape (evidence experiment pull)", async () => {
    // `systemix evidence experiment pull` writes a visitors/rate snapshot with no
    // `variants` block. The runner must not treat that as fresh-for-evaluation —
    // it re-pulls its per-variant shape instead of parking on waiting forever.
    exp.setMeasurement(root, "x", { event: "book_call_clicked" });
    const { file, data, content } = exp.getExperiment(root, "x");
    data["evidence-posthog"] = {
      fetched_at: "2026-07-04", // fresh today, but the funnel shape
      source: "live",
      window_days: 30,
      visitors: 500,
      event_count: 12,
      event_persons: 10,
      rate: 0.02,
    };
    fs.writeFileSync(file, exp.stringifyMdx(content, data), "utf8");

    const r = await runLoop(root, "x", { now: NOW, fetchEvidence: fetcher({ control: 100, variant_b: 130 }) });
    expect(r.iterations[0].action).toBe("pull+write"); // re-pulled, didn't trust the foreign shape
    expect(r.stop).toBe("decision-ready");
  });

  it("trusts a today-dated CANONICAL snapshot from the other writer — no re-pull (the two-crons fix)", async () => {
    // `systemix evidence experiment pull` now writes the canonical shape (with
    // `variants`). The runner must accept it as fresh and go straight to
    // evaluate — the two daily crons stop overwriting each other.
    exp.setMeasurement(root, "x", { event: "book_call_clicked" });
    const { file, data, content } = exp.getExperiment(root, "x");
    data["evidence-posthog"] = {
      fetched_at: "2026-07-04",
      source: "live",
      window_days: 30,
      event: "book_call_clicked",
      samples: 230,
      variants: { control: 100, variant_b: 130 },
      visitors: 500, // extra funnel keys are allowed — the runner ignores them
      rate: 0.02,
    };
    fs.writeFileSync(file, exp.stringifyMdx(content, data), "utf8");

    const neverCalled = jest.fn();
    const r = await runLoop(root, "x", { now: NOW, fetchEvidence: neverCalled });
    expect(neverCalled).not.toHaveBeenCalled(); // trusted the canonical snapshot
    expect(r.iterations[0].action).toBe("queue-card"); // first iteration went straight to evaluate
    expect(r.stop).toBe("decision-ready");
  });

  it("evaluateEvidence handles a zero-control baseline conservatively (not ready)", () => {
    const v = evaluateEvidence({ variants: { control: 0, variant_b: 50 } });
    expect(v.ready).toBe(false);
  });

  it("single-arm: evaluates against the PRIOR window when there is no A/B split", async () => {
    exp.setMeasurement(root, "x", { event: "book_call_clicked" });
    // all events uncategorised → one 'control' bucket; prior 30d had 100, current has 150
    const r = await runLoop(root, "x", {
      now: NOW,
      fetchEvidence: async () => ({ wired: true, variants: { control: 150 }, prev_total: 100, source: "test" }),
    });
    expect(r.stop).toBe("decision-ready");
    expect(readMdx(root, "x").data["evidence-posthog"].prev_total).toBe(100); // baseline persisted
    const card = readQueue(root).cards[0];
    expect(card).toMatchObject({ recommendedDecision: "promote", confidence: 0.85 });
    expect(card.summary).toContain("the prior 30d"); // vs prior window, not control
  });

  it("single-arm with no prior baseline stays waiting (fresh instrumentation)", async () => {
    exp.setMeasurement(root, "x", { event: "book_call_clicked" });
    const r = await runLoop(root, "x", {
      now: NOW,
      fetchEvidence: async () => ({ wired: true, variants: {}, prev_total: 0, source: "test" }),
    });
    expect(r.stop).toBe("waiting:insufficient-evidence");
    expect(r.note).toContain("no prior-window baseline");
    expect(readQueue(root).cards).toHaveLength(0);
  });

  it("CLI door: `loop` (no id) sweeps all running experiments", async () => {
    exp.createExperiment(root, "y", { now: NOW });
    exp.setMeasurement(root, "x", { event: "book_call_clicked" });
    // y stays unmeasured → blocked; x goes decision-ready
    await loop([], { projectRoot: root, now: NOW, fetchEvidence: fetcher({ control: 100, variant_b: 130 }) });
    const cards = readQueue(root).cards;
    expect(cards).toHaveLength(1);
    expect(cards[0].experimentId).toBe("x");
  });

  it("CLI door: `loop --days 30` (no id) sweeps — the flag value is NOT an experiment id", async () => {
    // Regression: the daily cron calls `systemix loop --days 30`; "30" was
    // misparsed as a positional id → "experiment not found: experiments/30.mdx".
    exp.setMeasurement(root, "x", { event: "book_call_clicked" });
    await loop(["--days", "30"], { projectRoot: root, now: NOW, fetchEvidence: fetcher({ control: 100, variant_b: 130 }) });
    const cards = readQueue(root).cards;
    expect(cards).toHaveLength(1);
    expect(cards[0].experimentId).toBe("x");
  });

  it("a missing experiment file skips with a warning instead of throwing", async () => {
    const r = await runLoop(root, "nope", { now: NOW, fetchEvidence: fetcher({}) });
    expect(r.stop).toBe("skipped:not-found");
    expect(r.note).toContain("experiments/nope.mdx");
    expect(readQueue(root).cards).toHaveLength(0);
  });

  it("an unsafe id skips before any path is resolved from it (no throw, nothing written)", async () => {
    const r = await runLoop(root, "../escaped-id", { now: NOW, fetchEvidence: fetcher({ control: 1, variant_b: 2 }) });
    expect(r.stop).toBe("skipped:invalid-id");
    expect(r.note).toContain('"../escaped-id" is not a valid experiment id');
    expect(readQueue(root).cards).toHaveLength(0);
  });

  it("sweepLoop returns one explicit stop per running experiment", async () => {
    exp.createExperiment(root, "y", { now: NOW });
    exp.setMeasurement(root, "x", { event: "book_call_clicked" });
    const results = await sweepLoop(root, { now: NOW, fetchEvidence: fetcher({ control: 100, variant_b: 130 }) });
    const byId = Object.fromEntries(results.map((r) => [r.id, r.stop]));
    expect(byId).toEqual({ x: "decision-ready", y: "blocked:not-measured" });
  });
});
