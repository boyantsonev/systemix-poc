"use strict";

// npx @getsystemix/cli evidence pull [--hypothesis <id>] [--all]
// npx @getsystemix/cli evidence close <id> --decision promote|iterate|kill

const skillUpdate = require("./skill-update");
//
// Promotes the spike-3 PostHog feedback loop to a CLI command.
// Pull: reads running hypothesis contracts → queries PostHog → Hermes synthesizes → writes to .systemix/queue.json
// Close: writes the decision + evidence back to the MDX contract directly (same as dashboard approve)

const fs = require("fs");
const path = require("path");
const { fetchPosthogEvidence } = require("../lib/loop");
const { assertExperimentId, isValidExperimentId, EXPERIMENT_ID_RE } = require("../lib/experiments");

const QUEUE_PATH = path.join(process.cwd(), ".systemix", "queue.json");
const EXPERIMENTS_DIR = path.join(process.cwd(), "experiments");

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
  assertExperimentId(hypothesisId);
  const filePath = path.join(EXPERIMENTS_DIR, `${hypothesisId}.mdx`);
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

// ── experiment evidence (the loop's evidence half) ────────────────────────────
// Deterministic — no LLM, so it runs in CI. Mirrors the engagement path but
// targets experiments/ and the `experiment-validation` card the dashboard +
// queue write-back already understand.

const EVENT_RE = /^[a-zA-Z0-9_$]+$/; // PostHog event-name whitelist (guards the HogQL interp)

async function queryPostHogExperiment(event, days = 30) {
  const apiKey    = process.env.POSTHOG_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const host      = (process.env.POSTHOG_HOST ?? "https://eu.posthog.com").replace(/\/$/, "");

  const base = {
    event,
    period_days: days,
    fetched_at: new Date().toISOString().slice(0, 10),
    visitors: 0,
    event_count: 0,
    event_persons: 0,
    rate: null,
  };

  if (!apiKey || !projectId) return { ...base, source: "no-credentials" };
  if (!EVENT_RE.test(event))  return { ...base, source: "invalid-event" };

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
    const rows = await hogql(`
      SELECT
        count(DISTINCT if(event = '$pageview', person_id, NULL)) AS visitors,
        countIf(event = '${event}')                              AS event_count,
        count(DISTINCT if(event = '${event}', person_id, NULL))  AS event_persons
      FROM events
      WHERE timestamp >= now() - toIntervalDay(${Number(days)})
        AND event IN ('$pageview','${event}')
    `);
    const [visitors = 0, event_count = 0, event_persons = 0] = rows[0] ?? [];

    // Per-variant counts — the CANONICAL evidence shape the loop runner
    // evaluates (`variants` is the load-bearing key; lib/loop.js treats a
    // snapshot without it as stale and re-pulls, so without this merge the two
    // daily crons overwrite each other's evidence-posthog block all day).
    const arm = await fetchPosthogEvidence({ event, days });
    const withVariants = arm && arm.wired !== false && !arm.error && arm.variants;

    return {
      ...base,
      visitors, event_count, event_persons,
      rate: visitors > 0 ? event_persons / visitors : null,
      ...(withVariants
        ? {
            variants: arm.variants,
            samples: Object.values(arm.variants).reduce((s, n) => s + (Number(n) || 0), 0),
            ...(arm.prev_total != null ? { prev_total: arm.prev_total } : {}),
          }
        : {}),
      source: "live",
    };
  } catch (err) {
    return { ...base, error: err.message, source: "error" };
  }
}

// Honest, deterministic synthesis — confidence is data-strength (sample size),
// NOT statistical significance. No LLM.
function synthesizeExperiment(ev, meta = {}) {
  const pct = (n) => `${Math.round((n ?? 0) * 1000) / 10}%`;
  if (ev.source === "no-credentials") {
    return { summary: "No PostHog credentials set — nothing to read. Add POSTHOG_API_KEY + POSTHOG_PROJECT_ID.", recommendation: "configure-posthog", confidence: 0 };
  }
  if (ev.source === "invalid-event") {
    return { summary: `Event \`${ev.event}\` is not a valid PostHog event name — fix \`posthog-event\` in the contract.`, recommendation: "fix-event", confidence: 0 };
  }
  if (ev.source === "error") {
    return { summary: `PostHog query failed: ${ev.error}. Check host/project id.`, recommendation: "retry", confidence: 0 };
  }
  const v = ev.visitors;
  const confidence = v >= 1000 ? 0.8 : v >= 100 ? 0.5 : v > 0 ? 0.2 : 0;
  const metric = meta.metric ?? "conversion";
  const summary =
    `Over ${ev.period_days}d: ${v} visitor${v === 1 ? "" : "s"}, ` +
    `${ev.event_persons} fired \`${ev.event}\` (${ev.rate == null ? "n/a" : pct(ev.rate)} on ${metric}).`;
  const recommendation =
    v === 0 ? "no-traffic-yet — keep running"
    : v < 100 ? "keep-collecting (sample below 100 visitors)"
    : ev.event_persons === 0 ? "no conversions yet — the hook isn't converting; consider iterate or kill"
    : "signal forming — run to ~1k visitors before deciding";
  return { summary, recommendation, confidence };
}

