"use strict";

/**
 * loops: the product and build loops in a repo.
 *
 *   loops init [--preset solo|team] [--holder role=name …] [--dry-run]   copy the loop kit (never overwrites)
 *   loops check [--goals | --loops]                                      refuse malformed loops, goals, briefs and decision lines
 *   loops status                                                         where every goal is and whose ruling it waits on
 *   loops goal new <slug> --title "<one sentence>"                       open G-NNN-<slug>/ at its first gate
 *   loops gate <G-NNN> approve|rework|drop --by "<name>" [--note "…"] [--brief B-NNN|none]
 *                                                                        record a person's ruling and move the step
 *   loops decisions                                                      every decision line across goals
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const kit = require("../lib/loopkit");
const { parseArgs, last, problems } = require("../lib/args");
const { rel: L } = require("../lib/layout");
const { stringifyFrontmatter } = require("../lib/md");

const TEMPLATES = path.join(__dirname, "..", "..", "templates");
const LOOP_TEMPLATES = path.join(TEMPLATES, "loops");
const PRESETS = ["solo", "team"];

const USAGE = `
  Usage: loops <init|check|status|goal|gate|decisions> [--root <dir>] [--json]

    init        copy the loop kit into design/: the product and build loops, joins, the roster,
                the goal and brief grammar, context packs, LEARNINGS.md and evaluations.md.
                Solo by default (one person holds every role, no deputy); --preset team is opt-in.
                The holder is git config user.name unless --holder role=name says otherwise.
                Never overwrites. --dry-run lists what it would write.
    check       refuse anything malformed (exit 1), including any {{ under design/loops, goals or
                context. --goals or --loops checks one half.
    status      one row per goal: its step, whose ruling it waits on, the last ruling.
    goal new <slug> --title "<one sentence>"
                open design/goals/G-NNN-<slug>/ (goal.md, evals.md, decisions.md) at its first gate.
    gate <G-NNN> approve|rework|drop --by "<name>" [--note "…"] [--brief B-NNN|none]
                record a person's ruling as one decision line and move the goal's step. The name
                must hold the role the step waits on, or be its deputy.
    decisions   every decision line across goals.
`;

// ------------------------------------------------------------------------------------------------ init

function templateFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? templateFiles(p, base) : [path.relative(base, p).split(path.sep).join("/")];
  });
}

/** [source, repo-relative destination] for a preset. */
function initPlan(preset) {
  const plan = [];
  for (const f of templateFiles(LOOP_TEMPLATES).sort()) {
    const roster = /^loops\/roster\.([a-z]+)\.md$/.exec(f);
    if (roster) {
      if (roster[1] === preset) plan.push([path.join(LOOP_TEMPLATES, f), L.roster]);
      continue;
    }
    plan.push([path.join(LOOP_TEMPLATES, f), `${L.data}/${f}`]);
  }
  plan.push([path.join(TEMPLATES, "design", "LEARNINGS.md"), L.learnings]);
  plan.push([path.join(TEMPLATES, "design", "evaluations.md"), L.evaluations]);
  return plan.sort((a, b) => (a[1] < b[1] ? -1 : 1));
}

function gitUser(ctx, root) {
  try {
    return execFileSync("git", ["config", "user.name"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], env: { ...process.env, ...ctx.env } }).trim() || null;
  } catch {
    return null;
  }
}

/** Roles named by {{HOLDER <role>}} in the preset's roster template. */
const rosterRoles = (preset) => {
  const text = fs.readFileSync(path.join(LOOP_TEMPLATES, "loops", `roster.${preset}.md`), "utf8");
  return [...new Set([...text.matchAll(/\{\{HOLDER ([a-z][a-z-]*)\}\}/g)].map((m) => m[1]))];
};

const badName = (n) => !n || /[\n\r,·{}]/.test(n) || n.length > 80;

