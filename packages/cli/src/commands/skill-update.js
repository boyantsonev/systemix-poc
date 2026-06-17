"use strict";

// Records a closed-experiment decision into the relevant SKILL.md "## Past
// Decisions" log. Engine = Claude Code: this is a DETERMINISTIC append (no local
// LLM, no Ollama) — recording "decision D was made for hypothesis X on date Y" is
// mechanical, so it needs no generation step. Genuine reasoning-based skill or
// guardrail *improvements* (Hermes's review+propose role) live in the Claude
// `hermes` skill and always land as HITL proposals (see write-policy: skill /
// guardrail artifacts are never autonomous).
//
// The deterministic machinery kept from the prior Ollama version: skill-tag
// resolution, structural-vs-bullet classification, atomic write, and the HITL
// review card for structural changes. Dates are injected (opts.date) so the
// caller owns the clock and tests stay deterministic.

const fs   = require("fs");
const path = require("path");

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split("\n")) {
    const [key, ...rest] = line.split(":");
    if (key && rest.length) fm[key.trim()] = rest.join(":").trim();
  }
  return fm;
}

function parseSkillTags(rawValue) {
  if (!rawValue) return [];
  const inner = rawValue.trim().replace(/^\[/, "").replace(/\]$/, "");
  return inner.split(",").map(s => s.trim()).filter(Boolean);
}

function stripTrailingWhitespace(content) {
  return content.split("\n").map(line => line.trimEnd()).join("\n");
}

function extractHeadings(content) {
  const matches = content.match(/^## .+/gm);
  return matches ? matches.sort() : [];
}

function classifyChange(existing, proposed) {
  const existingHeadings = extractHeadings(existing);
  const proposedHeadings = extractHeadings(proposed);
  if (existingHeadings.join("|") !== proposedHeadings.join("|")) {
    return "structural";
  }
  return "bullet-level";
}

/** Strip surrounding quotes; treat YAML null markers as empty. */
function cleanFmValue(raw) {
  if (!raw) return "";
  const v = raw.trim().replace(/^["']/, "").replace(/["']$/, "").trim();
  if (v === "" || v === "null" || v === "~") return "";
  return v;
}

/** A one-line summary for the decision bullet, derived from the contract. */
function summarize(fm) {
  const s = cleanFmValue(fm.result) || cleanFmValue(fm.hypothesis) || cleanFmValue(fm.assumption);
  const oneLine = s.replace(/\s+/g, " ").trim();
  return oneLine.length > 120 ? oneLine.slice(0, 117) + "…" : oneLine;
}

/** The canonical Past-Decisions bullet for one closed experiment. */
function renderPastDecision({ hypothesisId, decision, date, summary }) {
  const tail = summary ? ` — ${summary}` : "";
  return `- ${hypothesisId}: ${decision} (${date})${tail}`;
}

/**
 * Append a Past-Decisions bullet to a SKILL.md. If the "## Past Decisions"
 * section is absent it is created at the end (a structural change). Otherwise the
 * bullet is appended after the section's existing content (a bullet-level change).
 */
function appendPastDecision(existing, entry) {
  const bullet = renderPastDecision(entry);
  const lines  = existing.split("\n");
  const idx    = lines.findIndex(l => l.trim() === "## Past Decisions");

  if (idx === -1) {
    const base = existing.replace(/\n*$/, "");
    return `${base}\n\n## Past Decisions\n\n${bullet}\n`;
  }

  let end = lines.findIndex((l, i) => i > idx && l.startsWith("## "));
  if (end === -1) end = lines.length;

  // Insert after the last non-empty line inside the section.
  let insertAt = end;
  while (insertAt > idx + 1 && lines[insertAt - 1].trim() === "") insertAt--;
  lines.splice(insertAt, 0, bullet);
  return lines.join("\n");
}

async function pushQueueCard(queuePath, card) {
  let queue = { cards: [] };
  if (fs.existsSync(queuePath)) {
    queue = JSON.parse(fs.readFileSync(queuePath, "utf8"));
    if (!Array.isArray(queue.cards)) queue.cards = [];
  }
  queue.cards.push(card);
  const tmpPath = queuePath + ".tmp";
  fs.writeFileSync(tmpPath, JSON.stringify(queue, null, 2), "utf8");
  fs.renameSync(tmpPath, queuePath);
}

// ── Driving port ──────────────────────────────────────────────────────────────

/**
 * Record a hypothesis decision into the relevant SKILL.md "## Past Decisions".
 *
 * @param {string} hypothesisId
 * @param {'promote'|'kill'|string} decision
 * @param {object} card  (reserved — the queue card that triggered this)
 * @param {object} [opts]
 * @param {string} [opts.workspaceRoot]
 * @param {string} [opts.date]   YYYY-MM-DD — injected for deterministic tests
 * @param {Function} [opts.onLog]
 * @returns {Promise<void>}
 */
async function update(hypothesisId, decision, card, opts = {}) {
  const workspaceRoot = opts.workspaceRoot ?? process.cwd();
  const date          = opts.date ?? new Date().toISOString().slice(0, 10);
  const log           = opts.onLog ?? console.log;
  const queuePath     = path.join(workspaceRoot, ".systemix", "queue.json");

  // Step 1: Read hypothesis contract
  const contractPath = path.join(workspaceRoot, "contract", "hypotheses", `${hypothesisId}.mdx`);
  if (!fs.existsSync(contractPath)) {
    log({ event: "skill-update.skipped", reason: "contract-not-found", hypothesisId });
    return;
  }
  const contractContent = fs.readFileSync(contractPath, "utf8");
  const fm = parseFrontmatter(contractContent);

  // Step 2: Resolve skill path (skill-tags frontmatter, default "hermes")
  const tags      = parseSkillTags(fm["skill-tags"]);
  const tag       = tags[0] || "hermes";
  const skillPath = path.join(workspaceRoot, ".claude", "skills", tag, "SKILL.md");
  if (!fs.existsSync(skillPath)) {
    log({ event: "skill-update.skipped", reason: "skill-dir-absent", hypothesisId });
    return;
  }

  // Step 3: Build the updated SKILL.md deterministically (no LLM)
  const existingContent = fs.readFileSync(skillPath, "utf8");
  const summary         = summarize(fm);
  const proposedContent = stripTrailingWhitespace(
    appendPastDecision(existingContent, { hypothesisId, decision, date, summary }),
  );

  // Step 4: Classify the change
  const changeType = classifyChange(existingContent, proposedContent);

  // Step 5: Atomic write
  const tmpPath = skillPath + ".tmp";
  fs.writeFileSync(tmpPath, proposedContent, "utf8");
  fs.renameSync(tmpPath, skillPath);

  // Step 6: HITL escalation for structural changes (a new section was created)
  if (changeType === "structural") {
    const reviewCard = {
      id:          `skill-update-review-${hypothesisId}-${Date.now()}`,
      type:        "skill-update-review",
      hypothesisId,
      decision,
      changeType:  "structural",
      requestedAt: new Date().toISOString(),
      status:      "pending",
    };
    await pushQueueCard(queuePath, reviewCard);
  }
}

exports.update = update;
// Exported for unit tests / reuse by the Claude `hermes` skill's apply step.
exports.appendPastDecision = appendPastDecision;
exports.classifyChange = classifyChange;
exports.summarize = summarize;
