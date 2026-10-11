"use strict";

// `systemix loop [<id>]` — the Ralph runner CLI door. One pass advances a
// running experiment toward decision-ready (evidence → evaluate → HITL card);
// no id sweeps every running experiment (the cron entrypoint). Never closes.

const { loadConfig } = require("../config");
const { runLoop, sweepLoop, DEFAULT_THRESHOLDS } = require("../lib/loop");

const LOOP_HELP = `
  systemix loop — Ralph-drive running experiments to decision-ready (HITL at close)

  Usage:
    systemix loop <id> [--days <n>] [--max-iterations <n>]   One experiment
    systemix loop [--days <n>]                               Sweep all running (cron mode)

  Each iteration re-reads the experiment file (fresh context), does ONE action
  (pull evidence → evaluate → queue a close-proposal card), and stops on an
  explicit state. The runner never closes an experiment — a human does, via
  /close-experiment or \`systemix experiment close\`.
`;

// Flags whose next arg is a value, not the positional <id> (the cron calls
// `loop --days 30` — "30" must not be read as an experiment id).
const VALUE_FLAGS = new Set(["--days", "--max-iterations"]);

const NEXT_HINT = {
  "decision-ready": (id) => `review the card, then: /close-experiment ${id}`,
  "skipped:not-found": () => "check the id — `systemix experiment list` shows what exists",
  "skipped:invalid-id": () => "ids are kebab-case (e.g. landing-hero-2026-07) — rename the experiment file to match",
  "blocked:not-measured": (id) => `run /measure ${id} to wire the posthog-event`,
  "blocked:not-wired": () => "run /connect-signal (or set POSTHOG_API_KEY + POSTHOG_PROJECT_ID)",
  "blocked:posthog-error": () => "check POSTHOG_HOST / POSTHOG_PROJECT_ID",
  "waiting:insufficient-evidence": () => "loop again after more traffic (the daily cron re-runs this)",
  "already-complete": () => null,
  "max-iterations": () => "re-run to continue (safety cap)",
};

function num(args, flag, fallback) {
  const i = args.indexOf(flag);
  const v = i !== -1 ? Number(args[i + 1]) : NaN;
  return Number.isFinite(v) ? v : fallback;
}

async function loop(args = [], opts = {}) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(LOOP_HELP);
    return;
  }
  const root = opts.projectRoot ?? process.cwd();
  const id = args.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(args[i - 1]));
  const days = num(args, "--days", 30);
  const maxIterations = num(args, "--max-iterations", 5);

  // Thresholds come from the instance dial (systemix.config.yaml); defaults when absent.
  let thresholds = DEFAULT_THRESHOLDS;
  try {
    thresholds = loadConfig(root)?.hermes?.thresholds ?? DEFAULT_THRESHOLDS;
  } catch { /* uninitialised repo — run with defaults */ }

  const runOpts = {
    days,
    maxIterations,
    thresholds,
    log: (m) => console.log(m),
    // test seams
    ...(opts.fetchEvidence ? { fetchEvidence: opts.fetchEvidence } : {}),
    ...(opts.now ? { now: opts.now } : {}),
  };

  const report = (r) => {
    const hint = NEXT_HINT[r.stop]?.(r.id);
    if (hint) console.log(`     next: ${hint}`);
  };

  if (id) {
    console.log(`\n  systemix loop — ${id} (${days}d window)\n`);
    report(await runLoop(root, id, runOpts));
  } else {
    const results = await sweepLoop(root, runOpts);
    if (results.length) {
      console.log(`\n  systemix loop — swept ${results.length} running experiment${results.length === 1 ? "" : "s"}\n`);
      for (const r of results) {
        console.log(`  ${r.id}: ${r.stop}${r.note ? ` — ${r.note}` : ""}`);
        report(r);
      }
    } else {
      // Proposing the NEXT experiment is the engine's generate stage
      // (`systemix propose` / the weekly cron), not the daily loop runner.
      console.log("\n  systemix loop — no running experiments (run `systemix propose` to draft the next one)\n");
    }
  }
  console.log("");
}

module.exports = { loop, LOOP_HELP };