/** role → holder text for the roster, or { error }. */
function resolveHolders(preset, given, fallback) {
  const roles = rosterRoles(preset);
  for (const role of Object.keys(given)) if (!roles.includes(role)) return { usage: `--holder ${role}=…: the ${preset} roster has no role ${role} (it has ${roles.join(", ")})` };
  const out = {};
  if (preset === "solo") {
    const names = [...new Set(Object.values(given))];
    if (names.length > 1) return { usage: `the solo preset has one person in every role; got ${names.join(", ")} (use --preset team)` };
    const person = names[0] || fallback;
    if (!person) return { error: "need-holder", roles };
    for (const r of roles) out[r] = person;
    return { holders: out };
  }
  const leads = roles.filter((r) => r !== "reviewer");
  const missing = [];
  for (const r of leads) {
    out[r] = given[r] || fallback;
    if (!out[r]) missing.push(r);
  }
  if (roles.includes("reviewer")) {
    out.reviewer = given.reviewer || [...new Set(leads.map((r) => out[r]).filter(Boolean))].join(", ");
    if (!out.reviewer) missing.push("reviewer");
  }
  if (missing.length) return { error: "need-holder", roles: missing };
  return { holders: out };
}

function init(ctx, root, parsed) {
  const preset = last(parsed, "--preset", "solo");
  if (!PRESETS.includes(preset)) return { usage: `--preset is solo or team, not ${preset}` };
  const given = {};
  for (const h of parsed.values["--holder"] || []) {
    const m = /^([a-z][a-z-]*)=(.*)$/.exec(h);
    if (!m || badName(m[2].trim())) return { usage: `--holder takes role=name (one name, no commas or braces): ${h}` };
    given[m[1]] = m[2].trim();
  }
  const fallback = gitUser(ctx, root);
  const r = resolveHolders(preset, given, fallback && !badName(fallback) ? fallback : null);
  if (r.usage || r.error) return r;
  const today = ctx.today();
  const fill = (text) => text.replace(/\{\{TODAY\}\}/g, today).replace(/\{\{HOLDER ([a-z][a-z-]*)\}\}/g, (_, role) => r.holders[role]);
  const written = [];
  const kept = [];
  const dryRun = parsed.bools.has("--dry-run");
  const writes = [];
  for (const [src, out] of initPlan(preset)) {
    const dest = path.join(root, out);
    if (fs.existsSync(dest)) {
      kept.push(out);
      continue;
    }
    const text = fill(fs.readFileSync(src, "utf8"));
    if (text.includes("{{")) throw new Error(`template ${path.relative(TEMPLATES, src)} leaves a {{ placeholder unfilled`);
    written.push(out);
    writes.push([dest, text]);
  }
  if (!dryRun) {
    for (const [dest, text] of writes) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, text);
    }
  }
  return { result: { written, kept }, preset, holders: r.holders, dryRun };
}

// ------------------------------------------------------------------------------------------------ goal new

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function goalNew(ctx, root, slug, title) {
  const sys = kit.load(root);
  const step = kit.firstGate(sys);
  if (!step) return { fail: { error: "no-loops", message: `no loops in ${L.loops}/: run loops init first` } };
  const id = kit.nextGoalId(root);
  const dirRel = `${L.goals}/${id}-${slug}`;
  const dir = path.join(root, dirRel);
  const goal =
    stringifyFrontmatter({ id, title, status: "open", step, opened: ctx.today() }) +
    `\n# ${title}\n\n${kit.GOAL_SECTIONS.map((s) => `## ${s}\n`).join("\n")}`;
  const evals = "# Evals\n\n| id | must be true | checked by | bar | answered at | status |\n|---|---|---|---|---|---|\n";
  const decisionsMd = "# Decisions\n\n";
  const files = [
    [`${dirRel}/decisions.md`, decisionsMd],
    [`${dirRel}/evals.md`, evals],
    [`${dirRel}/goal.md`, goal],
  ];
  fs.mkdirSync(dir, { recursive: true });
  for (const [f, text] of files) fs.writeFileSync(path.join(root, f), text);
  return { result: { id, dir: dirRel, files: files.map((f) => f[0]) } };
}

// ------------------------------------------------------------------------------------------------ gate

