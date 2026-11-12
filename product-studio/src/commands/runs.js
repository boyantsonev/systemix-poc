"use strict";

/**
 * runs: the run log in studio/.state/runs.jsonl (append-only).
 *
 *   runs log --json - | --row '<json>'         validate one row, privacy-lint it, append it → {ok, run}
 *   runs rate <run-id|last> up|down|skip ["note"]   append a rating row for that run (skip: asked, not rated)
 *   runs list [--since d] [--command c] [--kind k]   the rows, ratings merged onto the runs they rate
 *   runs should-ask                             whether to ask for a rating now → {ask, why}
 */

const { parseArgs, last, problems } = require("../lib/args");
const runlog = require("../lib/runlog");
const { rel: L } = require("../lib/layout");

const USAGE = `
  Usage: runs <log|rate|list|should-ask> [--root <dir>] [--json]

    log         read one row from stdin (runs log --json -) or --row '<json>'; fill run, at and
                studio_version; validate it (unknown fields are refused) and privacy-lint note,
                args, false_positives[].why and sources; append it. Nothing is appended on a problem.
    rate        runs rate <run-id|last> up|down|skip ["note"]: append a rating row for that run;
                skip records that the person was asked and passed.
    list        the rows (--since YYYY-MM-DD, --command c, --kind k), each run with its rating merged on.
    should-ask  the rating-frequency rule: ask after an error, a fail or a dropped false positive
                that has no rating yet; otherwise at most once a calendar day.
`;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function logRow(parsed, ctx, json) {
  const given = last(parsed, "--row");
  const fromStdin = parsed.positional.includes("-");
  if (given === undefined && !fromStdin) return ctx.usage("give the row on stdin (runs log --json -) or with --row '<json>'", USAGE);
  const text = given !== undefined ? given : ctx.stdin();
  let row;
  try {
    row = JSON.parse(text);
  } catch {
    const out = { ok: false, problems: ["not valid JSON: give exactly one JSON object"] };
    if (json) ctx.json(out);
    return ctx.fail(out.problems[0]);
  }
  const r = runlog.append(ctx.root, row, ctx.now);
  if (!r.ok) {
    if (json) ctx.json({ ok: false, problems: r.problems });
    else r.problems.forEach((p) => ctx.err(`  ✗ ${p}`));
    return ctx.fail(`the run log refused this row (${r.problems.length} problem${r.problems.length === 1 ? "" : "s"}); nothing was appended`);
  }
  if (json) ctx.json({ ok: true, run: r.run });
  else ctx.out(`  Logged ${r.run}.`);
  return 0;
}

function rate(parsed, ctx, json) {
  const [target, given, ...noteParts] = parsed.positional;
  if (!target || !["up", "down", "skip"].includes(given)) return ctx.usage("runs rate <run-id|last> up|down|skip [\"note\"]", USAGE);
  // a skip is recorded as rating "none", so should-ask doesn't ask about that run again
  const rating = given === "skip" ? "none" : given;
  const { rows } = runlog.read(ctx.root);
  const run = target === "last" ? runlog.lastRun(rows) : rows.find((r) => r.run === target && r.kind !== "rating");
  if (!run) {
    if (json) ctx.json({ ok: false, error: "no-such-run", run: target });
    return ctx.fail(target === "last" ? `no run to rate yet in ${L.runs}` : `no run ${target} in ${L.runs}`);
  }
  const row = {
    kind: "rating",
    command: run.command,
    args: run.args,
    surface: run.surface ?? null,
    depth: run.depth ?? null,
    goal: run.goal ?? null,
    result: run.result,
    blocks: run.blocks,
    flags: run.flags,
    false_positives: [],
    sources: [],
    files_written: [],
    duration_s: null,
    rating,
    note: noteParts.join(" "),
    ref: run.run,
  };
  const r = runlog.append(ctx.root, row, ctx.now);
  if (!r.ok) {
    if (json) ctx.json({ ok: false, problems: r.problems });
    else r.problems.forEach((p) => ctx.err(`  ✗ ${p}`));
    return ctx.fail("the rating was refused; nothing was appended");
  }
  if (json) ctx.json({ ok: true, run: r.run, ref: run.run, rating });
  else ctx.out(`  Rated ${run.run} (${run.command}) ${rating}.`);
  return 0;
}

