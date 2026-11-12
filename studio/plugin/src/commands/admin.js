"use strict";

/**
 * admin: the studio's key-free self-check and a counts-only digest of what it did.
 *
 *   admin eval                 rules lint + eval, tokens lint, docs check, loops check, proposals lint,
 *                              the run log's schema and privacy; reads the newest evals/results/*.json
 *   admin digest [--since d]   counts from the run log since the last admin row, and the signals
 *                              that crossed a threshold (at most 3 marked top)
 *
 * No key, no network. The thresholds live here and in the admin guide, never in config.
 */

const fs = require("fs");
const path = require("path");
const { parseArgs, last, problems } = require("../lib/args");
const { invoke } = require("../lib/invoke");
const runlog = require("../lib/runlog");
const { rel: L } = require("../lib/layout");

const USAGE = `
  Usage: admin <eval|digest> [--root <dir>] [--json]

    eval     the key-free checks: rules-lint, rules-eval, tokens-lint, docs-check, loops-check,
             proposals-lint and runlog-lint (a check is skipped when its files are not there).
             Also reads the newest evals/results/*.json when the maintainer harness wrote one.
             Exit 1 when a check that ran fails.
    digest   what the studio did since the last admin row (or --since YYYY-MM-DD): runs per
             command with ups, downs and down share, blocks and flags per surface, blocks fixed,
             false positives per rule, errors, and the signals that crossed a threshold.
`;

