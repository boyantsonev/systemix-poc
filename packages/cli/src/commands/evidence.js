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

const hermes = require("../hermes-client");
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

// ── PostHog query for landing engagement funnel ───────────────────────────────

const ENGAGEMENT_DIR = path.join(process.cwd(), "contract", "engagement");

async function queryPostHogEngagement(days = 30) {
  const apiKey    = process.env.POSTHOG_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const host      = (process.env.POSTHOG_HOST ?? "https://eu.posthog.com").replace(/\/$/, "");

  const base = {
    surface: "landing",
    period_days: days,
    fetched_at: new Date().toISOString().slice(0, 10),
    unique_visitors: 0,
    pageviews: 0,
    install_copies: 0,
    install_persons: 0,
    install_conversion: null,
    cta_clicks: { hero: 0, nav: 0 },
    sections: [],
  };

  if (!apiKey || !projectId) return { ...base, source: "no-credentials" };

  async function hogql(query) {
    const resp = await fetch(`${host}/api/projects/${projectId}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
    });
    if (!resp.ok) throw new Error(`PostHog query ${resp.status}`);
    return (await resp.json()).results ?? [];
  }

  try {
    const headline = await hogql(`
      SELECT
        countIf(event = '$pageview')                                          AS pageviews,
        count(DISTINCT person_id)                                             AS unique_visitors,
        countIf(event = 'install_command_copied')                            AS install_copies,
        count(DISTINCT if(event = 'install_command_copied', person_id, NULL)) AS install_persons,
        countIf(event = 'hero_cta_click')                                    AS hero_cta,
        countIf(event = 'nav_cta_click')                                     AS nav_cta
      FROM events
      WHERE timestamp >= now() - toIntervalDay(${days})
        AND event IN ('$pageview','install_command_copied','hero_cta_click','nav_cta_click')
    `);
    const sectionRows = await hogql(`
      SELECT properties.section AS section, count() AS views
      FROM events
      WHERE event = 'section_viewed' AND timestamp >= now() - toIntervalDay(${days})
        AND properties.section IS NOT NULL
      GROUP BY section ORDER BY views DESC
    `);

    const [pageviews = 0, unique_visitors = 0, install_copies = 0, install_persons = 0, hero_cta = 0, nav_cta = 0] = headline[0] ?? [];
    return {
      ...base,
      pageviews, unique_visitors, install_copies, install_persons,
      install_conversion: unique_visitors > 0 ? install_persons / unique_visitors : null,
      cta_clicks: { hero: hero_cta, nav: nav_cta },
      sections: sectionRows.map(([section, views]) => ({ section, views })),
      source: "live",
    };
  } catch (err) {
    return { ...base, error: err.message, source: "error" };
  }
}

// Honest, deterministic synthesis of the funnel — no LLM, so it runs in CI.
function synthesizeEngagement(ev) {
  const pct = (n) => `${Math.round((n ?? 0) * 1000) / 10}%`;
  if (ev.source === "no-credentials") {
    return {
      summary: "No PostHog credentials set — nothing to read. Add POSTHOG_API_KEY + POSTHOG_PROJECT_ID.",
      recommendation: "configure-posthog",
      confidence: 0,
    };
  }
  if (ev.source === "error") {
    return { summary: `PostHog query failed: ${ev.error}. Check host/project id.`, recommendation: "retry", confidence: 0 };
  }
  // Data-strength confidence from sample size (not statistical significance).
  const v = ev.unique_visitors;
  const confidence = v >= 1000 ? 0.8 : v >= 100 ? 0.5 : v > 0 ? 0.2 : 0;
  const conv = ev.install_conversion;
  const topSections = ev.sections.slice(0, 3).map((s) => s.section).join(", ") || "none";
  const summary =
    `Over ${ev.period_days}d: ${v} unique visitor${v === 1 ? "" : "s"}, ${ev.pageviews} pageview${ev.pageviews === 1 ? "" : "s"}, ` +
    `${ev.install_persons} ran the install command (${conv == null ? "n/a" : pct(conv)} conversion). ` +
    `CTAs — hero ${ev.cta_clicks.hero}, nav ${ev.cta_clicks.nav}. Top sections: ${topSections}.`;
  const recommendation =
    v === 0 ? "no-traffic-yet"
    : v < 100 ? "keep-collecting (sample below 100 visitors)"
    : conv != null && conv >= 0.05 ? "healthy — consider an A/B on the hero to lift conversion"
    : "low conversion — flag for an experiment";
  return { summary, recommendation, confidence };
}

// Write the structured funnel into the engagement record + append a log entry.
function writeEngagementSnapshot(recordId, ev, synthesis) {
  const filePath = path.join(ENGAGEMENT_DIR, `${recordId}.mdx`);
  if (!fs.existsSync(filePath)) throw new Error(`Engagement record not found: ${filePath}`);
  const raw = fs.readFileSync(filePath, "utf8");
  const match = raw.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---[\r\n]*([\s\S]*)$/);
  if (!match) throw new Error("Could not parse engagement frontmatter");

  let fm = match[1];
  const body = match[2];
  const conv = ev.install_conversion;
  const block = [
    "evidence-posthog:",
    `  fetched_at: "${ev.fetched_at}"`,
    `  source: "${ev.source}"`,
    `  window_days: ${ev.period_days}`,
    `  unique_visitors: ${ev.unique_visitors}`,
    `  pageviews: ${ev.pageviews}`,
    `  install_copies: ${ev.install_copies}`,
    `  install_persons: ${ev.install_persons}`,
    `  install_conversion: ${conv == null ? "null" : Math.round(conv * 10000) / 10000}`,
  ].join("\n");

  fm = fm.replace(/^evidence-posthog:.*(?:\n  .*)*$/m, block);
  fm = fm.replace(/^last-synced:.*$/m, `last-synced: "${ev.fetched_at}"`);

  const entry = [
    "",
    `### ${ev.fetched_at} — synced (${ev.source})`,
    "",
    synthesis.summary,
    "",
    `Signal strength: ${synthesis.confidence > 0 ? Math.round(synthesis.confidence * 100) + "%" : "none"}. Note: ${synthesis.recommendation}.`,
    "",
  ].join("\n");

  // Insert the new entry directly under the "## Engagement Log" heading.
  let newBody;
  if (/##\s*Engagement Log/.test(body)) {
    newBody = body.replace(/(##\s*Engagement Log\s*\n)(?:\n?_No snapshots yet[^\n]*_\n?)?/, `$1${entry}`);
  } else {
    newBody = `${body.trimEnd()}\n\n## Engagement Log\n${entry}`;
  }
  const updated = `---\n${fm}\n---\n\n${newBody.trim()}\n`;
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, updated, "utf8");
  fs.renameSync(tmp, filePath);
  return filePath;
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
    const raw = await hermes.chat(SYSTEM, userPrompt, { temperature: 0.1, maxTokens: 512 });
    if (!raw) throw new Error("No response from LLM");
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

// ── engagement subcommand (standalone landing record) ────────────────────────

function appendEngagementAck(recordId, { action, note, by }) {
  const filePath = path.join(ENGAGEMENT_DIR, `${recordId}.mdx`);
  if (!fs.existsSync(filePath)) throw new Error(`Engagement record not found: ${filePath}`);
  const raw = fs.readFileSync(filePath, "utf8");
  const now = new Date().toISOString().slice(0, 10);
  const line = `- **${now}** ${action}${note ? ` — ${note}` : ""} _(${by})_`;
  const updated = `${raw.trimEnd()}\n${line}\n`;
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, updated, "utf8");
  fs.renameSync(tmp, filePath);
  return filePath;
}

async function engagementPull(args) {
  const recordId = "landing";
  const daysIdx  = args.indexOf("--days");
  const days     = daysIdx !== -1 ? (Number(args[daysIdx + 1]) || 30) : 30;
  const recordRel = path.join("contract", "engagement", `${recordId}.mdx`);

  if (!fs.existsSync(path.join(ENGAGEMENT_DIR, `${recordId}.mdx`))) {
    console.log(`\n  No engagement record at ${recordRel}\n`);
    return;
  }

  console.log(`\n  systemix evidence engagement pull — ${recordId} (${days}d)\n`);
  process.stdout.write("     querying PostHog... ");
  const ev = await queryPostHogEngagement(days);
  console.log(ev.source);

  const synthesis = synthesizeEngagement(ev);
  writeEngagementSnapshot(recordId, ev, synthesis);
  console.log(`     ✓ snapshot written to ${recordRel}`);

  const card = {
    id:              `engagement-${recordId}-${Date.now()}`,
    type:            "engagement-snapshot",
    recordPath:      recordRel,
    surface:         ev.surface,
    hypothesis:      `Landing engagement — ${ev.unique_visitors} visitor${ev.unique_visitors === 1 ? "" : "s"}, ${ev.install_persons} install${ev.install_persons === 1 ? "" : "s"}`,
    metric:          "install conversion",
    baselineRate:    ev.install_conversion,
    variantRate:     null,
    sessions:        ev.unique_visitors,
    confidenceLevel: synthesis.confidence,
    context:         synthesis.summary,
    proposal:        synthesis.recommendation,
    _posthogData:    ev,
    requestedAt:     new Date().toISOString(),
    status:          "pending",
  };

  const queue = readQueue();
  queue.cards = (queue.cards ?? []).filter(
    c => !(c.type === "engagement-snapshot" && c.recordPath === recordRel && c.status === "pending"),
  );
  queue.cards.push(card);
  writeQueue(queue);
  console.log("     ✓ card written to .systemix/queue.json\n");
}

function engagementClose(args) {
  const recordId = args.find(a => !a.startsWith("--")) ?? "landing";
  const noteIdx  = args.indexOf("--note");
  const note     = noteIdx !== -1 ? args[noteIdx + 1] : null;
  const action   = args.includes("--flag") ? "flagged-for-experiment" : "acknowledged";

  if (!fs.existsSync(path.join(ENGAGEMENT_DIR, `${recordId}.mdx`))) {
    console.log(`\n  No engagement record: ${recordId}\n`);
    return;
  }

  appendEngagementAck(recordId, { action, note, by: "cli" });
  const recordRel = path.join("contract", "engagement", `${recordId}.mdx`);

  const queue = readQueue();
  const card  = (queue.cards ?? []).find(
    c => c.type === "engagement-snapshot" && c.recordPath === recordRel && c.status === "pending",
  );
  if (card) {
    card.status     = "approved";
    card.resolvedAt = new Date().toISOString();
    card.resolution = { action, resolvedBy: "cli", note };
    writeQueue(queue);
  }
  console.log(`\n  ✓ Engagement snapshot ${action}: ${recordId}\n`);
}

async function engagement(args) {
  const sub = args[0];
  if (sub === "close") return engagementClose(args.slice(1));
  return engagementPull(sub === "pull" ? args.slice(1) : args);
}

// ── check subcommand — is PostHog wired + collecting? ─────────────────────────

async function check() {
  const apiKey    = process.env.POSTHOG_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const host      = (process.env.POSTHOG_HOST ?? "https://eu.posthog.com").replace(/\/$/, "");
  const mark = (b) => (b ? "✓" : "✗");

  console.log("\n  systemix evidence check\n");
  console.log(`     ${mark(!!apiKey)} POSTHOG_API_KEY       ${apiKey ? "set" : "missing"}`);
  console.log(`     ${mark(!!projectId)} POSTHOG_PROJECT_ID    ${projectId ? `= ${projectId}` : "missing"}`);
  console.log(`     ✓ POSTHOG_HOST         = ${host}`);

  if (!apiKey || !projectId) {
    console.log("\n  Set POSTHOG_API_KEY + POSTHOG_PROJECT_ID — see docs/feature/posthog-loop/setup.md\n");
    return;
  }

  process.stdout.write("\n     pinging PostHog... ");
  try {
    const resp = await fetch(`${host}/api/projects/${projectId}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        query: {
          kind: "HogQLQuery",
          query: "SELECT count() FROM events WHERE event = '$pageview' AND timestamp >= now() - toIntervalDay(1)",
        },
      }),
    });
    if (!resp.ok) {
      console.log(`✗ HTTP ${resp.status}`);
      console.log("\n  Connection failed — check the host, project id, and key.\n");
      return;
    }
    const rows = (await resp.json()).results ?? [];
    const count = rows[0]?.[0] ?? 0;
    console.log("✓ connected");
    console.log(`     ${count > 0 ? "✓" : "·"} ${count} $pageview event(s) in the last 24h`);
    console.log(
      count > 0
        ? "\n  Capture is live. Run: npx systemix evidence engagement pull\n"
        : "\n  Connected, but no pageviews yet — confirm NEXT_PUBLIC_POSTHOG_KEY is set in Vercel and deployed.\n",
    );
  } catch (err) {
    console.log(`✗ ${err.message}\n`);
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

async function evidence(args) {
  const sub  = args[0];
  const rest = args.slice(1);

  switch (sub) {
    case "pull":       return pull(rest);
    case "close":      return close(rest);
    case "engagement": return engagement(rest);
    case "check":      return check();
    default:
      console.log(`
  systemix evidence — evidence loop commands

  Commands:
    evidence pull                        Pull PostHog data + Hermes synthesis for all running hypotheses
    evidence pull --hypothesis <id>      Target a specific hypothesis
    evidence pull --all                  Include completed hypotheses
    evidence close <id> --decision <d>   Close: promote | iterate | kill
    evidence engagement pull [--days N]  Sync landing funnel → engagement record + HITL card
    evidence engagement close [--flag]   Acknowledge (or --flag for experiment) the latest snapshot
    evidence check                       Verify PostHog creds + whether events are arriving

  Examples:
    npx systemix evidence pull
    npx systemix evidence engagement pull --days 30
    npx systemix evidence engagement close --note "conversion healthy"
`);
  }
}

module.exports = {
  evidence,
  writeDecisionToContract,
  queryPostHogEngagement,
  synthesizeEngagement,
  writeEngagementSnapshot,
  appendEngagementAck,
};
