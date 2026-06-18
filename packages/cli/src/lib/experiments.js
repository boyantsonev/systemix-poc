"use strict";

// File-ops over the experiments/ loop — the shared core behind the CLI
// `experiment` subcommands. The MCP server exposes the SAME operations over the
// SAME files via its experiment_* tools (the "three doors": MCP / CLI / skills,
// one set of MDX files). Everything is file-first; no external service.

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const layout = require("./layout");

const REVIEW_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

const isoDay = (d) => d.toISOString().slice(0, 10);

/** List experiment ids (top-level experiments/*.mdx, excluding the _example). */
function listExperiments(root, { status } = {}) {
  const dir = layout.abs(root).experiments;
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx") && !f.startsWith("_"))
    .map((f) => {
      const parsed = matter(fs.readFileSync(path.join(dir, f), "utf8"));
      const d = parsed.data || {};
      return {
        id: String(d.id ?? f.replace(/\.mdx$/, "")),
        status: String(d.status ?? "unknown"),
        section: d.section ?? null,
        metric: d.metric ?? null,
        hypothesis: d.hypothesis ?? null,
        decision: d.decision ?? null,
        confidence: d.confidence ?? null,
        "posthog-event": d["posthog-event"] ?? null,
      };
    })
    .filter((e) => (status ? e.status === status : true))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Read one experiment ({ data, content }) or throw if missing. */
function getExperiment(root, id) {
  const file = layout.abs(root).experimentFile(id);
  if (!fs.existsSync(file)) throw new Error(`experiment not found: ${layout.rel.experimentFile(id)}`);
  const parsed = matter(fs.readFileSync(file, "utf8"));
  return { file, data: parsed.data || {}, content: parsed.content || "" };
}

/** Create experiments/<id>.mdx (status: running). Throws if it already exists. */
function createExperiment(root, id, fields = {}) {
  if (!id) throw new Error("an experiment id is required");
  const file = layout.abs(root).experimentFile(id);
  if (fs.existsSync(file)) throw new Error(`experiment already exists: ${layout.rel.experimentFile(id)}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const data = {
    type: "experiment",
    id,
    section: fields.section ?? "landing",
    hypothesis: fields.hypothesis ?? "Replace with the assumption you are testing.",
    icp: fields.icp ?? null,
    status: "running",
    metric: fields.metric ?? null,
    variants: {
      control: fields.control ?? "Current experience",
      variant_b: fields.variant_b ?? "The proposed change",
    },
    "posthog-event": null,
    result: null,
    decision: null,
    confidence: null,
    "evidence-posthog": null,
    "evidence-social": null,
    created: fields.created ?? isoDay(fields.now ?? new Date()),
    "review-by": null,
  };
  const body = `\n# ${id}\n\n${fields.rationale ?? "Why this hypothesis — fill in the assumption, the ICP, and the metric that tells you it worked."}\n`;
  fs.writeFileSync(file, matter.stringify(body, data), "utf8");
  return file;
}

/** Attach what to measure (posthog-event + optional metric) to an experiment. */
function setMeasurement(root, id, { event, metric } = {}) {
  const { file, data, content } = getExperiment(root, id);
  if (event) data["posthog-event"] = event;
  if (metric) data.metric = metric;
  fs.writeFileSync(file, matter.stringify(content, data), "utf8");
  return { file, "posthog-event": data["posthog-event"], metric: data.metric };
}

/**
 * Close an experiment: write the result into experiments/<id>.mdx, append the
 * learning to experiments/LEARNINGS.md (## Memory, newest first), and push a
 * decision card to .systemix/queue.json. The capture IS the loop.
 */
function closeExperiment(root, id, { result, decision, confidence, learning, now = new Date() } = {}) {
  const { file, data, content } = getExperiment(root, id);
  const day = isoDay(now);
  const reviewBy = isoDay(new Date(now.getTime() + REVIEW_DAYS * DAY_MS));

  data.status = "complete";
  if (result != null) data.result = result;
  if (decision != null) data.decision = decision;
  if (confidence != null) data.confidence = confidence;
  data["review-by"] = reviewBy;
  fs.writeFileSync(file, matter.stringify(content, data), "utf8");

  const title = learning || result || id;
  appendLearning(root, { id, title, decision, confidence, day, reviewBy });
  const card = pushQueueCard(root, { id, decision, confidence, summary: result, now });

  return { file, reviewBy, learningsFile: layout.rel.learnings, card };
}

/** Append one provenance-stamped bullet to the ## Memory ledger in LEARNINGS.md. */
function appendLearning(root, { id, title, decision, confidence, day, reviewBy }) {
  const file = layout.abs(root).learnings;
  let text = fs.existsSync(file)
    ? fs.readFileSync(file, "utf8")
    : "# Learnings\n\n## Memory\n\n*No entries yet.*\n";

  const bullet =
    `- **${day} · ${title}** — confidence ${confidence ?? "—"} · from [${id}], ` +
    `decision: ${decision ?? "—"}. Review by: ${reviewBy}. Used by: —`;

  if (!text.includes("## Memory")) text += `\n\n## Memory\n\n*No entries yet.*\n`;

  const lines = text.split("\n");
  const idx = lines.findIndex((l) => l.trim() === "## Memory");
  // Insert the bullet on the first non-empty line after the heading; drop the placeholder.
  let insertAt = idx + 1;
  while (insertAt < lines.length && lines[insertAt].trim() === "") insertAt++;
  if (lines[insertAt] && lines[insertAt].includes("*No entries yet.*")) {
    lines.splice(insertAt, 1, bullet);
  } else {
    lines.splice(insertAt, 0, bullet, "");
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, lines.join("\n"), "utf8");
  return file;
}

/** Append a decision card to .systemix/queue.json (creates it if absent). */
function pushQueueCard(root, { id, decision, confidence, summary, now = new Date() }) {
  const file = layout.abs(root).queue;
  let queue = { cards: [] };
  if (fs.existsSync(file)) {
    try { queue = JSON.parse(fs.readFileSync(file, "utf8")); } catch { /* keep default */ }
  }
  if (!Array.isArray(queue.cards)) queue.cards = [];
  const card = {
    id: `decision-${id}-${now.getTime()}`,
    type: "decision",
    experimentId: id,
    decision: decision ?? null,
    confidence: confidence ?? null,
    summary: summary ?? null,
    status: "pending",
    requestedAt: now.toISOString(),
  };
  queue.cards.push(card);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(queue, null, 2) + "\n", "utf8");
  return card;
}

/** Read the synthesized loop memory (LEARNINGS.md), or a hint if absent. */
function readLearnings(root) {
  const file = layout.abs(root).learnings;
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, "utf8");
}

module.exports = {
  listExperiments,
  getExperiment,
  createExperiment,
  setMeasurement,
  closeExperiment,
  readLearnings,
  // internals exported for reuse/tests
  appendLearning,
  pushQueueCard,
};