// Write the funnel into the experiment's `evidence-posthog` frontmatter block.
// Byte-compatible with the app close-writer's ^evidence-posthog:...$ regex
// (src/lib/contract/experiment-mdx.ts) so a later close collapses it cleanly.
function writeExperimentSnapshot(id, ev) {
  assertExperimentId(id);
  const filePath = path.join(EXPERIMENTS_DIR, `${id}.mdx`);
  if (!fs.existsSync(filePath)) throw new Error(`Experiment not found: ${filePath}`);
  const raw = fs.readFileSync(filePath, "utf8");
  const match = raw.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---[\r\n]*([\s\S]*)$/);
  if (!match) throw new Error("Could not parse experiment frontmatter");

  let fm = match[1];
  const body = match[2];
  // Canonical shape (shared with lib/loop.js): variants is the load-bearing
  // key — the runner trusts a today-dated snapshot iff it carries one.
  const block = [
    "evidence-posthog:",
    `  fetched_at: "${ev.fetched_at}"`,
    `  source: "${ev.source}"`,
    `  window_days: ${ev.period_days}`,
    `  event: "${ev.event}"`,
    ...(ev.variants
      ? [
          `  samples: ${ev.samples ?? Object.values(ev.variants).reduce((s, n) => s + (Number(n) || 0), 0)}`,
          ...(Object.keys(ev.variants).length
            ? ["  variants:", ...Object.entries(ev.variants).map(([k, n]) => `    ${k}: ${Number(n) || 0}`)]
            : ["  variants: {}"]),
          ...(ev.prev_total != null ? [`  prev_total: ${ev.prev_total}`] : []),
        ]
      : []),
    `  visitors: ${ev.visitors}`,
    `  event_count: ${ev.event_count}`,
    `  event_persons: ${ev.event_persons}`,
    `  rate: ${ev.rate == null ? "null" : Math.round(ev.rate * 10000) / 10000}`,
  ].join("\n");

  if (/^evidence-posthog:.*(?:\n {2}.*)*$/m.test(fm)) {
    fm = fm.replace(/^evidence-posthog:.*(?:\n {2}.*)*$/m, block);
  } else {
    fm = `${fm.trimEnd()}\n${block}`;
  }
  const updated = `---\n${fm}\n---\n\n${body.trim()}\n`;
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, updated, "utf8");
  fs.renameSync(tmp, filePath);
  return filePath;
}

async function experimentPull(args) {
  const daysIdx    = args.indexOf("--days");
  const days       = daysIdx !== -1 ? (Number(args[daysIdx + 1]) || 30) : 30;
  const idIdx      = args.indexOf("--experiment");
  const specificId = idIdx !== -1 ? args[idIdx + 1] : null;
  const allFlag    = args.includes("--all");

  if (!fs.existsSync(EXPERIMENTS_DIR)) {
    console.log("\n  No experiments/ directory. Run: npx @getsystemix/cli init\n");
    return;
  }

  const files = fs.readdirSync(EXPERIMENTS_DIR).filter(f => f.endsWith(".mdx") && !f.startsWith("_"));
  const candidates = files
    .map(file => {
      const { data } = parseFrontmatter(fs.readFileSync(path.join(EXPERIMENTS_DIR, file), "utf8"));
      return { file, id: data.id ?? file.replace(/\.mdx$/, ""), data };
    })
    .filter(({ id, data }) =>
      specificId
        ? id === specificId || id.startsWith(specificId)
        : (allFlag || data.status === "running") && data["posthog-event"],
    );

  if (candidates.length === 0) {
    console.log("\n  No running experiments with a wired posthog-event. Wire one with /measure (or /connect-signal first).\n");
    return;
  }

  console.log(`\n  systemix evidence experiment pull — ${candidates.length} experiment${candidates.length !== 1 ? "s" : ""} (${days}d)\n`);

  for (const { id, data } of candidates) {
    // id comes from frontmatter — skip (like the runner's skipped:invalid-id)
    // before it reaches a file path or a queue card.
    if (!isValidExperimentId(id)) {
      console.log(`  ── skipped:invalid-id — ${JSON.stringify(id)} is not a valid experiment id`);
      continue;
    }
    const event = String(data["posthog-event"]);
    process.stdout.write(`  ── ${id} · ${event}\n`);
    process.stdout.write("     querying PostHog... ");
    const ev = await queryPostHogExperiment(event, days);
    console.log(ev.source);

    const synth = synthesizeExperiment(ev, { metric: data.metric });

    // Only write the snapshot on live data; otherwise still queue an honest card
    // so the operator sees WHY there's no evidence (no creds / bad event / error).
    if (ev.source === "live") {
      writeExperimentSnapshot(id, ev);
      console.log(`     ✓ snapshot → experiments/${id}.mdx`);
    }

    const card = {
      id:              `evidence-${id}-${Date.now()}`,
      type:            "experiment-validation",
      project:         "systemix",
      experimentId:    id,
      hypothesis:      typeof data.hypothesis === "string" ? data.hypothesis : id,
      metric:          data.metric ?? "conversion",
      baselineRate:    ev.rate,
      variantRate:     null,
      sessions:        ev.visitors,
      confidenceLevel: synth.confidence,
      context:         synth.summary,
      proposal:        synth.recommendation,
      _posthogData:    ev,
      requestedAt:     new Date().toISOString(),
      status:          "pending",
    };

    const queue = readQueue();
    queue.cards = (queue.cards ?? []).filter(
      c => !(c.type === "experiment-validation" && c.experimentId === id && c.status === "pending"),
    );
    queue.cards.push(card);
    writeQueue(queue);
    console.log("     ✓ card → .systemix/queue.json\n");
  }

  console.log("  Review + decide on Home (/config), or:  npx @getsystemix/cli evidence close <id> --decision promote\n");
}

