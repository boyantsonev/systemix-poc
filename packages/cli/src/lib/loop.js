"use strict";

// The Ralph runner — `systemix loop [<id>]`. Drives a running experiment toward
// decision-ready, one stage per iteration, and NEVER closes it (closing is
// judgment — always HITL, at every autonomy tier).
//
// Ralph properties, applied honestly:
//   · every iteration re-reads experiments/<id>.mdx from disk (fresh context —
//     the state lives in files, never in the loop's head)
//   · each iteration performs exactly ONE action, then writes back and re-enters
//   · explicit, verifiable stop states (below) + a max-iteration safety cap
//   · the stopping condition for success is decision-ready: a close-proposal
//     card in .systemix/queue.json for a human — the runner proposes, you decide.
//
// Stops:
//   skipped:not-found               experiments/<id>.mdx missing — warn, change nothing
//   already-complete                status is not running
//   blocked:not-measured            no posthog-event — /measure wires it (code + skill)
//   blocked:not-wired               PostHog creds missing — /connect-signal
//   blocked:posthog-error           query failed — check host / project id
//   waiting:insufficient-evidence   signal too weak to propose — loop again later
//   decision-ready                  close-proposal queued (or already pending)
//   max-iterations                  safety cap hit

const fs = require("fs");
const layout = require("./layout");
const exp = require("./experiments");

const DEFAULT_THRESHOLDS = { high: 0.85, medium: 0.55 };
const isoDay = (d) => d.toISOString().slice(0, 10);

// ── Evidence fetch (injectable seam; default = PostHog HogQL) ────────────────
// Same env + endpoint conventions as `systemix evidence` (POSTHOG_API_KEY,
// POSTHOG_PROJECT_ID, POSTHOG_HOST). Returns per-variant event counts.

