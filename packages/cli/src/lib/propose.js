"use strict";

// The engine's generate stage — `systemix propose`. Deterministic on both
// sides of the LLM: `buildProposalContext` gathers the evidence digest the
// model reasons over (read-only), and `pushHypothesisProposal` validates,
// dedupes, and atomically queues the model's ONE drafted bet as a
// hypothesis-proposal card in .systemix/queue.json.
//
// The covenant, same as the loop runner's: the engine PROPOSES, a human
// decides. Nothing here creates an experiment, writes source, or touches
// LEARNINGS — approving the card (app `PATCH /api/queue`) is what scaffolds
// experiments/<id>.mdx, and even that ships no code (/write-variants and the
// PR merge are the next human gates).

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const layout = require("./layout");
const exp = require("./experiments");
const { listGoals, goalFile, isValidGoalId } = require("./goals");

const JOBS_FILE = path.join("docs", "product", "jobs.yaml");

// ── ODI ranking (the jtbd-audit rubric, recomputed — never trust stored scores)

function readOdi(root, { top = 5 } = {}) {
  const file = path.join(root, JOBS_FILE);
  if (!fs.existsSync(file)) return [];
  let doc;
  try {
    doc = matter.engines.yaml.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return [];
  }
  const outcomes = [];
  for (const job of doc?.jobs ?? []) {
    for (const o of job.odi_outcomes ?? []) {
      const importance = Number(o.importance_estimated ?? o.importance);
      const satisfaction = Number(o.satisfaction_estimated ?? o.satisfaction);
      if (!Number.isFinite(importance) || !Number.isFinite(satisfaction)) continue;
      outcomes.push({
        id: o.id ?? null,
        job: job.id ?? null,
        statement: o.statement ?? null,
        importance,
        satisfaction,
        // opportunity = importance + max(importance − satisfaction, 0)
        score: importance + Math.max(importance - satisfaction, 0),
        status: o.status ?? null,
      });
    }
  }
  return outcomes.sort((a, b) => b.score - a.score).slice(0, top);
}

// ── Product workflows (persona/JTBD flows the build chapter authored) ────────
// `/build-workflow` writes .systemix/workflows/<slug>.json tagged `scope`:
//   "internal" — the agentic workflow around Systemix itself (skip here; that's
//                `/atlas`'s job, not a bet against the client's own product).
//   "product"  — a persona/JTBD-driven flow for the product being built. These
//                are exactly what a next hypothesis should extend or unblock.

function readProductWorkflows(root) {
  const dir = layout.abs(root).workflows;
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    let w;
    try {
      w = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    } catch {
      continue;
    }
    if (w?.scope !== "product") continue;
    out.push({
      id: w.id ?? path.basename(f, ".json"),
      name: w.name ?? null,
      persona: w.persona ?? null,
      jtbd: w.jtbd ?? null,
      description: w.description ?? null,
    });
  }
  return out;
}

// ── Goals (declared by humans; the engine only reads them) ───────────────────

function readGoals(root) {
  return listGoals(root)
    // A goal is read back from experiments/goals/<id>.mdx; one whose (hand-edited)
    // id isn't a safe slug is skipped — never resolved into a path, never a crash.
    .filter((g) => g.status === "active" && isValidGoalId(g.id))
    .map((g) => {
      const parsed = matter(fs.readFileSync(goalFile(root, g.id), "utf8"));
      const d = parsed.data || {};
      return {
        id: g.id,
        title: g.title,
        icp: g.icp,
        given: d.given ?? null,
        "success-criteria": d["success-criteria"] ?? null,
        "kill-if": d["kill-if"] ?? null,
      };
    });
}

function readQueue(root) {
  const file = layout.abs(root).queue;
  if (!fs.existsSync(file)) return { cards: [] };
  try {
    const q = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(q.cards) ? q : { cards: [] };
  } catch {
    return { cards: [] };
  }
}

const pendingProposal = (queue) =>
  queue.cards.find((c) => c.type === "hypothesis-proposal" && c.status === "pending") ?? null;