function gate(ctx, root, id, ruling, parsed) {
  const by = (last(parsed, "--by") || "").trim();
  const note = last(parsed, "--note");
  const brief = last(parsed, "--brief", "none");
  if (!/^G-\d{3,}$/.test(id || "")) return { usage: `gate needs a goal id (G-NNN), not ${id || "nothing"}` };
  if (!kit.RULINGS.includes(ruling)) return { usage: `a ruling is approve, rework or drop, not ${ruling || "nothing"}` };
  if (!by) return { usage: `--by "<name>" is required: the person ruling` };
  if (/[\n\r·]/.test(by)) return { usage: "--by is one name on one line, with no ·" };
  if (note !== undefined && /[\n\r]/.test(note)) return { usage: "--note is one line" };
  if (brief !== "none" && !/^B-\d{3,}$/.test(brief)) return { usage: `--brief is B-NNN or none, not ${brief}` };

  const sys = kit.load(root);
  const dir = kit.findGoal(root, id);
  if (!dir) return { fail: { error: "no-such-goal", id } };
  const g = kit.readGoal(dir);
  if (!g) return { fail: { error: "no-such-goal", id } };
  const step = g.data.step ? String(g.data.step) : null;
  if (g.data.status === "dropped") return { fail: { error: "goal-closed", id, step } };
  const role = step ? kit.rulingRole(sys, step) : null;
  if (!role) return { fail: { error: "not-at-gate", id, step, message: `${id} is at ${step || "no step"}, where the coding agent works; nobody rules there` } };
  if (!kit.mayRule(sys, role, by)) return { fail: { error: "not-a-holder", id, step, by, waitsOn: kit.whoRules(sys, role) } };
  if (brief !== "none" && !kit.briefExists(root, brief)) return { fail: { error: "no-such-brief", brief } };
  if (ruling === "approve") {
    const n = kit.evalRows(dir);
    if (n < kit.EVALS_MIN || n > kit.EVALS_MAX) return { fail: { error: "evals-incomplete", id, evals: n, message: `${id} has ${n} evals; approve needs ${kit.EVALS_MIN} to ${kit.EVALS_MAX}` } };
  }

  const cleanNote = note === undefined ? null : note.trim() || null;
  const line = kit.decisionLine({ date: ctx.today(), gate: step, ruling, by, brief, note: cleanNote });
  const decisionsFile = path.join(dir, "decisions.md");
  const before = fs.existsSync(decisionsFile) ? fs.readFileSync(decisionsFile, "utf8") : "# Decisions\n\n";
  fs.writeFileSync(decisionsFile, `${before}${before === "" || before.endsWith("\n") ? "" : "\n"}${line}\n`);

  const moved = kit.afterRuling(sys, step, ruling);
  const fields = {};
  if (moved !== step) fields.step = moved;
  if (ruling === "drop") fields.status = "dropped";
  if (ruling === "approve") {
    const s = kit.statusAfterApprove(sys, step, g.data.status);
    if (s !== g.data.status) fields.status = s;
  }
  if (Object.keys(fields).length) kit.setGoalFields(g.file, fields);
  return { result: { id, gate: step, ruling, step: moved, next: ruling === "drop" ? null : kit.nextStep(sys, moved), line } };
}

// ------------------------------------------------------------------------------------------------ run

