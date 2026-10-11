"use strict";

/**
 * Acceptance tests — the engine's generate stage (`systemix propose`). Real
 * filesystem (tmp dirs), fixed clock. Pins the covenant: the propose path
 * validates + dedupes + queues ONE hypothesis-proposal card and NEVER creates
 * an experiment; approval (the app) does that. Also pins the digest's
 * cold-start signal and the recomputed ODI ranking.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

const exp = require("../../../src/lib/experiments");
const { createGoal } = require("../../../src/lib/goals");
const { buildProposalContext, pushHypothesisProposal, readOdi } = require("../../../src/lib/propose");
const { propose } = require("../../../src/commands/propose");

const NOW = new Date("2026-07-08T00:00:00.000Z");

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "systemix-propose-"));
}
const readQueue = (root) => {
  const p = path.join(root, ".systemix", "queue.json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : { cards: [] };
};

const JOBS_YAML = `
jobs:
  - id: "JOB-T"
    odi_outcomes:
      - id: "ODI-A"
        statement: "well served"
        importance_estimated: 5
        satisfaction_estimated: 9
        score_estimated: 99   # stored score is a lie — must be recomputed to 5
      - id: "ODI-B"
        statement: "underserved"
        importance_estimated: 9
        satisfaction_estimated: 2
        score_estimated: 1    # stored score is a lie — must be recomputed to 16
      - id: "ODI-C"
        statement: "no numbers"
`;

function writeJobs(root, yaml = JOBS_YAML) {
  const dir = path.join(root, "docs", "product");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "jobs.yaml"), yaml, "utf8");
}

function writeWorkflow(root, slug, data) {
  const dir = path.join(root, ".systemix", "workflows");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${slug}.json`), JSON.stringify(data), "utf8");
}

const proposal = (over = {}) => ({
  hypothesis: "clearer kit CTA lifts requests",
  context: "ODI-B (score 16): underserved",
  confidence: 0.5,
  citedOdi: ["ODI-B"],
  ...over,
  payload: {
    id: "kit-cta-2026-07",
    section: "kit",
    goal: "leads",
    hypothesis: "clearer kit CTA lifts requests",
    metric: "kit-request-rate",
    ...(over.payload ?? {}),
  },
});

describe("systemix propose — context (the read-only digest)", () => {
  let root;
  beforeEach(() => (root = tmpRoot()));
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it("empty ledger ⇒ coldStart:true, no learnings, odi:[] when jobs.yaml is absent", () => {
    const ctx = buildProposalContext(root);
    expect(ctx.coldStart).toBe(true);
    expect(ctx.learnings).toEqual([]);
    expect(ctx.odi).toEqual([]);
    expect(ctx.pendingProposal).toBeNull();
  });

  it("running experiments + active goals appear (the overlap guard's inputs)", () => {
    exp.createExperiment(root, "x", { section: "landing", metric: "ctr", now: NOW });
    createGoal(root, "leads", { title: "Leads", icp: "founder", killIf: "no lift twice", now: NOW });
    const ctx = buildProposalContext(root);
    expect(ctx.running).toEqual([
      expect.objectContaining({ id: "x", section: "landing", metric: "ctr" }),
    ]);
    expect(ctx.goals).toEqual([
      expect.objectContaining({ id: "leads", icp: "founder", "kill-if": "no lift twice" }),
    ]);
  });

  it("a goal whose id isn't a safe slug is skipped — never read through, never a crash", () => {
    createGoal(root, "leads", { title: "Leads", now: NOW });
    // A hand-edited goal whose frontmatter id resolves outside experiments/goals/
    fs.writeFileSync(
      path.join(root, "experiments", "goals", "sneaky.mdx"),
      "---\ntype: goal\nid: ../../outside\nstatus: active\n---\n",
      "utf8"
    );
    fs.writeFileSync(path.join(root, "outside.mdx"), "---\ngiven: not a goal\n---\n", "utf8");
    const ctx = buildProposalContext(root);
    expect(ctx.goals.map((g) => g.id)).toEqual(["leads"]);
  });

  it("ODI outcomes are RE-scored (importance + max(imp−sat,0)), ranked, numbers-less skipped", () => {
    writeJobs(root);
    const odi = readOdi(root);
    expect(odi.map((o) => o.id)).toEqual(["ODI-B", "ODI-A"]); // C skipped, B (16) over A (5)
    expect(odi[0].score).toBe(16);
    expect(odi[1].score).toBe(5); // never the stored 99
  });

  it("productWorkflows surfaces only scope:product flows, keyed by persona/jtbd", () => {
    writeWorkflow(root, "student-socrat-homework", {
      id: "student-socrat-homework",
      name: "Socratic homework help",
      scope: "product",
      persona: "student",
      jtbd: "JOB-001",
      description: "A student is stuck and wants the answer.",
    });
    writeWorkflow(root, "engine-generate-loop", {
      id: "engine-generate-loop",
      name: "Systemix generate stage",
      scope: "internal",
    });
    const ctx = buildProposalContext(root);
    expect(ctx.productWorkflows).toEqual([
      expect.objectContaining({ id: "student-socrat-homework", persona: "student", jtbd: "JOB-001" }),
    ]);
  });

  it("a closed experiment shows in recentDecisions and its bullet ends coldStart", () => {
    exp.createExperiment(root, "x", { now: NOW });
    exp.closeExperiment(root, "x", { result: "won", decision: "promote", confidence: 0.9, now: NOW });
    const ctx = buildProposalContext(root);
    expect(ctx.coldStart).toBe(false);
    expect(ctx.learnings[0]).toMatchObject({ id: "x", decision: "promote" });
    expect(ctx.recentDecisions).toEqual([
      expect.objectContaining({ id: "x", decision: "promote" }),
    ]);
  });
});

describe("systemix propose — queue (validate → dedupe → atomic write)", () => {
  let root;
  beforeEach(() => (root = tmpRoot()));
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it("queues ONE pending hypothesis-proposal card and NEVER creates the experiment", () => {
    const { card, deduped } = pushHypothesisProposal(root, proposal(), { now: NOW });
    expect(deduped).toBe(false);
    expect(card).toMatchObject({
      type: "hypothesis-proposal",
      experimentId: "kit-cta-2026-07",
      goal: "leads",
      proposedBy: "engine-propose",
      status: "pending",
      citedOdi: ["ODI-B"],
      citedWorkflow: [],
    });
    expect(readQueue(root).cards).toHaveLength(1);
    // the covenant: approval creates the contract, the engine does not
    expect(fs.existsSync(path.join(root, "experiments", "kit-cta-2026-07.mdx"))).toBe(false);
    // digest surfaces the pending card
    expect(buildProposalContext(root).pendingProposal.id).toBe(card.id);
  });

  it("a second push while one is pending dedupes globally (even a different id)", () => {
    pushHypothesisProposal(root, proposal(), { now: NOW });
    const second = pushHypothesisProposal(
      root,
      proposal({ payload: { id: "other-bet-2026-07" } }),
      { now: NOW },
    );
    expect(second.deduped).toBe(true);
    expect(second.card.experimentId).toBe("kit-cta-2026-07");
    expect(readQueue(root).cards).toHaveLength(1);
  });

  it("rejects a payload id that collides with an existing experiment", () => {
    exp.createExperiment(root, "kit-cta-2026-07", { now: NOW });
    expect(() => pushHypothesisProposal(root, proposal(), { now: NOW })).toThrow(/already exists/);
    expect(readQueue(root).cards).toHaveLength(0);
  });

  it("rejects a payload id that is not a path-safe experiment id (it becomes experiments/<id>.mdx)", () => {
    expect(() =>
      pushHypothesisProposal(root, proposal({ payload: { id: "../escaped-id" } }), { now: NOW }),
    ).toThrow('invalid experiment id "../escaped-id"');
    expect(readQueue(root).cards).toHaveLength(0);
  });

  it("rejects malformed proposals (missing payload fields, missing citation context)", () => {
    expect(() => pushHypothesisProposal(root, {}, { now: NOW })).toThrow(/payload/);
    expect(() =>
      pushHypothesisProposal(root, { context: "x", payload: { id: "a" } }, { now: NOW }),
    ).toThrow(/payload\.hypothesis/);
    expect(() =>
      pushHypothesisProposal(root, proposal({ context: "  " }), { now: NOW }),
    ).toThrow(/context is required/);
    expect(readQueue(root).cards).toHaveLength(0);
  });

  it("CLI door: `propose queue --stdin` queues; `propose context` returns the digest", async () => {
    const r = await propose(["queue", "--stdin"], {
      projectRoot: root,
      now: NOW,
      stdin: JSON.stringify(proposal()),
    });
    expect(r.deduped).toBe(false);
    expect(readQueue(root).cards[0].type).toBe("hypothesis-proposal");

    const digest = await propose(["context"], { projectRoot: root });
    expect(digest.pendingProposal.id).toBe(r.card.id);
  });

  it("CLI door: invalid stdin JSON throws (non-zero exit via bin's catch)", async () => {
    await expect(
      propose(["queue", "--stdin"], { projectRoot: root, stdin: "not json" }),
    ).rejects.toThrow(/not valid JSON/);
  });
});
