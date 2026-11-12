"use strict";

/**
 * `systemix rules` — the design system's rules.md as data (DSC-23, G-005).
 *
 *   systemix rules init [--dir design] [--dry-run]              starter rules.md + known-bad evals (never overwrites)
 *   systemix rules lint [--rules design/rules.md] [--json]      every row well-formed, every pattern compiles
 *   systemix rules check <file|dir…> [--surface s] [--json]     pass, pass with flags or fail; exit 1 on a block
 *   systemix rules eval [--evals design/evals/rules] [--json]   every known-bad sample caught, the known-good clean
 */

const fs = require("fs");
const path = require("path");
const rc = require("../lib/rules-check");

const TEMPLATES = path.join(__dirname, "..", "..", "templates", "rules");
const DEFAULT_RULES = path.join("design", "rules.md");
const DEFAULT_EVALS = path.join("design", "evals", "rules");
const CHECKABLE = new Set([".html", ".htm", ".vue", ".svelte", ".jsx", ".tsx", ".css", ".scss", ".md", ".mdx", ".txt"]);
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "out", "coverage"]);

const USAGE = `
  Usage: systemix rules <init|lint|check|eval> [--root <dir>] [--rules <file>] [--json]

    init    write design/rules.md (a starter: tokens, components, accessibility, voice) and
            design/evals/rules/ (one known-bad sample per scripted rule). Never overwrites.
    lint    every rule row well-formed: unique ID, block/flag/retired, a script: or review: test
            whose pattern compiles. Exit 1 on a problem.
    check   run every script rule over the files or folders given: pass, pass with flags, or
            fail (exit 1). --surface product|marketing|email|… keeps only the rules for it.
            Lists the review: questions to answer by looking.
    eval    every design/evals/rules/known-bad/<ID>-*.<ext> must trip rule <ID>, every
            known-good file must trip nothing. Exit 1 otherwise. Run it after changing a rule.
`;

function fail(message) {
  console.error(`\n  ✗  ${message}`);
  process.exitCode = 1;
}

function templateFiles(dir = TEMPLATES, base = TEMPLATES) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? templateFiles(p, base) : [path.relative(base, p)];
  });
}

/** Copy the starter: rules.md into <dir>/, evals/* into <dir>/evals/rules/. New files only. */
function init(root, dir, { dryRun = false, today = new Date().toISOString().slice(0, 10) } = {}) {
  const written = [];
  const kept = [];
  for (const rel of templateFiles().sort()) {
    const out = rel.startsWith("evals" + path.sep) ? path.join(dir, "evals", "rules", rel.slice("evals".length + 1)) : path.join(dir, rel);
    const dest = path.join(root, out);
    if (fs.existsSync(dest)) {
      kept.push(out);
      continue;
    }
    written.push(out);
    if (dryRun) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const src = path.join(TEMPLATES, rel);
    if (rel.endsWith(".md")) fs.writeFileSync(dest, fs.readFileSync(src, "utf8").replace(/\{\{TODAY\}\}/g, today));
    else fs.copyFileSync(src, dest);
  }
  return { written, kept };
}

/** Files to check under each path given: markup, styles and copy, skipping build output. */
function collect(root, targets) {
  const out = [];
  const walk = (p) => {
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      for (const e of fs.readdirSync(p)) if (!SKIP_DIRS.has(e) && !e.startsWith(".")) walk(path.join(p, e));
    } else if (CHECKABLE.has(path.extname(p).toLowerCase())) out.push(p);
  };
  for (const t of targets) {
    const abs = path.resolve(root, t);
    if (!fs.existsSync(abs)) throw new Error(`no such file or folder: ${t}`);
    walk(abs);
  }
  return out.sort();
}

const rel = (root, f) => path.relative(root, f) || f;

