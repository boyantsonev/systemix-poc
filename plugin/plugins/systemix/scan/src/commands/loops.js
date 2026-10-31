"use strict";

/**
 * `systemix loops` — the product and build loops (the Loop Kit) in a repo.
 *
 *   systemix loops init [--dir design] [--dry-run]   copy the loop templates (never overwrites)
 *   systemix loops check [--goals | --loops] [--json] refuse malformed loops, goals and decision lines
 *   systemix loops status [--json]                    where every goal is and whose gate it waits on
 *   systemix loops decisions [--json]                 every ruling, who made it, from which facts
 *
 * Distinct from `systemix loop`, which runs the experiments (the market loop).
 */

const fs = require("fs");
const path = require("path");

const TEMPLATES = path.join(__dirname, "..", "..", "templates", "loop");

const USAGE = `
  Usage: systemix loops <init|check|status|decisions> [--root <dir>] [--dir design] [--json]

    init        copy the loop templates into <dir> (default design/): loops, roster, joins,
                goal grammar, context packs, briefs. Writes only files that do not exist yet.
                --dry-run lists them without writing.
    check       refuse anything malformed (exit 1). --goals or --loops checks one half.
    status      one row per goal: step, whose gate it waits on, the last ruling
    decisions   every decision line across goals (--json for tools)
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

function init(root, dir, { dryRun = false, today = new Date().toISOString().slice(0, 10) } = {}) {
  const written = [];
  const kept = [];
  for (const rel of templateFiles().sort()) {
    const dest = path.join(root, dir, rel);
    if (fs.existsSync(dest)) {
      kept.push(path.join(dir, rel));
      continue;
    }
    written.push(path.join(dir, rel));
    if (dryRun) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, fs.readFileSync(path.join(TEMPLATES, rel), "utf8").replace(/\{\{TODAY\}\}/g, today));
  }
  // the loops read the shared memory; create it only when the repo has none
  const learnings = path.join(root, "experiments", "LEARNINGS.md");
  if (!fs.existsSync(learnings)) {
    written.push("experiments/LEARNINGS.md");
    if (!dryRun) {
      fs.mkdirSync(path.dirname(learnings), { recursive: true });
      fs.writeFileSync(learnings, "# Learnings\n\nWhat each goal and experiment learned, newest first. The next goal reads it.\n\n## Memory\n");
    }
  }
  return { written, kept };
}

async function loops(args = [], opts = {}) {
  const { parseFlags } = require("./drift");
  const kit = require("../lib/loopkit");
  const [sub, ...rest] = args;
  const parsed = parseFlags(rest, { valueFlags: ["--root", "--dir"], boolFlags: ["--json", "--dry-run", "--goals", "--loops"] });
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
  const dir = last("--dir") ?? kit.DEFAULT_DIR;
  const json = parsed.bools.has("--json");

  if (sub === "init") {
    const r = init(root, dir, { dryRun: parsed.bools.has("--dry-run"), today: opts.today });
    if (json) console.log(JSON.stringify(r, null, 2));
    else {
      console.log(`\n  ${parsed.bools.has("--dry-run") ? "Would write" : "Wrote"} ${r.written.length} files${r.kept.length ? `, kept ${r.kept.length} that already exist` : ""}.`);
      for (const f of r.written) console.log(`    + ${f}`);
      console.log(`\n  Next: put real people in ${dir}/loops/roster.md and real facts in ${dir}/context/*.md, then run: systemix loops check\n`);
    }
    return r;
  }

  const sys = kit.load(root, dir);
  if (sub === "check") {
    const onlyGoals = parsed.bools.has("--goals");
    const onlyLoops = parsed.bools.has("--loops");
    const errs = [...(onlyGoals ? [] : kit.checkLoops(sys)), ...(onlyLoops ? [] : kit.checkGoals(sys))];
    if (json) console.log(JSON.stringify({ ok: errs.length === 0, errors: errs }, null, 2));
    else if (errs.length) console.error(kit.format(errs));
    else console.log(`  ✓ loops and goals are well-formed (${sys.loops.length} loops, ${Object.keys(sys.steps).length} steps)`);
    if (errs.length) process.exitCode = 1;
    return errs;
  }
  if (sub === "status") {
    const rows = kit.status(sys);
    if (json) console.log(JSON.stringify(rows, null, 2));
    else if (!rows.length) console.log("  No goals yet. Open one with /systemix:goal <one sentence>.");
    else {
      console.log("| goal | title | step | waits on | last ruling |\n|---|---|---|---|---|");
      for (const r of rows) {
        const waits = r.waiting ? `${r.waiting} (${r.holders.join(", ") || "nobody holds it"})` : r.status === "open" || r.status === "building" ? `agent — /systemix:next ${r.id}` : "—";
        console.log(`| ${r.id} | ${r.title} | ${r.step} | ${waits} | ${r.lastRuling || "—"} |`);
      }
    }
    return rows;
  }
  if (sub === "decisions") {
    const all = kit.decisions(sys);
    if (json) console.log(JSON.stringify(all, null, 2));
    else for (const d of all) console.log(`${d.date} ${d.goal} · ${d.title}. ${d.body} (${d.role}: ${d.person}${d.deputy ? " as deputy" : ""} · context ${d.context.join(", ")}${d.brief ? ` · brief ${d.brief}` : ""})`);
    return all;
  }
  fail(`unknown loops subcommand: ${sub}`);
  console.error(USAGE);
  return null;
}

module.exports = { loops, init, USAGE };