async function fetchPosthogEvidence({ event, days }) {
  const apiKey = process.env.POSTHOG_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const host = (process.env.POSTHOG_HOST ?? "https://eu.posthog.com").replace(/\/$/, "");
  if (!apiKey || !projectId) return { wired: false };

  const safeEvent = String(event).replace(/'/g, "\\'");
  const n = Number(days);
  const hogql = async (query) => {
    const resp = await fetch(`${host}/api/projects/${projectId}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
    });
    if (!resp.ok) throw new Error(`PostHog query ${resp.status}`);
    return (await resp.json()).results ?? [];
  };

  try {
    const rows = await hogql(
      `SELECT coalesce(nullIf(toString(properties.variant), ''), 'control') AS variant, count() AS n ` +
        `FROM events WHERE event = '${safeEvent}' AND timestamp >= now() - toIntervalDay(${n}) ` +
        `GROUP BY variant`,
    );
    const variants = {};
    for (const [variant, count] of rows) variants[String(variant)] = Number(count) || 0;

    // Single-arm (no A/B split live): the baseline is the PRIOR window — the
    // experiment's conclusion is "the rate lifts", not "variant beats control".
    let prev_total;
    if (Object.keys(variants).length <= 1) {
      const prev = await hogql(
        `SELECT count() AS n FROM events WHERE event = '${safeEvent}' ` +
          `AND timestamp >= now() - toIntervalDay(${2 * n}) AND timestamp < now() - toIntervalDay(${n})`,
      );
      prev_total = Number(prev[0]?.[0]) || 0;
    }
    return { wired: true, variants, ...(prev_total != null ? { prev_total } : {}), source: "live" };
  } catch (err) {
    return { wired: true, error: err.message };
  }
}

// ── Evaluate — the close-experiment skill's rubric, config thresholds gate ───
// Band by |lift| + samples (≥20% & ≥100 → high 0.85 · ≥5% → medium 0.6 · else
// low 0.3); sign picks the decision (high+up promote · high+down kill · medium
// iterate). Decision-ready iff confidence ≥ thresholds.medium.

function evaluateEvidence(evidence, thresholds = DEFAULT_THRESHOLDS) {
  const variants = evidence?.variants ?? {};
  const names = Object.keys(variants);
  const total = names.reduce((s, n) => s + (Number(variants[n]) || 0), 0);

  let best;
  let samples;
  let liftPct;
  let baseline;

  if (names.length <= 1) {
    // Single-arm: no live A/B split — measure the rate against the PRIOR window.
    const prev = Number(evidence?.prev_total);
    if (!Number.isFinite(prev) || prev <= 0) {
      return { ready: false, samples: total, confidence: 0.3, reason: "no prior-window baseline yet (single-arm experiment)" };
    }
    baseline = "prior-window";
    best = names[0] ?? "current";
    samples = total + prev;
    liftPct = ((total - prev) / prev) * 100;
  } else {
    baseline = "control";
    const control = Number(variants.control ?? 0);
    const others = names.filter((n) => n !== "control");
    best = others.length
      ? others.reduce((a, b) => (Number(variants[b]) > Number(variants[a]) ? b : a))
      : null;
    samples = total;
    liftPct = best != null && control > 0 ? ((Number(variants[best]) - control) / control) * 100 : null;
  }

  if (liftPct == null) {
    return { ready: false, samples, liftPct, confidence: 0.3, reason: "lift not computable (no control baseline or no variant)" };
  }

  const abs = Math.abs(liftPct);
  const confidence = abs >= 20 && samples >= 100 ? 0.85 : abs >= 5 ? 0.6 : 0.3;
  const decision = confidence >= 0.85 ? (liftPct > 0 ? "promote" : "kill") : "iterate";
  const ready = confidence >= (thresholds.medium ?? DEFAULT_THRESHOLDS.medium);

  return {
    ready,
    decision,
    confidence,
    samples,
    liftPct: Math.round(liftPct * 10) / 10,
    best,
    baseline,
    reason: ready ? undefined : `confidence ${confidence} below the ${thresholds.medium} gate (lift ${Math.round(liftPct * 10) / 10}%, n=${samples})`,
  };
}

// ── Queue: the HITL close-proposal card (dedupe on pending) ──────────────────

function pushCloseProposal(root, { id, verdict, days, now }) {
  const file = layout.abs(root).queue;
  let queue = { cards: [] };
  if (fs.existsSync(file)) {
    try { queue = JSON.parse(fs.readFileSync(file, "utf8")); } catch { /* keep default */ }
  }
  if (!Array.isArray(queue.cards)) queue.cards = [];

  const pending = queue.cards.find(
    (c) => c.type === "close-proposal" && c.experimentId === id && c.status === "pending",
  );
  if (pending) return { card: pending, deduped: true };

  const card = {
    id: `close-proposal-${id}-${now.getTime()}`,
    type: "close-proposal",
    experimentId: id,
    recommendedDecision: verdict.decision,
    confidence: verdict.confidence,
    summary:
      `${verdict.best ?? "variant"} vs ${verdict.baseline === "prior-window" ? `the prior ${days}d` : "control"}: ` +
      `lift ${verdict.liftPct}% over ${days}d (n=${verdict.samples}). ` +
      `Recommended: ${verdict.decision}. Close it with /close-experiment ${id} — the runner never closes.`,
    proposedBy: "loop-runner",
    status: "pending",
    requestedAt: now.toISOString(),
  };
  queue.cards.push(card);
  fs.mkdirSync(require("path").dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(queue, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, file);
  return { card, deduped: false };
}

// ── One Ralph pass over one experiment ───────────────────────────────────────

async function runLoop(root, id, opts = {}) {
  const {
    maxIterations = 5,
    days = 30,
    now = new Date(),
    thresholds = DEFAULT_THRESHOLDS,
    fetchEvidence = fetchPosthogEvidence,
    log = () => {},
  } = opts;

  const iterations = [];
  const stop = (state, note) => {
    log(`  ⏹  ${state}${note ? ` — ${note}` : ""}`);
    return { id, stop: state, note, iterations };
  };

  // A missing file is a skip, not a crash — a scheduled sweep must not die on
  // a stale id (bad arg, renamed experiment, stale queue reference). An id that
  // can't be an experiment file name (e.g. "../x") is skipped before any path
  // is resolved from it.
  if (!exp.isValidExperimentId(id)) {
    return stop("skipped:invalid-id", `${JSON.stringify(id)} is not a valid experiment id — nothing changed`);
  }
  if (!fs.existsSync(layout.abs(root).experimentFile(id))) {
    return stop("skipped:not-found", `${layout.rel.experimentFile(id)} does not exist — nothing changed`);
  }

  for (let i = 1; i <= maxIterations; i++) {
    // Ralph: fresh context every pass — re-read the file, carry nothing over.
    const { file, data, content } = exp.getExperiment(root, id);
    const today = isoDay(now);

    if (String(data.status) !== "running") {
      iterations.push({ i, stage: "status", action: "none" });
      return stop("already-complete", `status: ${data.status}`);
    }

    const event = data["posthog-event"];
    if (!event) {
      iterations.push({ i, stage: "measured?", action: "none" });
      return stop("blocked:not-measured", "no posthog-event — run /measure");
    }

    const evidence = data["evidence-posthog"];
    // Fresh means fresh IN THE RUNNER'S SHAPE (per-variant counts). The other
    // evidence writer — `systemix evidence experiment pull` — snapshots a
    // visitors/rate funnel with no `variants`; treating that as fresh would
    // park the runner on waiting forever. Shape mismatch → re-pull ours.
    const fresh =
      evidence && typeof evidence === "object" && evidence.fetched_at === today &&
      evidence.variants && typeof evidence.variants === "object";

    if (!fresh) {
      // ONE action this iteration: pull evidence, write it back, re-enter.
      const pulled = await fetchEvidence({ event, days, id });
      if (!pulled || pulled.wired === false) {
        iterations.push({ i, stage: "evidence", action: "pull" });
        return stop("blocked:not-wired", "PostHog creds missing — /connect-signal");
      }
      if (pulled.error) {
        iterations.push({ i, stage: "evidence", action: "pull" });
        return stop("blocked:posthog-error", pulled.error);
      }
      data["evidence-posthog"] = {
        fetched_at: today,
        window_days: days,
        source: pulled.source ?? "live",
        event,
        samples: Object.values(pulled.variants ?? {}).reduce((s, n) => s + (Number(n) || 0), 0),
        variants: pulled.variants ?? {},
        ...(pulled.prev_total != null ? { prev_total: pulled.prev_total } : {}),
      };
      fs.writeFileSync(file, exp.stringifyMdx(content, data), "utf8");
      iterations.push({ i, stage: "evidence", action: "pull+write" });
      log(`  [${i}] evidence pulled (${data["evidence-posthog"].samples} events / ${days}d) → ${layout.rel.experimentFile(id)}`);
      continue;
    }

    // Evidence is fresh — evaluate it against the dial's thresholds.
    const verdict = evaluateEvidence(evidence, thresholds);
    if (!verdict.ready) {
      iterations.push({ i, stage: "evaluate", action: "none" });
      return stop("waiting:insufficient-evidence", verdict.reason);
    }

    const { card, deduped } = pushCloseProposal(root, { id, verdict, days, now });
    iterations.push({ i, stage: "evaluate", action: deduped ? "card-already-pending" : "queue-card" });
    log(`  [${i}] ${deduped ? "close-proposal already pending" : "close-proposal queued"}: ${card.id}`);
    return stop("decision-ready", `${verdict.decision} @ ${verdict.confidence} — a human closes it (HITL)`);
  }

  return stop("max-iterations", `cap ${maxIterations} hit`);
}

/** Sweep every running experiment — one Ralph pass each (what the cron calls). */
async function sweepLoop(root, opts = {}) {
  const running = exp.listExperiments(root, { status: "running" });
  const results = [];
  for (const e of running) results.push(await runLoop(root, e.id, opts));
  return results;
}

module.exports = { runLoop, sweepLoop, evaluateEvidence, fetchPosthogEvidence, DEFAULT_THRESHOLDS };
