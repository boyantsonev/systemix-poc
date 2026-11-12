"use strict";

/**
 * rules: the product's rules in design/rules.md, as data.
 *
 *   rules init [--dry-run]                                starter rules.md + design/rules/ samples (never overwrites)
 *   rules lint                                            every row well formed, every pattern compiles, no {{…}}
 *   rules check <file|dir…> | --changed [--base <ref>]    pass, pass with flags or fail (exit 1 on a block)
 *               [--surface s] [--starter]
 *   rules eval                                            every known-bad sample caught, known-good clean, every rule covered
 *   rules list [--surface s]                              the rules that apply, for a brief
 *
 * --starter uses the bundled starter rules instead of design/rules.md (a repo with no studio yet).
 * The token source and design/rules/ are never checked.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const rc = require("../lib/rules-check");
const { parseArgs, last, problems } = require("../lib/args");
const { rel: L, NEVER_CHECKED } = require("../lib/layout");
const { relTo } = require("../lib/ctx");

const TEMPLATES = path.join(__dirname, "..", "..", "templates", "design");
const STARTER_RULES = path.join(TEMPLATES, "rules.md");
const STARTER_EVALS = path.join(TEMPLATES, "rules");
const CHECKABLE = new Set([".html", ".htm", ".vue", ".svelte", ".jsx", ".tsx", ".css", ".scss", ".md", ".mdx", ".txt"]);
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "out", "coverage", "vendor"]);

const USAGE = `
  Usage: rules <init|lint|check|eval|list> [--root <dir>] [--json]

    init    write design/rules.md (starter rows) and design/rules/ (a known-bad sample per
            scripted rule, known-good files, review-cases.json). Never overwrites. --dry-run lists.
    lint    every row well formed: unique ID, block|flag|retired, a script: or review: test whose
            pattern compiles, no unfilled {{PLACEHOLDER}}. Exit 1 on a problem.
    check   run every script rule over the files or folders given, or over the files changed on
            this branch (--changed, against --base or the default branch; the base is printed).
            Pass, pass with flags, or fail (exit 1). --surface keeps the rules for one surface.
            Lists the review: questions to answer by looking. --starter uses the starter rules.
    eval    every design/rules/known-bad/<ID>-*.* trips rule <ID>, every known-good file trips
            nothing, every scripted rule has a sample and every review rule a case. Exit 1 otherwise.
    list    the rules (id, rule, surface, severity, test) for --surface, for a brief.
`;

function templateFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? templateFiles(p, base) : [path.relative(base, p)];
  });
}

/** Copy the starter rules and samples into the repo. New files only. */
function init(root, { dryRun = false, today }) {
  const written = [];
  const kept = [];
  const files = [["rules.md", STARTER_RULES, L.rules], ...templateFiles(STARTER_EVALS).sort().map((f) => [f, path.join(STARTER_EVALS, f), `${L.rulesDir}/${f.split(path.sep).join("/")}`])];
  for (const [, src, out] of files) {
    const dest = path.join(root, out);
    if (fs.existsSync(dest)) {
      kept.push(out);
      continue;
    }
    written.push(out);
    if (dryRun) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (/\.(md|json)$/.test(src)) fs.writeFileSync(dest, fs.readFileSync(src, "utf8").replace(/\{\{TODAY\}\}/g, today));
    else fs.copyFileSync(src, dest);
  }
  return { written, kept };
}

const isNeverChecked = (root, file) => {
  const r = relTo(root, file);
  return NEVER_CHECKED.some((n) => (n.endsWith("/") ? r.startsWith(n) : r === n));
};

/** Files to check under each path: markup, styles and copy, skipping build output and the never-checked set. */
function collect(root, targets) {
  const out = [];
  const walk = (p) => {
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      for (const e of fs.readdirSync(p).sort()) if (!SKIP_DIRS.has(e) && !e.startsWith(".")) walk(path.join(p, e));
    } else if (CHECKABLE.has(path.extname(p).toLowerCase()) && !isNeverChecked(root, p)) out.push(p);
  };
  for (const t of targets) {
    const abs = path.resolve(root, t);
    if (!fs.existsSync(abs)) throw new Error(`no such file or folder: ${t}`);
    walk(abs);
  }
  return [...new Set(out)].sort();
}

