"use strict";

// npx systemix evidence pull [--hypothesis <id>] [--all]
// npx systemix evidence close <id> --decision promote|iterate|kill

const skillUpdate = require("./skill-update");
//
// Promotes the spike-3 PostHog feedback loop to a CLI command.
// Pull: reads running hypothesis contracts → queries PostHog → Hermes synthesizes → writes to .systemix/queue.json
// Close: writes the decision + evidence back to the MDX contract directly (same as dashboard approve)

const fs = require("fs");
const path = require("path");

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434/api/chat";
const MODEL = process.env.HERMES_MODEL ?? "hermes3";
const QUEUE_PATH = path.join(process.cwd(), ".systemix", "queue.json");
const HYPOTHESES_DIR = path.join(process.cwd(), "contract", "hypotheses");

// ── Inline frontmatter parser ─────────────────────────────────────────────────

function parseFrontmatter(raw) {
  const match = raw.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---[\r\n]*([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };
  const data = {};
  let currentKey = null;
  for (const line of match[1].split(/\r?\n/)) {
    if (line.match(/^  \S/)) {
      if (currentKey && typeof data[currentKey] !== "string") {
        if (!data[currentKey] || typeof data[currentKey] !== "object") data[currentKey] = {};
        const colon = line.trim().indexOf(":");
        if (colon !== -1) {
          const k = line.trim().slice(0, colon).trim();
          const v = line.trim().slice(colon + 1).trim().replace(/^["']|["']$/g, "") || null;
          data[currentKey][k] = v;
        }
      }
      continue;
    }
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const rawVal = line.slice(colon + 1).trim();
    currentKey = key;
    if (!rawVal || rawVal === "null" || rawVal === "~") { data[key] = null; continue; }
    if (rawVal === "true")  { data[key] = true;  continue; }
    if (rawVal === "false") { data[key] = false; continue; }
    if ((rawVal.startsWith('"') && rawVal.endsWith('"')) || (rawVal.startsWith("'") && rawVal.endsWith("'"))) {
      data[key] = rawVal.slice(1, -1); continue;
    }
    const num = Number(rawVal);
    data[key] = isNaN(num) ? rawVal : num;
  }
  return { data, content: match[2].trim() };
}

// ── PostHog query for hypothesis signals ──────────────────────────────────────

async function queryPostHogHypothesis(hypothesisId, days = 30) {
  const apiKey    = process.env.POSTHOG_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const host      = process.env.POSTHOG_HOST ?? "https://app.posthog.com";

  const base = {
    hypothesis_id: hypothesisId,
    period_days: days,
    fetched_at: new Date().toISOString().slice(0, 10),
  };

  if (!apiKey || !projectId) {
    return { ...base, social_signal_events: 0, source: "no-credentials" };
  }

  try {
    const body = {
      events: [{ id: "hypothesis_social_signal", type: "events" }],
      properties: [{ key: "hypothesis_id", value: hypothesisId, operator: "exact", type: "event" }],
      date_from: `-${days}d`,
      insight: "TRENDS",
      interval: "day",
    };
    const res = await fetch(`${host}/api/projects/${projectId}/insights/trend/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    const json = res.ok ? await res.json() : { result: [] };
    const total = (json.result ?? []).reduce((s, r) => s + (r.count ?? 0), 0);
    return { ...base, social_signal_events: total, source: "live" };
  } catch (err) {
    return { ...base, social_signal_events: 0, error: err.message, source: "error" };
  }
}

// ── Hermes synthesis ──────────────────────────────────────────────────────────

async function callHermesSynthesize(hypothesisData, posthogData) {
  const SYSTEM = `You are Hermes, the evidence synthesizer for Systemix.

Given a hypothesis contract and available PostHog data, synthesize a brief HITL decision card.

Output ONLY a JSON object with exactly these fields — no markdown fences, no explanation:
{
  "summary": "<1-2 sentences describing what the data shows>",
  "recommendation": "promote | iterate | kill",
  "confidence": <float 0.0-1.0>,
  "rationale": "<1 sentence explaining the recommendation>"
}

Rules:
- If PostHog data shows no credentials or zero signals, set confidence below 0.35 and recommend "iterate"
- If evidence is thin, say so explicitly in summary
- Do not invent numbers not present in input data
- Output ONLY the JSON`;

  const userPrompt = `Hypothesis contract:\n${JSON.stringify(hypothesisData, null, 2)}\n\nPostHog data:\n${JSON.stringify(posthogData, null, 2)}\n\nSynthesize now:`;

  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        options: { temperature: 0.1, num_predict: 512 },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user",   content: userPrompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}`);
    const json = await res.json();
    const raw = (json.message?.content ?? "{}").trim();
    // Strip possible markdown fences
    const cleaned = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    return JSON.parse(cleaned);
  } catch (err) {
    return {
      summary: `Hermes unavailable (${err.message}). Review PostHog data manually before deciding.`,
      recommendation: "iterate",
      confidence: 0,
      rationale: "No Hermes synthesis — Ollama not running or model not available.",
    };
  }
}

// ── Queue management ──────────────────────────────────────────────────────────

function readQueue() {
  if (!fs.existsSync(QUEUE_PATH)) return { cards: [] };
  try { return JSON.parse(fs.readFileSync(QUEUE_PATH, "utf8")); }
  catch { return { cards: [] }; }
}

function writeQueue(queue) {
  const dir = path.dirname(QUEUE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = QUEUE_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(queue, null, 2));
  fs.renameSync(tmp, QUEUE_PATH);
}

// ── Write decision back to MDX (shared by both CLI close and queue approval) ──

function writeDecisionToContract(hypothesisId, decision, evidence) {
  const filePath = path.join(HYPOTHESES_DIR, `${hypothesisId}.mdx`);
  if (!fs.existsSync(filePath)) throw new Error(`Contract not found: ${filePath}`);

  const raw = fs.readFileSync(filePath, "utf8");
  const match = raw.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---[\r\n]*([\s\S]*)$/);
  if (!match) throw new Error("Could not parse frontmatter");

  let fm = match[1];
  const body = match[2];
  const now = evidence.fetched_at ?? new Date().toISOString().slice(0, 10);
  const conf = evidence.confidence ?? 0;

  // Update key frontmatter fields in place
  fm = fm.replace(/^result:.*$/m,           `result: "${decision}"`);
  fm = fm.replace(/^decision:.*$/m,         `decision: "${decision}"`);
  fm = fm.replace(/^confidence:.*$/m,       `confidence: ${conf}`);
  fm = fm.replace(/^status:.*$/m,           `status: complete`);
  fm = fm.replace(
    /^evidence-posthog:.*$/m,
    `evidence-posthog:\n  fetched_at: "${now}"\n  source: "${evidence.source ?? "cli"}"\n  confidence: ${conf}`,
  );

  // Replace or append ## Production Evidence section
  const evidenceSection = [
    "",
    "## Production Evidence",
    "",
    evidence.summary ?? "Decision recorded.",
    "",
    `Decision: **${decision}**. Confidence: ${conf > 0 ? Math.round(conf * 100) + "%" : "manual"}. Recorded: ${now}.`,
    "",
  ].join("\n");

  const bodyWithoutEvidence = body.replace(/\n## Production Evidence[\s\S]*$/, "").trimEnd();
  const updated = `---\n${fm}\n---\n\n${bodyWithoutEvidence}\n${evidenceSection}`;

  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, updated, "utf8");
  fs.renameSync(tmp, filePath);
  return filePath;
}

// ── pull subcommand ───────────────────────────────────────────────────────────

async function pull(args) {
  const allFlag      = args.includes("--all");
  const hypoIdx      = args.indexOf("--hypothesis");
  const specificId   = hypoIdx !== -1 ? args[hypoIdx + 1] : null;

  if (!fs.existsSync(HYPOTHESES_DIR)) {
    console.log("\n  No contract/hypotheses/ directory. Run: npx systemix init\n");
    return;
  }

  const files = fs.readdirSync(HYPOTHESES_DIR).filter(f => f.endsWith(".mdx"));
  let targets = specificId ? files.filter(f => f.startsWith(specificId)) : files;

  if (specificId && targets.length === 0) {
    console.log(`\n  No hypothesis matching: ${specificId}\n`);
    return;
  }

  const candidates = targets
    .map(file => {
      const raw = fs.readFileSync(path.join(HYPOTHESES_DIR, file), "utf8");
      const { data } = parseFrontmatter(raw);
      return { file, data };
    })
    .filter(({ data }) => allFlag || data.status === "running");

  if (candidates.length === 0) {
    console.log("\n  No running hypotheses. Start one with /init-experiment\n");
    return;
  }

  console.log(`\n  systemix evidence pull — ${candidates.length} hypothesis${candidates.length !== 1 ? "es" : ""}\n`);

  for (const { file, data } of candidates) {
    const id = data.id ?? file.replace(".mdx", "");
    process.stdout.write(`  ── ${id}\n`);

    process.stdout.write("     querying PostHog... ");
    const posthogData = await queryPostHogHypothesis(id);
    console.log(`${posthogData.source}`);

    process.stdout.write("     calling Hermes...   ");
    const synthesis = await callHermesSynthesize(data, posthogData);
    console.log(`${synthesis.recommendation} (${Math.round((synthesis.confidence ?? 0) * 100)}% confidence)`);

    const card = {
      id:             `evidence-${id}-${Date.now()}`,
      type:           "hypothesis-validation",
      hypothesisId:   id,
      contractPath:   path.join("contract", "hypotheses", file),
      project:        data.section ?? "systemix",
      hypothesis:     typeof data.hypothesis === "string" ? data.hypothesis : id,
      metric:         "conversion",
      baselineRate:   null,
      variantRate:    null,
      confidenceLevel: synthesis.confidence ?? 0,
      sessions:       null,
      context:        synthesis.summary,
      proposal:       `${synthesis.recommendation}: ${synthesis.rationale}`,
      _posthogData:   posthogData,
      requestedAt:    new Date().toISOString(),
      status:         "pending",
    };

    // Deduplicate: replace existing pending card for same hypothesis
    const queue = readQueue();
    queue.cards = (queue.cards ?? []).filter(
      c => !(c.type === "hypothesis-validation" && c.hypothesisId === id && c.status === "pending"),
    );
    queue.cards.push(card);
    writeQueue(queue);

    console.log("     ✓ card written to .systemix/queue.json\n");
  }

  const dashUrl = "http://localhost:3001/design-system";
  console.log(`  Review in dashboard: ${dashUrl}`);
  console.log(`  Or close from CLI:   npx systemix evidence close <id> --decision promote\n`);
}

// ── close subcommand ──────────────────────────────────────────────────────────

async function close(args) {
  const id = args[0];
  if (!id) {
    console.log("\n  Usage: npx systemix evidence close <hypothesis-id> --decision promote|iterate|kill\n");
    return;
  }
  const decisionIdx = args.indexOf("--decision");
  const decision    = decisionIdx !== -1 ? args[decisionIdx + 1] : null;
  if (!decision || !["promote", "iterate", "kill"].includes(decision)) {
    console.log("\n  --decision must be: promote | iterate | kill\n");
    return;
  }

  // Pick up any pending synthesis from the queue
  const queue = readQueue();
  const card  = (queue.cards ?? []).find(
    c => c.type === "hypothesis-validation" && c.hypothesisId === id && c.status === "pending",
  );

  const evidence = card
    ? {
        summary:    card.context,
        confidence: card.confidenceLevel,
        source:     card._posthogData?.source ?? "queue",
        fetched_at: card._posthogData?.fetched_at ?? new Date().toISOString().slice(0, 10),
      }
    : {
        summary:    `Decision: ${decision}. Recorded via CLI without prior synthesis.`,
        confidence: null,
        source:     "cli-manual",
        fetched_at: new Date().toISOString().slice(0, 10),
      };

  console.log(`\n  Closing: ${id}  →  ${decision}\n`);

  const filePath = writeDecisionToContract(id, decision, evidence);
  console.log(`  ✓ Written: ${filePath}`);

  // Fire-and-forget: skill update after confirmed contract write
  skillUpdate.update(id, decision, card ?? {}).catch(() => {});

  if (card) {
    card.status     = "approved";
    card.resolvedAt = new Date().toISOString();
    card.resolution = { action: decision, resolvedBy: "cli" };
    writeQueue(queue);
    console.log("  ✓ Queue card resolved");
  }

  console.log(`\n  Hypothesis closed as: ${decision}\n`);
}

// ── Main export ───────────────────────────────────────────────────────────────

async function evidence(args) {
  const sub  = args[0];
  const rest = args.slice(1);

  switch (sub) {
    case "pull":  return pull(rest);
    case "close": return close(rest);
    default:
      console.log(`
  systemix evidence — evidence loop commands

  Commands:
    evidence pull                        Pull PostHog data + Hermes synthesis for all running hypotheses
    evidence pull --hypothesis <id>      Target a specific hypothesis
    evidence pull --all                  Include completed hypotheses
    evidence close <id> --decision <d>   Close: promote | iterate | kill

  Examples:
    npx systemix evidence pull
    npx systemix evidence pull --hypothesis hero-vp-icp-match-2026-04
    npx systemix evidence close hero-vp-icp-match-2026-04 --decision promote
`);
  }
}

module.exports = { evidence, writeDecisionToContract };