async function run(argv, ctx) {
  const [sub, ...rest] = argv;
  const parsed = parseArgs(rest, {
    values: ["--preset", "--holder", "--title", "--by", "--note", "--brief"],
    bools: ["--dry-run", "--goals", "--loops"],
  });
  if (!sub || sub === "help" || parsed.help) {
    ctx.out(USAGE);
    return 0;
  }
  const bad = problems(parsed);
  if (bad.length) return ctx.usage(bad.join("; "), USAGE);
  const root = ctx.rootFrom(last(parsed, "--root"));
  const json = parsed.bools.has("--json");
  const refuse = (obj) => {
    if (json) ctx.json({ ok: false, ...obj });
    else ctx.err(`  ✗ ${obj.message || obj.error}`);
    return 1;
  };

  if (sub === "init") {
    const r = init(ctx, root, parsed);
    if (r.usage) return ctx.usage(r.usage, USAGE);
    if (r.error) return refuse({ error: r.error, roles: r.roles, message: `no holder for ${r.roles.join(", ")}: git config user.name is empty; pass --holder role=name` });
    if (json) ctx.json(r.result);
    else {
      ctx.out(`  ${r.dryRun ? "Would write" : "Wrote"} ${r.result.written.length} files (${r.preset} roster)${r.result.kept.length ? `, kept ${r.result.kept.length} that already exist` : ""}.`);
      r.result.written.forEach((f) => ctx.out(`    + ${f}`));
    }
    return 0;
  }

  if (sub === "check") {
    const sys = kit.load(root);
    const onlyGoals = parsed.bools.has("--goals");
    const onlyLoops = parsed.bools.has("--loops");
    const errs = kit.sortProblems([...(onlyGoals ? [] : kit.checkLoops(sys)), ...(onlyLoops ? [] : [...kit.checkGoals(sys), ...kit.checkBriefs(sys)])]);
    if (json) ctx.json({ ok: errs.length === 0, problems: errs });
    else if (errs.length) ctx.err(kit.format(errs));
    else ctx.out(`  ✓ loops and goals are well formed (${sys.loops.length} loops, ${Object.keys(sys.steps).length} steps, ${kit.goalDirs(root).length} goals)`);
    return errs.length ? 1 : 0;
  }

  if (sub === "status") {
    const goals = kit.status(kit.load(root));
    if (json) ctx.json({ goals });
    else if (!goals.length) ctx.out("  No goals yet.");
    else {
      ctx.out("| goal | title | step | waits on | last ruling |\n|---|---|---|---|---|");
      for (const g of goals) {
        const w = g.waitsOn ? `${g.waitsOn.role}: ${g.waitsOn.holder}${g.waitsOn.deputy ? ` (deputy ${g.waitsOn.deputy})` : ""}` : g.status === "dropped" ? "dropped" : "the coding agent";
        const lr = g.lastRuling ? `${g.lastRuling.date} · ${g.lastRuling.gate} · ${g.lastRuling.ruling} · by ${g.lastRuling.by}` : "none";
        ctx.out(`| ${g.id} | ${g.title} | ${g.step} | ${w} | ${lr} |`);
      }
    }
    return 0;
  }

  if (sub === "decisions") {
    const all = kit.decisions(kit.load(root));
    if (json) ctx.json({ decisions: all });
    else if (!all.length) ctx.out("  No decisions yet.");
    else for (const d of all) ctx.out(`${d.goal} ${kit.decisionLine(d)}`);
    return 0;
  }

  if (sub === "goal") {
    const [verb, slug] = parsed.positional;
    if (verb !== "new") return ctx.usage(`loops goal takes new, not ${verb || "nothing"}`, USAGE);
    if (!slug || !SLUG.test(slug) || slug.length > 60) return ctx.usage(`the slug is lowercase words joined by dashes: ${slug || "nothing given"}`, USAGE);
    const title = (last(parsed, "--title") || "").trim();
    if (!title) return ctx.usage(`--title "<one sentence>" is required`, USAGE);
    if (/[\n\r]/.test(title) || title.includes("{{") || title.length > 200) return ctx.usage("--title is one sentence on one line, 200 characters or fewer, with no {{", USAGE);
    const r = goalNew(ctx, root, slug, title);
    if (r.fail) return refuse(r.fail);
    if (json) ctx.json(r.result);
    else {
      ctx.out(`  Opened ${r.result.id} in ${r.result.dir}.`);
      r.result.files.forEach((f) => ctx.out(`    + ${f}`));
    }
    return 0;
  }

  if (sub === "gate") {
    const [id, ruling] = parsed.positional;
    const r = gate(ctx, root, id, ruling, parsed);
    if (r.usage) return ctx.usage(r.usage, USAGE);
    if (r.fail) {
      if (r.fail.error === "not-a-holder" && !r.fail.message) {
        const w = r.fail.waitsOn;
        r.fail.message = `${r.fail.by} doesn't hold ${w.role} (holder: ${w.holder || "nobody"}${w.deputy ? `, deputy: ${w.deputy}` : ""}); nothing was written`;
      }
      return refuse(r.fail);
    }
    if (json) ctx.json(r.result);
    else {
      ctx.out(`  ${r.result.line}`);
      ctx.out(`  ${r.result.id} is now at ${r.result.step}${r.result.next ? `; next ${r.result.next}` : ""}.`);
    }
    return 0;
  }

  return ctx.usage(`unknown loops subcommand: ${sub}`, USAGE);
}

module.exports = { run, USAGE };