// `evidence pull` is the deterministic experiment path. (It was an Ollama-based
// hypothesis synth — retired per ADR-019: engine = Claude Code, no local model.)
async function pull(args) {
  return experimentPull(args);
}

// `evidence experiment <sub>` — the loop's evidence half.
async function experiment(args) {
  const sub = args[0];
  if (sub === "pull" || sub === undefined) return experimentPull(args.slice(1));
  console.log(`\n  Unknown: evidence experiment ${sub}\n  Usage: systemix evidence experiment pull [--days N] [--experiment <id>] [--all]\n`);
}

// ── close subcommand ──────────────────────────────────────────────────────────

async function close(args) {
  const id = args[0];
  if (!id) {
    console.log("\n  Usage: npx @getsystemix/cli evidence close <experiment-id> --decision promote|iterate|kill\n");
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
    c => c.type === "experiment-validation" && c.experimentId === id && c.status === "pending",
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

// A record id becomes a file name (contract/engagement/<id>.mdx), so it follows
// the same path-safe kebab-case rule as experiment ids — no path separators,
// no "..", nothing that resolves outside contract/engagement/.
function assertEngagementRecordId(recordId) {
  if (recordId == null || recordId === "") throw new Error("an engagement record id is required");
  if (typeof recordId !== "string" || !EXPERIMENT_ID_RE.test(recordId)) {
    throw new Error(
      `invalid engagement record id ${JSON.stringify(recordId)} — use lowercase letters, digits and hyphens, ` +
        "starting with a letter or digit (max 81 characters), e.g. landing"
    );
  }
}

function appendEngagementAck(recordId, { action, note, by }) {
  assertEngagementRecordId(recordId);
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
  assertEngagementRecordId(recordId); // before any path is built from it
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
        ? "\n  Capture is live. Run: npx @getsystemix/cli evidence engagement pull\n"
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
    case "experiment": return experiment(rest);
    case "close":      return close(rest);
    case "engagement": return engagement(rest);
    case "check":      return check();
    default:
      console.log(`
  systemix evidence — evidence loop commands

  Commands:
    evidence experiment pull [--days N]  Pull PostHog evidence for running experiments → HITL card
    evidence experiment pull --experiment <id>   Target one experiment
    evidence pull                        Alias of: evidence experiment pull
    evidence close <id> --decision <d>   Close: promote | iterate | kill
    evidence engagement pull [--days N]  Sync landing funnel → engagement record + HITL card
    evidence engagement close [--flag]   Acknowledge (or --flag for experiment) the latest snapshot
    evidence check                       Verify PostHog creds + whether events are arriving

  Examples:
    npx @getsystemix/cli evidence experiment pull --days 30
    npx @getsystemix/cli evidence engagement pull --days 30
    npx @getsystemix/cli evidence close landing-live-loop-2026-06 --decision promote
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
  queryPostHogExperiment,
  synthesizeExperiment,
  writeExperimentSnapshot,
  experimentPull,
};
