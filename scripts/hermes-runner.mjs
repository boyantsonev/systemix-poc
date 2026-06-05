#!/usr/bin/env node
// hermes-runner.mjs — standalone Hermes scheduler entrypoint (launchd/cron).
//
// A Claude Code skill (/hermes) can't be invoked by cron, so this replicates the
// skill's core flow against local Ollama and appends HITL cards to
// .systemix/queue.json. It is HITL-safe: it only QUEUES cards for human review,
// it never mutates contracts unattended (the human resolves in /queue).
//
//   node scripts/hermes-runner.mjs daily    # synthesize evidence-ready contracts
//   node scripts/hermes-runner.mjs weekly   # propose one architecture/flow change
//
// Declarative schedule: .systemix/hermes-jobs.json. launchd plists: scripts/launchd/.

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OLLAMA = process.env.OLLAMA_ENDPOINT || "http://localhost:11434";
const MODEL = process.env.HERMES_MODEL || "hermes3";
const QUEUE = join(ROOT, ".systemix", "queue.json");

const today = () => new Date().toISOString().slice(0, 10);
const confNum = { high: 0.9, medium: 0.6, low: 0.3 };
const field = (text, key) => (text.match(new RegExp(`^${key}:\\s*(.+)$`, "m")) || [])[1]?.trim();

// The web /api/queue surface expects { cards: [...] }. Normalize legacy array form.
function loadCards() {
  try {
    const raw = JSON.parse(readFileSync(QUEUE, "utf8"));
    if (Array.isArray(raw)) return raw;
    return raw.cards ?? [];
  } catch { return []; }
}
function appendCard(card) {
  const cards = loadCards();
  if (cards.some((c) => c.id === card.id)) { console.log(`· card ${card.id} already queued, skipping`); return; }
  cards.push(card);
  writeFileSync(QUEUE, JSON.stringify({ cards }, null, 2) + "\n");
  console.log(`✓ queued ${card.type} → ${card.id}`);
}

async function ollama(prompt) {
  const res = await fetch(`${OLLAMA}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt, stream: false, options: { temperature: 0.4 } }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  const data = await res.json();
  return data.response || "";
}
async function checkOllama() {
  try {
    const r = await fetch(`${OLLAMA}/api/tags`);
    return r.ok;
  } catch { return false; }
}

// Pull the first {...} JSON object out of an LLM response, tolerant of prose around it.
function extractJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

function findContracts(subdir, statusFilter) {
  const dir = join(ROOT, "contract", subdir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => ({ file: join(dir, f), name: basename(f, ".mdx"), text: readFileSync(join(dir, f), "utf8") }))
    .filter((c) => !statusFilter || field(c.text, "status") === statusFilter);
}

async function runDaily() {
  const contracts = [...findContracts("hypotheses", "evidence-ready"), ...findContracts("experiments", "evidence-ready")];
  if (contracts.length === 0) {
    console.log("· no contracts with status: evidence-ready — nothing to synthesize.");
    return;
  }
  for (const c of contracts) {
    const prompt = [
      "You are Hermes, a synthesis agent for a design-system + growth pipeline.",
      "Read this experiment contract and its evidence. Decide whether to promote the variant, run the experiment longer, or reject it.",
      "Respond ONLY as strict JSON: {\"decision\":\"promote-variant|run-longer|reject\",\"confidence\":\"high|medium|low\",\"rationale\":\"1-3 sentences\"}.",
      "Do not re-propose directions the contract history already rejected.",
      "",
      "--- CONTRACT ---",
      c.text,
    ].join("\n");
    const out = await ollama(prompt);
    const parsed = extractJson(out) || { decision: "run-longer", confidence: "low", rationale: out.slice(0, 240) };
    appendCard({
      id: `hitl-hermes-${c.name}-${today()}`,
      type: "hermes-synthesis",
      experiment: c.name,
      component: c.name,
      filePath: `contract/hypotheses/${c.name}.mdx`,
      contract: `contract/hypotheses/${c.name}.mdx`,
      proposed: parsed.decision,
      context: parsed.rationale,
      confidence: confNum[parsed.confidence] ?? 0.5,
      "hermes-decision": parsed.decision,
      "hermes-confidence": parsed.confidence,
      "hermes-at": today(),
      "evidence-available": true,
      requestedAt: new Date().toISOString(),
      status: "pending",
      "queued-at": new Date().toISOString(),
    });
  }
}

async function runWeekly() {
  const plan = existsSync(join(ROOT, "PLAN.md")) ? readFileSync(join(ROOT, "PLAN.md"), "utf8").slice(0, 4000) : "";
  const contracts = [...findContracts("hypotheses"), ...findContracts("experiments")];
  const index = contracts.map((c) => `- ${c.name}: ${field(c.text, "status") || "?"}`).join("\n");
  const prompt = [
    "You are Hermes, the architecture-synthesis agent for the Systemix pipeline.",
    "Based on the project goals and the current experiment/contract state below, propose EXACTLY ONE concrete architecture or flow improvement to pursue this week.",
    "It should reduce design-code drift, tighten the evidence loop, or improve the design-system sync. Keep it small enough to ship in a week.",
    "Respond ONLY as strict JSON: {\"proposal\":\"one sentence\",\"rationale\":\"2-3 sentences\",\"confidence\":\"high|medium|low\"}.",
    "",
    "--- PROJECT GOALS (PLAN.md excerpt) ---",
    plan,
    "",
    "--- CONTRACT STATE ---",
    index || "(no contracts)",
  ].join("\n");
  const out = await ollama(prompt);
  const parsed = extractJson(out) || { proposal: out.slice(0, 200), rationale: "", confidence: "low" };
  appendCard({
    id: `hitl-hermes-architecture-${today()}`,
    type: "architecture-proposal",
    component: "Weekly architecture gate",
    proposed: parsed.proposal,
    context: parsed.rationale,
    confidence: confNum[parsed.confidence] ?? 0.5,
    "hermes-proposal": parsed.proposal,
    "hermes-confidence": parsed.confidence,
    "hermes-at": today(),
    requestedAt: new Date().toISOString(),
    status: "pending",
    "queued-at": new Date().toISOString(),
  });
}

const mode = process.argv[2];
if (!["daily", "weekly"].includes(mode)) {
  console.error("usage: hermes-runner.mjs <daily|weekly>");
  process.exit(2);
}
if (!(await checkOllama())) {
  console.error(`✗ Ollama not reachable at ${OLLAMA}. Start it: brew services start ollama && ollama pull ${MODEL}`);
  process.exit(1);
}
console.log(`Hermes ${mode} run — model=${MODEL} @ ${OLLAMA}`);
await (mode === "daily" ? runDaily() : runWeekly());
console.log("done.");