/**
 * The read-only evidence digest the generate stage reasons over:
 *   learnings        the N newest memory bullets (structured; the recall)
 *   coldStart        true while LEARNINGS has no entries — rank by ODI + goal gaps
 *   running          running experiments (the section-overlap guard)
 *   recentDecisions  the latest closed experiments (don't re-propose a kill)
 *   goals            active goals (given / success-criteria / kill-if)
 *   odi              top underserved outcomes, score recomputed from jobs.yaml
 *   productWorkflows persona/JTBD flows for the product itself (scope:"product"
 *                    in .systemix/workflows/*.json) — what the build chapter
 *                    authored; a next bet can extend or unblock a step in one
 *   pendingProposal  the pending hypothesis-proposal card, if any (one max)
 */
function buildProposalContext(root, { recent = 5, odiTop = 5 } = {}) {
  const entries = exp.parseLearnings(exp.readLearnings(root) ?? "");
  const all = exp.listExperiments(root);
  return {
    coldStart: entries.length === 0,
    learnings: entries.slice(0, Number(recent)).map(({ raw, ...e }) => ({ ...e, bullet: raw })),
    running: all
      .filter((e) => e.status === "running")
      .map(({ id, section, metric, hypothesis, "posthog-event": ev }) => ({ id, section, metric, hypothesis, "posthog-event": ev })),
    recentDecisions: all
      .filter((e) => e.status === "complete")
      .slice(-Number(recent))
      .map(({ id, section, decision, confidence }) => ({ id, section, decision, confidence })),
    goals: readGoals(root),
    odi: readOdi(root, { top: odiTop }),
    productWorkflows: readProductWorkflows(root),
    pendingProposal: pendingProposal(readQueue(root)),
  };
}

// ── Queue: the hypothesis-proposal card (validate → dedupe → atomic write) ───

const REQUIRED_PAYLOAD = ["id", "hypothesis", "goal", "metric"];

function validateProposal(root, proposal) {
  if (!proposal || typeof proposal !== "object" || Array.isArray(proposal)) {
    throw new Error("a proposal object is required");
  }
  const p = proposal.payload;
  if (!p || typeof p !== "object" || Array.isArray(p)) {
    throw new Error("proposal.payload is required (the frontmatter for `systemix experiment new`)");
  }
  for (const key of REQUIRED_PAYLOAD) {
    if (typeof p[key] !== "string" || !p[key].trim()) {
      throw new Error(`proposal.payload.${key} is required`);
    }
  }
  exp.assertExperimentId(p.id); // it becomes experiments/<id>.mdx on approval
  if (fs.existsSync(layout.abs(root).experimentFile(p.id))) {
    throw new Error(`experiment already exists: ${layout.rel.experimentFile(p.id)} — propose a different id`);
  }
  const context = String(proposal.context ?? "").trim();
  if (!context) {
    throw new Error("proposal.context is required — cite the learning bullet or ODI outcome this bet builds on");
  }
  return { p, context };
}

/** Queue ONE hypothesis-proposal card. At most one pending proposal globally. */
function pushHypothesisProposal(root, proposal, { now = new Date() } = {}) {
  const { p, context } = validateProposal(root, proposal);

  const file = layout.abs(root).queue;
  const queue = readQueue(root);
  const pending = pendingProposal(queue);
  if (pending) return { card: pending, deduped: true };

  const asStrings = (v) => (Array.isArray(v) ? v.map(String) : []);
  const card = {
    id: `hypothesis-proposal-${p.id}-${now.getTime()}`,
    type: "hypothesis-proposal",
    experimentId: p.id,
    goal: p.goal,
    hypothesis: String(proposal.hypothesis ?? p.hypothesis),
    context,
    confidence: proposal.confidence ?? null,
    citedLearnings: asStrings(proposal.citedLearnings),
    citedOdi: asStrings(proposal.citedOdi),
    citedWorkflow: asStrings(proposal.citedWorkflow),
    payload: p,
    summary:
      `Proposed next bet: ${p.id} (goal: ${p.goal}). Approve to scaffold the contract — ` +
      `nothing ships until /write-variants + a merged PR. The engine never creates it.`,
    proposedBy: "engine-propose",
    status: "pending",
    requestedAt: now.toISOString(),
  };
  queue.cards.push(card);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(queue, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, file);
  return { card, deduped: false };
}

module.exports = { buildProposalContext, pushHypothesisProposal, readOdi };
