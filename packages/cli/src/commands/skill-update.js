"use strict";

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

function buildPrompt(hypothesisId, decision, skillContent) {
  const date = new Date().toISOString().slice(0, 10);
  return `You are updating a skill file. The current SKILL.md content is:

${skillContent}

Append a new bullet to the "## Past Decisions" section (create the section if absent) recording:
- Hypothesis ID: ${hypothesisId}
- Decision: ${decision}
- Date: ${date}
- A one-line summary of the decision

Return ONLY the updated full SKILL.md content, nothing else.`;
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
 * Update the relevant SKILL.md after a hypothesis decision is committed.
 *
 * @param {string} hypothesisId
 * @param {'promote'|'kill'} decision
 * @param {object} card
 * @param {object} [opts]
 * @param {string} [opts.workspaceRoot]
 * @param {Function} [opts.fetch]
 * @param {Function} [opts.onLog]
 * @returns {Promise<void>}
 */
async function update(hypothesisId, decision, card, opts = {}) {
  const workspaceRoot = opts.workspaceRoot ?? process.cwd();
  const fetchFn       = opts.fetch ?? globalThis.fetch;
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

  // Step 2: Resolve skill path
  const rawTags = fm["skill-tags"];
  const tags    = parseSkillTags(rawTags);
  const tag     = tags[0] || "hermes";
  const skillPath = path.join(workspaceRoot, ".claude", "skills", tag, "SKILL.md");
  if (!fs.existsSync(skillPath)) {
    log({ event: "skill-update.skipped", reason: "skill-dir-absent", hypothesisId });
    return;
  }

  // Step 3: Probe Ollama
  let probeRes;
  try {
    probeRes = await fetchFn("http://localhost:11434/api/tags");
  } catch (err) {
    log({ event: "health.startup.refused", adapter: "ollama", reason: "econnrefused", action: "skill-update.skipped" });
    return;
  }
  const { models } = await probeRes.json();
  const hasHermes = Array.isArray(models) && models.some(m => /hermes/i.test(m.name));
  if (!hasHermes) {
    log({ event: "health.startup.refused", adapter: "ollama", reason: "model-absent", action: "skill-update.skipped" });
    return;
  }

  // Step 4: Read existing SKILL.md
  const existingContent = fs.readFileSync(skillPath, "utf8");

  // Steps 5–8: Call Hermes with retry (2 attempts, 500ms delay)
  const prompt = buildPrompt(hypothesisId, decision, existingContent);
  let proposedContent = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    if (attempt > 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    let genRes;
    try {
      genRes = await fetchFn("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "hermes3", prompt, stream: false }),
      });
    } catch (err) {
      continue;
    }

    if (!genRes.ok) {
      continue;
    }

    const { response } = await genRes.json();
    const cleaned = stripTrailingWhitespace(response);

    // Step 8: Validate — must contain ## Past Decisions
    if (!cleaned.includes("## Past Decisions")) {
      continue;
    }

    proposedContent = cleaned;
    break;
  }

  if (proposedContent === null) {
    // Both attempts failed — push HITL card
    const failCard = {
      id:          `skill-update-failed-${hypothesisId}-${Date.now()}`,
      type:        "skill-update-failed",
      hypothesisId,
      decision,
      reason:      "Hermes generate failed after 2 attempts",
      requestedAt: new Date().toISOString(),
      status:      "pending",
    };
    await pushQueueCard(queuePath, failCard);
    return;
  }

  // Step 9: Classify change
  const changeType = classifyChange(existingContent, proposedContent);

  // Step 10: Atomic write
  const tmpPath = skillPath + ".tmp";
  fs.writeFileSync(tmpPath, proposedContent, "utf8");
  fs.renameSync(tmpPath, skillPath);

  // Step 11: HITL escalation for structural changes
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
