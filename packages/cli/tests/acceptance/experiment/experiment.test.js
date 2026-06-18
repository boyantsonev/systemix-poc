"use strict";

/**
 * Acceptance tests — the experiments/ loop file-ops (Phase 2.5 slice 3).
 * Real filesystem (tmp dirs). Verifies the CLI door + the shared lib that the
 * MCP experiment_* tools mirror over the same files.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const matter = require("gray-matter");

const exp = require("../../../src/lib/experiments");
const { experiment } = require("../../../src/commands/experiment");

const NOW = new Date("2026-06-18T00:00:00.000Z"); // +90d → 2026-09-16

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "systemix-exp-"));
}
const readMdx = (root, id) =>
  matter(fs.readFileSync(path.join(root, "experiments", `${id}.mdx`), "utf8"));

describe("experiments/ loop — file-first ops", () => {
  let root;
  beforeEach(() => { root = tmpRoot(); });
  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

  it("new creates experiments/<id>.mdx (running) with the variant schema", () => {
    exp.createExperiment(root, "hero-cta-2026-06", { hypothesis: "Bolder CTA lifts signups", icp: "founders", now: NOW });
    const fm = readMdx(root, "hero-cta-2026-06").data;
    expect(fm.type).toBe("experiment");
    expect(fm.status).toBe("running");
    expect(fm.hypothesis).toBe("Bolder CTA lifts signups");
    expect(fm.variants.control).toBeDefined();
    expect(fm.variants.variant_b).toBeDefined();
  });

  it("new persists the AI-native fields (icp, jtbd, given, conclusion) and an optional workflow DAG", () => {
    exp.createExperiment(root, "loop-onboard-2026-06", {
      icp: "pre-pmf-founder",
      jtbd: "validate an idea before building it",
      hypothesis: "An AI workflow that turns a raw idea into a measured decision converts founders",
      given: "a one-line product idea",
      conclusion: "a promote/iterate/kill decision backed by a metric",
      workflow: {
        steps: [
          { id: "given", kind: "input", label: "the idea", note: "given" },
          { id: "frame", kind: "agent", label: "frame the hypothesis", note: "agent", agent: "hermes" },
          { id: "conclusion", kind: "output", label: "the decision", note: "conclusion" },
        ],
        edges: [
          { from: "given", to: "frame" },
          { from: "frame", to: "conclusion" },
        ],
      },
      now: NOW,
    });
    const fm = readMdx(root, "loop-onboard-2026-06").data;
    expect(fm.icp).toBe("pre-pmf-founder");
    expect(fm.jtbd).toBe("validate an idea before building it");
    expect(fm.given).toBe("a one-line product idea");
    expect(fm.conclusion).toBe("a promote/iterate/kill decision backed by a metric");
    expect(fm.workflow.steps).toHaveLength(3);
    expect(fm.workflow.steps[0].kind).toBe("input");
    expect(fm.workflow.steps[1].agent).toBe("hermes");
    expect(fm.workflow.edges[0]).toEqual({ from: "given", to: "frame" });
  });

  it("new throws if the experiment already exists", () => {
    exp.createExperiment(root, "dup", { now: NOW });
    expect(() => exp.createExperiment(root, "dup", { now: NOW })).toThrow(/already exists/);
  });

  it("measure attaches posthog-event + metric", () => {
    exp.createExperiment(root, "x", { now: NOW });
    exp.setMeasurement(root, "x", { event: "cta_click", metric: "signup-rate" });
    const fm = readMdx(root, "x").data;
    expect(fm["posthog-event"]).toBe("cta_click");
    expect(fm.metric).toBe("signup-rate");
  });

  it("close writes the result, captures a cited learning, and queues a decision card", () => {
    exp.createExperiment(root, "hero-cta-2026-06", { now: NOW });
    const r = exp.closeExperiment(root, "hero-cta-2026-06", {
      result: "variant_b +28% signups", decision: "promote", confidence: 0.85, now: NOW,
    });

    const fm = readMdx(root, "hero-cta-2026-06").data;
    expect(fm.status).toBe("complete");
    expect(fm.decision).toBe("promote");
    expect(fm.confidence).toBe(0.85);
    expect(fm["review-by"]).toBe("2026-09-16");

    const learnings = fs.readFileSync(path.join(root, "experiments", "LEARNINGS.md"), "utf8");
    expect(learnings).toContain("## Memory");
    expect(learnings).toContain("[hero-cta-2026-06]");   // provenance
    expect(learnings).toContain("decision: promote");
    expect(learnings).not.toContain("*No entries yet.*");

    const queue = JSON.parse(fs.readFileSync(path.join(root, ".systemix", "queue.json"), "utf8"));
    expect(queue.cards).toHaveLength(1);
    expect(queue.cards[0]).toMatchObject({
      type: "decision", experimentId: "hero-cta-2026-06", decision: "promote", status: "pending",
    });
    expect(r.reviewBy).toBe("2026-09-16");
  });

  it("learnings are newest-first and prior entries are preserved", () => {
    exp.createExperiment(root, "a", { now: NOW });
    exp.createExperiment(root, "b", { now: NOW });
    exp.closeExperiment(root, "a", { result: "ra", decision: "iterate", confidence: 0.6, now: NOW });
    exp.closeExperiment(root, "b", { result: "rb", decision: "kill", confidence: 0.9, now: new Date("2026-06-19T00:00:00.000Z") });
    const learnings = fs.readFileSync(path.join(root, "experiments", "LEARNINGS.md"), "utf8");
    expect(learnings.indexOf("[b]")).toBeLessThan(learnings.indexOf("[a]")); // newest first
    expect(learnings).toContain("[a]");
  });

  it("list filters by status — an agent can read the loop back", () => {
    exp.createExperiment(root, "run1", { now: NOW });
    exp.createExperiment(root, "done1", { now: NOW });
    exp.closeExperiment(root, "done1", { result: "r", decision: "promote", confidence: 0.8, now: NOW });
    expect(exp.listExperiments(root, { status: "running" }).map((e) => e.id)).toEqual(["run1"]);
    expect(exp.listExperiments(root, { status: "complete" }).map((e) => e.id)).toEqual(["done1"]);
    expect(exp.listExperiments(root).length).toBe(2);
  });

  it("the _example template file is excluded from list", () => {
    fs.mkdirSync(path.join(root, "experiments"), { recursive: true });
    fs.writeFileSync(path.join(root, "experiments", "_example.mdx"), "---\ntype: experiment\nid: example\nstatus: running\n---\n", "utf8");
    expect(exp.listExperiments(root)).toEqual([]);
  });

  it("CLI door: `experiment new` writes the same file", async () => {
    await experiment(["new", "cli-made", "--hypothesis", "from the CLI"], { projectRoot: root });
    const fm = readMdx(root, "cli-made").data;
    expect(fm.id).toBe("cli-made");
    expect(fm.hypothesis).toBe("from the CLI");
    expect(fm.status).toBe("running");
  });
});