const git = (root, args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

/**
 * The base a branch is compared against: --base, else origin/HEAD, else main, else master.
 * Returns { base, mergeBase } or throws with what to pass.
 */
function resolveBase(root, given) {
  const candidates = given ? [given] : ["origin/HEAD", "main", "master", "origin/main", "origin/master"];
  for (const c of candidates) {
    try {
      git(root, ["rev-parse", "--verify", "--quiet", `${c}^{commit}`]);
      return { base: c, mergeBase: git(root, ["merge-base", "HEAD", c]) };
    } catch {
      if (given) throw new Error(`--base ${given} is not a commit here`);
    }
  }
  throw new Error("no base to compare with: there is no origin/HEAD, main or master. Pass --base <ref>");
}

/** Files changed since the merge base, plus uncommitted and untracked ones. */
function changedFiles(root, mergeBase) {
  const names = new Set();
  const add = (s) => s.split("\n").filter(Boolean).forEach((f) => names.add(f));
  add(git(root, ["diff", "--name-only", "--diff-filter=ACMR", mergeBase, "HEAD"]));
  add(git(root, ["diff", "--name-only", "--diff-filter=ACMR"]));
  add(git(root, ["ls-files", "--others", "--exclude-standard"]));
  return [...names].map((f) => path.join(root, f)).filter((f) => fs.existsSync(f) && CHECKABLE.has(path.extname(f).toLowerCase()) && !isNeverChecked(root, f)).sort();
}

const surfaceOf = (parsed) => last(parsed, "--surface", null);
const appliesTo = (surface) => (r) => !surface || r.surface.includes("all") || r.surface.includes(surface);
const publicRule = (r) => ({ id: r.id, rule: r.text, surface: r.surface, severity: r.severity, kind: r.kind, test: r.test, ...(r.where ? { where: r.where } : {}) });

async function run(argv, ctx) {
  const [sub, ...rest] = argv;
  const parsed = parseArgs(rest, { values: ["--surface", "--base", "--rules"], bools: ["--dry-run", "--changed", "--starter"] });
  if (!sub || sub === "help" || parsed.help) {
    ctx.out(USAGE);
    return 0;
  }
  const bad = problems(parsed);
  if (bad.length) return ctx.usage(bad.join("; "), USAGE);
  const root = ctx.rootFrom(last(parsed, "--root"));
  const json = parsed.bools.has("--json");

  if (sub === "init") {
    const r = init(root, { dryRun: parsed.bools.has("--dry-run"), today: ctx.today() });
    if (json) ctx.json(r);
    else {
      ctx.out(`  ${parsed.bools.has("--dry-run") ? "Would write" : "Wrote"} ${r.written.length} files${r.kept.length ? `, kept ${r.kept.length} that already exist` : ""}.`);
      r.written.forEach((f) => ctx.out(`    + ${f}`));
    }
    return 0;
  }

  const starter = parsed.bools.has("--starter");
  const rulesFile = starter ? STARTER_RULES : path.resolve(root, last(parsed, "--rules", L.rules));
  const rulesName = starter ? "the starter rules" : relTo(root, rulesFile);
  if (!fs.existsSync(rulesFile)) {
    if (json) ctx.json({ ok: false, error: "no-rules", rules: rulesName });
    return ctx.fail(`no rules file at ${rulesName}. Start one with: rules init (or use --starter)`);
  }
  const loaded = rc.loadRules(rulesFile);
  const lint = starter ? loaded.problems.filter((p) => !/PLACEHOLDER/.test(p.message)) : loaded.problems;
  const list = loaded.rules;
  const fmt = (p) => `  ${relTo(root, p.file)}:${p.line}: ${p.message}`;

  if (sub === "lint") {
    if (json) ctx.json({ ok: lint.length === 0, rules: list.length, scripted: list.filter((r) => r.kind === "script").length, review: list.filter((r) => r.kind === "review").length, problems: lint.map((p) => ({ ...p, file: relTo(root, p.file) })) });
    else if (lint.length) ctx.err(lint.map(fmt).join("\n"));
    else ctx.out(`  ✓ ${list.length} rules, all well formed (${list.filter((r) => r.kind === "script").length} scripted, ${list.filter((r) => r.kind === "review").length} by review)`);
    return lint.length ? 1 : 0;
  }

  if (lint.length) {
    ctx.err(lint.map(fmt).join("\n"));
    return ctx.fail(`fix ${rulesName} first (rules lint)`);
  }

  if (sub === "list") {
    const surface = surfaceOf(parsed);
    const rules = list.filter((r) => r.severity !== "retired").filter(appliesTo(surface)).map(publicRule);
    if (json) ctx.json({ rules: rulesName, surface, count: rules.length, list: rules });
    else {
      ctx.out(`  ${rules.length} rules${surface ? ` for ${surface}` : ""} from ${rulesName}`);
      rules.forEach((r) => ctx.out(`  ${r.id} ${r.severity.padEnd(5)} ${r.rule}`));
    }
    return 0;
  }

  if (sub === "check") {
    let files;
    let base = null;
    try {
      if (parsed.bools.has("--changed")) {
        const b = resolveBase(root, last(parsed, "--base"));
        base = b.base;
        files = changedFiles(root, b.mergeBase);
      } else {
        if (!parsed.positional.length) return ctx.usage("name what to check (files or folders), or pass --changed", USAGE);
        files = collect(root, parsed.positional);
      }
    } catch (e) {
      if (json) ctx.json({ ok: false, error: e.message });
      return ctx.fail(e.message);
    }
    const surface = surfaceOf(parsed);
    const r = rc.check(list, files, { surface });
    const out = {
      result: r.result,
      rules: rulesName,
      surface,
      base,
      files: files.map((f) => relTo(root, f)),
      fileCount: files.length,
      blocks: r.findings.filter((f) => f.severity === "block").length,
      flags: r.findings.filter((f) => f.severity === "flag").length,
      findings: r.findings.map((f) => ({ ...f, file: relTo(root, f.file) })),
      reviews: r.reviews,
    };
    if (json) ctx.json(out);
    else {
      ctx.out(`  ${r.result.toUpperCase()} · ${files.length} files · rules from ${rulesName}${base ? ` · changed since ${base}` : ""}`);
      for (const f of out.findings) ctx.out(`  ${f.severity === "block" ? "✗" : "!"} ${f.id} ${f.file}:${f.line}  ${f.match}\n      ${f.rule}`);
      if (r.reviews.length) {
        ctx.out("  Answer by looking:");
        r.reviews.forEach((q) => ctx.out(`  ? ${q.id} (${q.severity}) ${q.question}`));
      }
    }
    return r.result === "fail" ? 1 : 0;
  }

  if (sub === "eval") {
    const dir = starter ? STARTER_EVALS : path.join(root, L.rulesDir);
    const r = rc.evaluate(list, dir);
    const out = { ...r, rows: r.rows.map((x) => ({ ...x, file: relTo(root, x.file) })) };
    if (json) ctx.json(out);
    else {
      out.rows.forEach((x) => ctx.out(`  ${x.ok ? "✓" : "✗"} ${x.file}  ${x.expect}: ${x.why}`));
      r.reviewCases.forEach((c) => ctx.out(`  ${c.ok ? "✓" : "✗"} review ${c.id}: ${c.why}`));
      if (!r.rows.length) ctx.out(`  No samples in ${relTo(root, dir)}/known-bad or known-good.`);
      if (r.uncovered.length) ctx.out(`  Scripted rules without a known-bad sample: ${r.uncovered.join(", ")}`);
      r.problems.forEach((p) => ctx.out(`  ✗ ${p}`));
      ctx.out(r.ok ? "  ✓ every rule is tested and every sample behaves" : "  ✗ the check is not ready: fix the rule, the sample or the case");
    }
    return r.ok ? 0 : 1;
  }

  return ctx.usage(`unknown rules subcommand: ${sub}`, USAGE);
}

module.exports = { run, init, collect, resolveBase, changedFiles, STARTER_RULES, STARTER_EVALS, USAGE };