async function rules(args = [], opts = {}) {
  const { parseFlags } = require("./drift");
  const [sub, ...rest] = args;
  const parsed = parseFlags(rest, { valueFlags: ["--root", "--dir", "--rules", "--evals", "--surface"], boolFlags: ["--json", "--dry-run"] });
  if (!sub || parsed.help || sub === "help") {
    console.log(USAGE);
    return null;
  }
  const problems = [...parsed.errors, ...parsed.unknown.map((f) => `unknown flag ${f}`)];
  if (problems.length) {
    problems.forEach(fail);
    return null;
  }
  const last = (k) => (parsed.values[k] ?? []).slice(-1)[0];
  const root = path.resolve(last("--root") ?? opts.projectRoot ?? process.cwd());
  const json = parsed.bools.has("--json");
  const rulesFile = path.resolve(root, last("--rules") ?? DEFAULT_RULES);

  if (sub === "init") {
    const r = init(root, last("--dir") ?? "design", { dryRun: parsed.bools.has("--dry-run"), today: opts.today });
    if (json) console.log(JSON.stringify(r, null, 2));
    else {
      console.log(`\n  ${parsed.bools.has("--dry-run") ? "Would write" : "Wrote"} ${r.written.length} files${r.kept.length ? `, kept ${r.kept.length} that already exist` : ""}.`);
      for (const f of r.written) console.log(`    + ${f}`);
      console.log("\n  Next: replace the starter rows with this product's rules, then: systemix rules eval\n");
    }
    return r;
  }

  if (!fs.existsSync(rulesFile)) {
    fail(`no rules file at ${rel(root, rulesFile)}. Start one with: systemix rules init (or /systemix:setup)`);
    return null;
  }
  const { rules: list, problems: lint } = rc.loadRules(rulesFile);
  const fmt = (p) => `  ${rel(root, p.file)}:${p.line}: ${p.message}`;

  if (sub === "lint") {
    if (json) console.log(JSON.stringify({ ok: lint.length === 0, rules: list.length, problems: lint.map((p) => ({ ...p, file: rel(root, p.file) })) }, null, 2));
    else if (lint.length) console.error(lint.map(fmt).join("\n"));
    else console.log(`  ✓ ${list.length} rules, all well-formed (${list.filter((r) => r.kind === "script").length} scripted, ${list.filter((r) => r.kind === "review").length} by review)`);
    if (lint.length) process.exitCode = 1;
    return lint;
  }

  if (lint.length) {
    console.error(lint.map(fmt).join("\n"));
    fail("fix rules.md first (systemix rules lint)");
    return null;
  }

  if (sub === "check") {
    if (!parsed.positional.length) {
      fail("name what to check: systemix rules check <file or folder…>");
      return null;
    }
    let files;
    try {
      files = collect(root, parsed.positional);
    } catch (e) {
      fail(e.message);
      return null;
    }
    const r = rc.check(list, files, { surface: last("--surface") ?? null });
    const out = { ...r, files: files.length, rules: rel(root, rulesFile), findings: r.findings.map((f) => ({ ...f, file: rel(root, f.file) })) };
    if (json) console.log(JSON.stringify(out, null, 2));
    else {
      console.log(`\n  ${r.result.toUpperCase()} · ${files.length} files · rules from ${out.rules}\n`);
      for (const f of out.findings) console.log(`  ${f.severity === "block" ? "✗" : "!"} ${f.id} ${f.file}:${f.line}  ${f.match}\n      ${f.rule}`);
      if (r.reviews.length) {
        console.log("\n  Answer by looking:");
        for (const q of r.reviews) console.log(`  ? ${q.id} (${q.severity}) ${q.question}`);
      }
      console.log("");
    }
    if (r.result === "fail") process.exitCode = 1;
    return out;
  }

  if (sub === "eval") {
    const dir = path.resolve(root, last("--evals") ?? DEFAULT_EVALS);
    const r = rc.evaluate(list, dir);
    const out = { ...r, rows: r.rows.map((x) => ({ ...x, file: rel(root, x.file) })) };
    if (json) console.log(JSON.stringify(out, null, 2));
    else {
      for (const x of out.rows) console.log(`  ${x.ok ? "✓" : "✗"} ${x.file}  ${x.expect}: ${x.why}`);
      if (!r.rows.length) console.log(`  No samples in ${rel(root, dir)}/known-bad or known-good.`);
      if (r.uncovered.length) console.log(`\n  Scripted rules without a known-bad sample: ${r.uncovered.join(", ")}`);
      console.log(r.ok ? "\n  ✓ every sample behaves\n" : "\n  ✗ the check is not ready: fix the rule or the sample\n");
    }
    if (!r.ok) process.exitCode = 1;
    return out;
  }

  fail(`unknown rules subcommand: ${sub}`);
  console.error(USAGE);
  return null;
}

module.exports = { rules, init, collect, USAGE };
