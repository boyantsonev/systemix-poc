"use strict";

/**
 * npx systemix atlas scan
 *
 * Atlas Phase-3 scanner. Discovers skills from .claude/skills/ and
 * packages/cli/pipelines, infers one draft workflow per skill, writes drafts
 * to .systemix/atlas-drafts/, and pushes a HITL card to .systemix/queue.json
 * for each new draft. Approve in /queue → contract lands in contract/workflows/
 * and atlas build runs automatically.
 */

const fs = require("fs");
const path = require("path");
const { parseSimpleYaml } = require("../config");
const { discoverSkills, discoverApiRoutes, inferWorkflows } = require("../lib/workflow-inferrer");
const { readVocab } = require("./atlas");

const DRAFTS_REL = path.join(".systemix", "atlas-drafts");
const QUEUE_PATH = path.join(".systemix", "queue.json");

// ── MDX serialisation ──────────────────────────────────────────────────────

function quote(s) {
  // Wrap in double quotes if the value contains special YAML chars or spaces.
  if (typeof s !== "string") return String(s);
  if (/[:#,{}\[\]|>&*!'"?]/.test(s) || s.includes(" ") || s.length === 0) {
    return `"${s.replace(/"/g, '\\"')}"`;
  }
  return s;
}

function serializeStep(s) {
  const parts = [`id: ${s.id}, label: ${quote(s.label)}, kind: ${s.kind}, note: ${quote(s.note)}`];
  if (s.agent) parts.push(`, agent: ${s.agent}`);
  if (s.screen) parts.push(`, screen: ${s.screen}`);
  return `  - { ${parts.join("")} }`;
}

function serializeWorkflowMdx(w) {
  const stepsBlock = w.steps.map(serializeStep).join("\n");
  const edgesBlock = w.edges.map((e) => `  - { from: ${e.from}, to: ${e.to} }`).join("\n");

  return `---
id: ${w.id}
persona: ${w.persona}
title: ${quote(w.title)}
pattern: ${w.pattern}
surface: ${w.surface}
problem: ${quote(w.problem)}
steps:
${stepsBlock}
edges:
${edgesBlock}
---

# ${w.title}

${w.problem}

> Auto-drafted by \`npx systemix atlas scan\` from skill \`/${w._skill}\`.
> Review steps, edges, and labels before approving — then approve in the queue to publish.
`;
}

// ── Queue helpers ──────────────────────────────────────────────────────────

function readQueue(projectRoot) {
  const qp = path.join(projectRoot, QUEUE_PATH);
  if (!fs.existsSync(qp)) return { cards: [] };
  try {
    return JSON.parse(fs.readFileSync(qp, "utf8"));
  } catch {
    return { cards: [] };
  }
}

function writeQueue(projectRoot, data) {
  const qp = path.join(projectRoot, QUEUE_PATH);
  fs.mkdirSync(path.dirname(qp), { recursive: true });
  const tmp = qp + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, qp);
}

// ── Scanner (driving port) ─────────────────────────────────────────────────

/**
 * @param {object} [opts]
 * @param {string} [opts.projectRoot]
 * @param {number} [opts.limit=10]
 * @returns {Promise<{ drafts: string[], skills: number, routes: number }>}
 */
async function scan(opts = {}) {
  const projectRoot = opts.projectRoot ?? process.cwd();
  const limit = opts.limit ?? 10;

  // 1. Load vocab
  const configPath = path.join(projectRoot, "systemix.config.yaml");
  if (!fs.existsSync(configPath)) {
    throw new Error("No systemix.config.yaml found. Run npx systemix init first.");
  }
  const config = parseSimpleYaml(fs.readFileSync(configPath, "utf8"));
  const vocab = readVocab(config);
  if (!vocab) throw new Error("No atlas: block found in systemix.config.yaml.");

  // 2. Discover
  const skills = discoverSkills(projectRoot);
  const routes = discoverApiRoutes(projectRoot);

  if (skills.length === 0) {
    return { drafts: [], skills: 0, routes: routes.length };
  }

  // 3. Infer
  const workflows = inferWorkflows(skills, routes, vocab, limit);

  // 4. Write drafts + queue cards
  const draftsDir = path.join(projectRoot, DRAFTS_REL);
  fs.mkdirSync(draftsDir, { recursive: true });

  const queue = readQueue(projectRoot);
  const now = new Date().toISOString();
  const written = [];

  for (const w of workflows) {
    // Skip if a final contract already exists
    const finalPath = path.join(projectRoot, "contract", "workflows", `${w.id}.mdx`);
    if (fs.existsSync(finalPath)) continue;

    // Skip if a pending draft card already exists for this id
    const hasPending = (queue.cards ?? []).some(
      (c) => c.type === "workflow-draft-review" && c.workflowId === w.id && c.status === "pending",
    );
    if (hasPending) continue;

    // Write the draft MDX
    const draftRel = path.posix.join(".systemix", "atlas-drafts", `${w.id}.mdx`);
    fs.writeFileSync(path.join(projectRoot, draftRel), serializeWorkflowMdx(w), "utf8");

    // Push HITL card
    const { _skill, ...wCore } = w;
    queue.cards = queue.cards ?? [];
    queue.cards.push({
      id: `scan-${w.id}-${Date.now()}`,
      type: "workflow-draft-review",
      workflowId: w.id,
      draftPath: draftRel,
      skill: _skill,
      title: w.title,
      persona: w.persona,
      pattern: w.pattern,
      stepCount: w.steps.length,
      context: `Auto-drafted from skill /${_skill}. Pattern: ${w.pattern}, ${w.steps.length} steps.`,
      requestedAt: now,
      status: "pending",
    });

    written.push(w.id);
  }

  writeQueue(projectRoot, queue);
  return { drafts: written, skills: skills.length, routes: routes.length };
}

module.exports = { scan, serializeWorkflowMdx };