function list(parsed, ctx, json) {
  const since = last(parsed, "--since", null);
  if (since !== null && !DATE.test(since)) return ctx.usage("--since takes a date, YYYY-MM-DD", USAGE);
  const command = last(parsed, "--command", null);
  const kind = last(parsed, "--kind", null);
  if (kind !== null && !runlog.KINDS.includes(kind)) return ctx.usage(`--kind is one of ${runlog.KINDS.join(", ")}`, USAGE);
  const { rows: all, problems: bad } = runlog.read(ctx.root);
  const base = kind === "rating" ? all.filter((r) => r.kind === "rating").sort(runlog.byTime).map((r) => ({ ...r })) : runlog.merged(all);
  const rows = base.filter((r) => (!since || r.at.slice(0, 10) >= since) && (!command || r.command === command) && (!kind || r.kind === kind));
  if (json) ctx.json({ total: rows.length, rows, ...(bad.length ? { skipped: bad.length } : {}) });
  else {
    if (!rows.length) ctx.out(`  No rows${since ? ` since ${since}` : ""} in ${L.runs}.`);
    for (const r of rows) ctx.out(`  ${r.run}  ${r.at.slice(0, 10)}  ${r.command.padEnd(5)}  ${r.result.padEnd(15)}  blocks ${r.blocks}  flags ${r.flags}  ${r.rating}`);
    if (bad.length) ctx.out(`  (${bad.length} unreadable line${bad.length === 1 ? "" : "s"} skipped)`);
  }
  return 0;
}

/** The rating-frequency rule (SPEC.md § runs). */
function shouldAsk(rows, today) {
  const run = runlog.lastRun(rows);
  if (!run) return { ask: false, why: "no run logged yet" };
  const ratings = rows.filter((r) => r.kind === "rating");
  if (ratings.some((r) => r.ref === run.run)) return { ask: false, why: `the last run (${run.run}) already has a rating or a skip` };
  if (runlog.askEligible(run)) {
    const what = run.result === "error" || run.result === "fail" ? `ended in ${run.result}` : "dropped a false positive";
    return { ask: true, why: `the last run (${run.run}) ${what} and has no rating yet` };
  }
  if (ratings.some((r) => r.at.slice(0, 10) === today)) return { ask: false, why: "already asked today" };
  const earlier = rows.filter((r) => r !== run && (r.kind === "run" || r.kind === "admin") && r.at.slice(0, 10) === today && runlog.askEligible(r));
  if (earlier.length) return { ask: false, why: "already asked today (after an earlier run that needed a rating)" };
  return { ask: true, why: "the first ask today" };
}

async function run(argv, ctx) {
  const [sub, ...rest] = argv;
  const parsed = parseArgs(rest, { values: ["--row", "--since", "--command", "--kind"] });
  if (!sub || sub === "help" || parsed.help) {
    ctx.out(USAGE);
    return 0;
  }
  const bad = problems(parsed);
  if (bad.length) return ctx.usage(bad.join("; "), USAGE);
  ctx.rootFrom(last(parsed, "--root"));
  const json = parsed.bools.has("--json");

  if (sub === "log") return logRow(parsed, ctx, json);
  if (sub === "rate") return rate(parsed, ctx, json);
  if (sub === "list") return list(parsed, ctx, json);
  if (sub === "should-ask") {
    const r = shouldAsk(runlog.read(ctx.root).rows, ctx.today());
    if (json) ctx.json(r);
    else ctx.out(`  ${r.ask ? "Ask" : "Don't ask"}: ${r.why}.`);
    return 0;
  }
  return ctx.usage(`unknown runs subcommand: ${sub}`, USAGE);
}

module.exports = { run, shouldAsk, USAGE };