/** The thresholds (SPEC.md § admin). Changing one is a plugin-target proposal. */
const THRESHOLDS = {
  falsePositive: 3, // the same rule dropped as a false positive 3 or more times
  downRuns: 5, // a command with 5 or more runs …
  downShare: 0.3, // … and a down share of 0.30 or more
  error: 2, // the same error 2 or more times
  evalCheck: 1, // a failing admin eval check
  trigger: 1, // a trigger miss or negative firing in the results file
};
const PROPOSALS_CAP = 3;
const KIND_ORDER = ["false-positive", "down-share", "error", "eval-check", "trigger-miss", "negative-firing"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const exists = (root, rel) => fs.existsSync(path.join(root, rel));
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

/** A check run through another command; a command that is not built yet is a failing check that says so. */
async function viaCommand(ctx, name, argv, describe) {
  const r = await invoke(ctx, argv);
  if (!r.json || typeof r.json !== "object") {
    const why = (r.stderr || r.stdout || "").split("\n").map((s) => s.replace(/^\s*✗\s*/, "").trim()).filter(Boolean)[0] || `exit ${r.code}, no JSON`;
    return { name, ok: false, skipped: false, detail: /not built yet/.test(why) ? `${argv.join(" ")}: ${why}` : why };
  }
  return { name, ok: r.code === 0, skipped: false, detail: describe(r.json, r.code) };
}

const skip = (name, why) => ({ name, ok: true, skipped: true, detail: why });

const firstProblem = (list) => {
  const p = (list || [])[0];
  if (!p) return "";
  if (typeof p === "string") return p;
  return [p.file && `${p.file}${p.line ? `:${p.line}` : ""}`, p.message].filter(Boolean).join(": ");
};

/** Every admin eval check, in a fixed order. */
async function checks(ctx) {
  const root = ctx.root;
  const out = [];
  if (!exists(root, L.rules)) {
    out.push({ name: "rules-lint", ok: false, skipped: false, detail: `no ${L.rules}` });
    out.push({ name: "rules-eval", ok: false, skipped: false, detail: `no ${L.rules}` });
  } else {
    out.push(
      await viaCommand(ctx, "rules-lint", ["rules", "lint"], (j, code) =>
        code === 0 ? `${plural(j.rules, "rule")} well formed (${j.scripted} scripted, ${j.review} by review)` : `${plural((j.problems || []).length, "problem")}: ${firstProblem(j.problems)}`,
      ),
    );
    out.push(
      await viaCommand(ctx, "rules-eval", ["rules", "eval"], (j, code) => {
        const rows = j.rows || [];
        const cases = j.reviewCases || [];
        const base = `${rows.filter((r) => r.ok).length}/${rows.length} samples behave, ${cases.filter((c) => c.ok).length}/${cases.length} review cases present`;
        if (code === 0) return base;
        const extra = [];
        if ((j.uncovered || []).length) extra.push(`no known-bad sample for ${j.uncovered.join(", ")}`);
        const badRow = rows.find((r) => !r.ok);
        if (badRow) extra.push(`${badRow.file}: ${badRow.why}`);
        const badCase = cases.find((c) => !c.ok);
        if (badCase) extra.push(`review ${badCase.id}: ${badCase.why}`);
        if ((j.problems || []).length) extra.push(firstProblem(j.problems));
        if (j.error) extra.push(j.error);
        return [base, ...extra].join("; ");
      }),
    );
  }
  if (!exists(root, L.tokens)) out.push(skip("tokens-lint", `no ${L.tokens}`));
  else
    out.push(
      await viaCommand(ctx, "tokens-lint", ["tokens", "lint"], (j, code) => {
        const pairs = j.pairs || [];
        const base = `${pairs.filter((p) => p.ok).length}/${pairs.length} pairs pass AA`;
        if (code === 0) return base;
        const missing = [...((j.missing && j.missing.light) || []), ...((j.missing && j.missing.dark) || [])];
        const extra = [];
        if (missing.length) extra.push(`${plural(missing.length, "missing role")}`);
        if ((j.raw || []).length) extra.push(`${plural(j.raw.length, "raw role value")}`);
        if ((j.problems || []).length) extra.push(firstProblem(j.problems));
        return [base, ...extra].join("; ");
      }),
    );
  if (!exists(root, L.manifest)) out.push(skip("docs-check", `no ${L.manifest}`));
  else out.push(await viaCommand(ctx, "docs-check", ["docs", "sync", "--check"], (j, code) => (code === 0 ? `${L.manifest} matches ${L.componentDocs}` : `drift: ${firstProblem(j.problems || j.drift || j.changes) || "the manifest is out of step"}`)));
  if (!exists(root, L.loops)) out.push(skip("loops-check", `no ${L.loops}`));
  else out.push(await viaCommand(ctx, "loops-check", ["loops", "check"], (j, code) => (code === 0 ? "the loops, goals and context packs are well formed" : `${plural((j.problems || []).length, "problem")}: ${firstProblem(j.problems)}`)));
  if (!exists(root, L.proposals)) out.push(skip("proposals-lint", `no ${L.proposals}`));
  else out.push(await viaCommand(ctx, "proposals-lint", ["proposals", "lint"], (j, code) => (code === 0 ? `${plural(j.proposals, "proposal")} well formed` : `${plural((j.problems || []).length, "problem")}: ${firstProblem(j.problems)}`)));
  const log = runlog.lint(root);
  out.push({
    name: "runlog-lint",
    ok: log.ok,
    skipped: false,
    detail: !log.exists ? `no ${L.runs} yet` : log.ok ? `${plural(log.rows, "row")}, all valid and privacy-clean` : `${plural(log.problems.length, "problem")}: line ${log.problems[0].line}: ${log.problems[0].message}`,
  });
  return out;
}

/** The newest evals/results/*.json under root, summarised; null when there is none. */
function results(root) {
  const d = path.join(root, "evals", "results");
  if (!fs.existsSync(d)) return null;
  const names = fs.readdirSync(d).filter((f) => f.endsWith(".json")).sort();
  if (!names.length) return null;
  const name = names[names.length - 1];
  const file = `evals/results/${name}`;
  let j;
  try {
    j = JSON.parse(fs.readFileSync(path.join(d, name), "utf8"));
  } catch {
    return { file, triggers: null, cases: null, error: "does not parse" };
  }
  const t = j.triggers || null;
  const misses = (t && Array.isArray(t.misses) ? t.misses : []).map((m) => ({ ask: m.ask, expected: m.expected ?? null, got: m.got ?? null }));
  const triggers = t
    ? {
        total: t.total ?? null,
        positives: t.positives || null,
        negatives: t.negatives || null,
        misses: misses.filter((m) => m.expected !== null).length,
        negativeFirings: misses.filter((m) => m.expected === null).length,
        list: misses,
      }
    : null;
  const cs = Array.isArray(j.cases) ? j.cases : null;
  const cases = cs ? { ok: cs.filter((c) => c.ok).length, total: cs.length, failed: cs.filter((c) => !c.ok).map((c) => c.id).sort() } : null;
  return { file, ...(j.date ? { date: j.date } : {}), triggers, cases };
}

async function evaluate(ctx) {
  const list = await checks(ctx);
  return { ok: list.every((c) => c.skipped || c.ok), checks: list, results: results(ctx.root) };
}

/** Counts of passing checks that ran: what proposals apply records as evals_before/after. */
const passing = (ev) => ({ passing: ev.checks.filter((c) => c.ok && !c.skipped).length, total: ev.checks.filter((c) => !c.skipped).length });

const inc = (o, k, n = 1) => {
  o[k] = (o[k] || 0) + n;
  return o;
};
const sortKeys = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
const round2 = (n) => Math.round(n * 100) / 100;

/** The digest over the run log (and the eval, for its signals). */
async function digest(ctx, sinceFlag) {
  const { rows } = runlog.read(ctx.root);
  const all = rows.filter((r) => typeof r.at === "string").sort(runlog.byTime);
  let since = sinceFlag || null;
  let inWindow;
  if (sinceFlag) inWindow = (r) => r.at.slice(0, 10) >= sinceFlag;
  else {
    const admin = all.filter((r) => r.kind === "admin").slice(-1)[0];
    since = admin ? admin.at : null;
    inWindow = admin ? (r) => r.at > admin.at : () => true;
  }
  const runs = runlog.merged(all).filter((r) => r.kind === "run" && inWindow(r));

  const byCommand = {};
  for (const r of runs) {
    const c = byCommand[r.command] || (byCommand[r.command] = { runs: 0, up: 0, down: 0, downShare: 0 });
    c.runs++;
    if (r.rating === "up") c.up++;
    if (r.rating === "down") c.down++;
  }
  for (const c of Object.values(byCommand)) c.downShare = c.runs ? round2(c.down / c.runs) : 0;

  const rulesCaught = {};
  for (const r of runs.filter((x) => x.command === "check")) {
    const s = r.surface || "none";
    const o = rulesCaught[s] || (rulesCaught[s] = { blocks: 0, flags: 0 });
    o.blocks += Number.isInteger(r.blocks) ? r.blocks : 0;
    o.flags += Number.isInteger(r.flags) ? r.flags : 0;
  }

  // a fail check followed, on the same args and surface, by a pass or pass-with-flags check
  let blocksFixed = 0;
  const checksRun = runs.filter((r) => r.command === "check");
  checksRun.forEach((r, i) => {
    if (r.result !== "fail") return;
    const next = checksRun.slice(i + 1).find((n) => n.args === r.args && (n.surface || null) === (r.surface || null));
    if (next && (next.result === "pass" || next.result === "pass-with-flags")) blocksFixed++;
  });

  const falsePositives = {};
  const fpRuns = {};
  for (const r of runs)
    for (const fp of r.false_positives || []) {
      inc(falsePositives, fp.rule);
      (fpRuns[fp.rule] = fpRuns[fp.rule] || new Set()).add(r.run);
    }

  const errors = {};
  const errorRuns = {};
  for (const r of runs.filter((x) => x.result === "error")) {
    const msg = (r.note || "").trim() || `${r.command} ${r.args}`.trim();
    inc(errors, msg);
    (errorRuns[msg] = errorRuns[msg] || []).push(r.run);
  }

  const signals = [];
  for (const [rule, n] of Object.entries(falsePositives))
    if (n >= THRESHOLDS.falsePositive) signals.push({ kind: "false-positive", subject: rule, evidence: [...fpRuns[rule]].sort(), count: n, threshold: THRESHOLDS.falsePositive });
  for (const [cmd, c] of Object.entries(byCommand))
    if (c.runs >= THRESHOLDS.downRuns && c.downShare >= THRESHOLDS.downShare)
      signals.push({ kind: "down-share", subject: cmd, evidence: runs.filter((r) => r.command === cmd && r.rating === "down").map((r) => r.run).sort(), count: c.down, threshold: THRESHOLDS.downShare });
  for (const [msg, n] of Object.entries(errors)) if (n >= THRESHOLDS.error) signals.push({ kind: "error", subject: msg, evidence: [...errorRuns[msg]].sort(), count: n, threshold: THRESHOLDS.error });

  const ev = await evaluate(ctx);
  for (const c of ev.checks) if (!c.skipped && !c.ok) signals.push({ kind: "eval-check", subject: c.name, evidence: [`admin-eval:${c.name}`], count: 1, threshold: THRESHOLDS.evalCheck });
  if (ev.results && ev.results.triggers) {
    const stamp = ev.results.date || path.basename(ev.results.file, ".json");
    const groups = {};
    ev.results.triggers.list.forEach((m, i) => {
      const kind = m.expected === null ? "negative-firing" : "trigger-miss";
      const subject = (m.expected === null ? m.got : m.expected) || "none";
      const g = groups[`${kind}|${subject}`] || (groups[`${kind}|${subject}`] = { kind, subject, evidence: [] });
      g.evidence.push(`triggers:${stamp}:${i + 1}`);
    });
    for (const g of Object.values(groups)) signals.push({ kind: g.kind, subject: g.subject, evidence: g.evidence.sort(), count: g.evidence.length, threshold: THRESHOLDS.trigger });
  }
  signals.sort((a, b) => b.count - a.count || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || (a.subject < b.subject ? -1 : a.subject > b.subject ? 1 : 0));
  signals.forEach((s, i) => (s.top = i < PROPOSALS_CAP));

  return {
    since,
    runs: runs.length,
    byCommand: sortKeys(byCommand),
    rulesCaught: sortKeys(rulesCaught),
    blocksFixed,
    falsePositives: sortKeys(falsePositives),
    errors: sortKeys(errors),
    signals,
    proposalsCap: PROPOSALS_CAP,
  };
}

async function run(argv, ctx) {
  const [sub, ...rest] = argv;
  const parsed = parseArgs(rest, { values: ["--since"] });
  if (!sub || sub === "help" || parsed.help) {
    ctx.out(USAGE);
    return 0;
  }
  const bad = problems(parsed);
  if (bad.length) return ctx.usage(bad.join("; "), USAGE);
  ctx.rootFrom(last(parsed, "--root"));
  const json = parsed.bools.has("--json");

  if (sub === "eval") {
    const r = await evaluate(ctx);
    if (json) ctx.json(r);
    else {
      for (const c of r.checks) ctx.out(`  ${c.skipped ? "-" : c.ok ? "✓" : "✗"} ${c.name.padEnd(15)} ${c.skipped ? "skipped: " : ""}${c.detail}`);
      if (!r.results) ctx.out("  Trigger and case evals: not run (no evals/results/*.json).");
      else ctx.out(`  Results ${r.results.file}: ${r.results.triggers ? `${r.results.triggers.misses} trigger misses, ${r.results.triggers.negativeFirings} negative firings` : "no triggers"}; ${r.results.cases ? `${r.results.cases.ok}/${r.results.cases.total} cases` : "no cases"}.`);
      ctx.out(r.ok ? "  ✓ every check that ran passes" : "  ✗ a check failed");
    }
    return r.ok ? 0 : 1;
  }

  if (sub === "digest") {
    const since = last(parsed, "--since", null);
    if (since !== null && !DATE.test(since)) return ctx.usage("--since takes a date, YYYY-MM-DD", USAGE);
    const d = await digest(ctx, since);
    if (json) ctx.json(d);
    else {
      ctx.out(`  ${plural(d.runs, "run")} since ${d.since || "the start of the log"}.`);
      for (const [cmd, c] of Object.entries(d.byCommand)) ctx.out(`  ${cmd.padEnd(6)} ${plural(c.runs, "run")}, ${c.up} up, ${c.down} down (down share ${c.downShare})`);
      for (const [s, c] of Object.entries(d.rulesCaught)) ctx.out(`  check on ${s}: ${plural(c.blocks, "block")}, ${plural(c.flags, "flag")}`);
      ctx.out(`  Blocks fixed: ${d.blocksFixed}.`);
      for (const [rule, n] of Object.entries(d.falsePositives)) ctx.out(`  ${rule} dropped as a false positive ${n}×`);
      for (const [msg, n] of Object.entries(d.errors)) ctx.out(`  error ${n}×: ${msg}`);
      if (!d.signals.length) ctx.out("  No signals: nothing crossed a threshold.");
      for (const s of d.signals) ctx.out(`  ${s.top ? "▲" : "·"} ${s.kind} ${s.subject}: ${s.count} (threshold ${s.threshold}) · ${s.evidence.join(", ")}`);
    }
    return 0;
  }

  return ctx.usage(`unknown admin subcommand: ${sub}`, USAGE);
}

module.exports = { run, evaluate, checks, results, digest, passing, THRESHOLDS, PROPOSALS_CAP, USAGE };
