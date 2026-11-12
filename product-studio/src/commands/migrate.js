"use strict";

/**
 * migrate: move an older install into this layout.
 *
 *   migrate [--dry-run]   list the deterministic moves (the default; writes nothing)
 *   migrate --apply       perform them, then print the same JSON with applied: true
 *
 * The older install kept its system in design/ (DESIGN.md, tokens.css), its rules in
 * design/guardrails.mdx, its learnings and goals under experiments/, its runtime state in
 * .systemix/ and its rule samples in design/evals/rules/.
 *
 *   design/DESIGN.md, tokens.css, … → studio/ as they are
 *   experiments/LEARNINGS.md  → studio/LEARNINGS.md, bullets rewritten to the learnings grammar
 *   experiments/goals/*       → studio/goals/G-NNN-<slug>/{goal,evals,decisions}.md
 *   design/evals/rules/*      → studio/rules/*
 *   .systemix/                → dropped (runtime state)
 *   design/guardrails.mdx     → its bullets listed for the guide to map to rule rows; never deleted
 *
 * --apply refuses when the working tree has uncommitted changes under the paths it would touch.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { parseArgs, last, problems } = require("../lib/args");
const { rel: L } = require("../lib/layout");
const { frontmatter, stringifyFrontmatter } = require("../lib/md");
const kit = require("../lib/loopkit");

const TEMPLATES = path.join(__dirname, "..", "..", "templates");
const LEARNINGS_TEMPLATE = path.join(TEMPLATES, "studio", "LEARNINGS.md");
const LOOP_TEMPLATES = path.join(TEMPLATES, "loops", "loops");
const OLD = L.legacy;
const MAX_TEXT = 300;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NEW_BULLET = /^- \*\*L-(\d{3,})\*\* · (high|medium|low) · review-by \d{4}-\d{2}-\d{2} · .+ · source: .+$/;

const USAGE = `
  Usage: migrate [--dry-run | --apply] [--root <dir>] [--json]

    --dry-run  (the default) list the moves an older install needs, writing nothing:
               ${OLD.learnings} → ${L.learnings} (bullets rewritten to the learnings grammar),
               ${OLD.goals}/* → ${L.goals}/G-NNN-<slug>/, ${OLD.evals}/* → ${L.rulesDir}/*,
               ${OLD.state}/ dropped. Lists the bullets of ${OLD.guardrails} for mapping to rule rows,
               and the learnings it could not rewrite (unmapped).
    --apply    perform the moves. Never deletes ${OLD.guardrails}. Refuses (exit 1) when the
               working tree has uncommitted changes under the paths it would touch.
`;

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const exists = (root, rel) => fs.existsSync(path.join(root, rel));
const readText = (root, rel) => fs.readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n");
const posix = (p) => p.split(path.sep).join("/");

function walk(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => {
      const p = path.join(dir, e.name);
      return e.isDirectory() ? walk(p, base) : [posix(path.relative(base, p))];
    })
    .sort();
}

// ------------------------------------------------------------------------------------------------ guardrails

/** Every bullet of guardrails.mdx outside frontmatter and code fences: [{line, text}]. */
function guardrailBullets(text) {
  const lines = text.split("\n");
  const fm = frontmatter(text).lines;
  const out = [];
  let fence = false;
  lines.forEach((l, i) => {
    if (i < fm) return;
    if (/^\s*(```|~~~)/.test(l)) fence = !fence;
    if (fence) return;
    const m = /^\s*[-*]\s+(.+?)\s*$/.exec(l);
    if (m) out.push({ line: i + 1, text: m[1] });
  });
  return out;
}

// ------------------------------------------------------------------------------------------------ learnings

const confidenceOf = (s) => {
  const m = /confidence\s*[:=]?\s*(high|medium|low|1(?:\.0+)?|0?\.\d+)\b/i.exec(s);
  if (!m) return null;
  const v = m[1].toLowerCase();
  if (["high", "medium", "low"].includes(v)) return v;
  const n = Number(v);
  return n >= 0.8 ? "high" : n >= 0.5 ? "medium" : "low";
};

/**
 * Rewrite one older bullet: `- **<date> · <text>** — confidence 0.8 · from [<id>], decision: <d>. … Review by: <date>.`
 * → { date, confidence, reviewBy, text, source } or { why } when a field is missing.
 */
function rewriteBullet(line) {
  const m = /^- \*\*(?:(\d{4}-\d{2}-\d{2})\s*·\s*)?(.+?)\*\*\s*(.*)$/.exec(line);
  if (!m) return { why: "not in the older learnings grammar (- **<date> · <text>** — …)" };
  const text = m[2].trim();
  const rest = m[3];
  const confidence = confidenceOf(rest);
  const review = /review[- ]by:?\s*(\d{4}-\d{2}-\d{2})/i.exec(rest);
  const from = /\bfrom\s+\[([^\]]+)\](?:,?\s*decision:\s*([\w-]+))?/i.exec(rest);
  const missing = [];
  if (!confidence) missing.push("a confidence");
  if (!review || !kit.validDate(review[1])) missing.push("a review-by date");
  if (!from) missing.push("a source");
  if (missing.length) return { why: `missing ${missing.join(", ")}` };
  if (/\s·\s/.test(text)) return { why: 'the text carries " · ", which separates the fields' };
  if (text.length > MAX_TEXT) return { why: `the text is ${text.length} characters (${MAX_TEXT} or fewer)` };
  const source = `${from[1].trim()}${from[2] ? `, decision: ${from[2]}` : ""}`;
  return { date: m[1] || null, confidence, reviewBy: review[1], text, source };
}

/** The studio/LEARNINGS.md the older ledger becomes, plus the bullets it could not rewrite. */
function planLearnings(root) {
  const lines = readText(root, OLD.learnings).split("\n");
  const ok = [];
  const unmapped = [];
  const kept = [];
  lines.forEach((l, i) => {
    if (!/^- /.test(l)) return;
    if (NEW_BULLET.test(l)) return kept.push({ line: i + 1, text: l });
    const r = rewriteBullet(l);
    if (r.why) unmapped.push({ line: i + 1, text: l.slice(2), why: r.why });
    else ok.push({ ...r, line: i + 1 });
  });
  const target = exists(root, L.learnings) ? readText(root, L.learnings) : fs.readFileSync(LEARNINGS_TEMPLATE, "utf8");
  const used = new Set(
    target
      .split("\n")
      .map((l) => /^- \*\*L-(\d{3,})\*\*/.exec(l))
      .filter(Boolean)
      .map((x) => Number(x[1])),
  );
  // a bullet already in the new grammar keeps its id unless the target holds it
  const out = [];
  for (const k of kept) {
    const n = Number(/^- \*\*L-(\d{3,})/.exec(k.text)[1]);
    if (used.has(n)) unmapped.push({ line: k.line, text: k.text.slice(2), why: `L-${String(n).padStart(3, "0")} is already in ${L.learnings}` });
    else {
      used.add(n);
      out.push(k.text);
    }
  }
  let next = (used.size ? Math.max(...used) : 0) + 1;
  // oldest first, so ids grow with time like `learnings add`
  ok.sort((a, b) => cmp(a.date || "", b.date || "") || b.line - a.line);
  for (const b of ok) {
    const id = `L-${String(next++).padStart(3, "0")}`;
    out.push(`- **${id}** · ${b.confidence} · review-by ${b.reviewBy} · ${b.text} · source: ${b.source}`);
  }
  const body = target.replace(/\n*$/, "\n");
  const content = out.length ? `${body}\n${out.join("\n")}\n` : body;
  unmapped.sort((a, b) => a.line - b.line);
  return { content, unmapped, rewritten: out.length };
}

// ------------------------------------------------------------------------------------------------ goals

/** Frontmatter of an older goal, with `key: >` and `key: |` blocks folded into one string. */
function legacyFrontmatter(text) {
  const { data, body, lines } = frontmatter(text);
  if (!lines) return { data, body };
  const head = text.split("\n").slice(1, lines - 1);
  for (let i = 0; i < head.length; i++) {
    const m = /^([A-Za-z_][\w-]*):\s*([>|])[+-]?\s*$/.exec(head[i]);
    if (!m) continue;
    const parts = [];
    while (i + 1 < head.length && (/^\s+\S/.test(head[i + 1]) || head[i + 1].trim() === "")) parts.push(head[++i].trim());
    data[m[1]] = m[2] === ">" ? parts.filter(Boolean).join(" ") : parts.join("\n").trim();
  }
  return { data, body };
}

/** The first step of the bundled product loop, when the repo has no loops yet. */
function templateFirstGate() {
  if (!fs.existsSync(LOOP_TEMPLATES)) return null;
  const loops = fs
    .readdirSync(LOOP_TEMPLATES)
    .filter((f) => f.endsWith("-loop.md"))
    .sort()
    .map((f) => kit.parseLoop(path.join(LOOP_TEMPLATES, f)));
  loops.sort((a, b) => (Number(a.fm.data && a.fm.data.order) || 99) - (Number(b.fm.data && b.fm.data.order) || 99) || cmp(a.file, b.file));
  const steps = {};
  for (const l of loops) for (const s of l.steps) if (l.id) steps[`${l.id}.${s.id}`] = { loop: l, step: s };
  const sys = { loops, steps, joins: [] };
  sys.flow = kit.flow(sys);
  return kit.firstGate(sys);
}

const slugify = (s) =>
  String(s)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const toBullets = (s) =>
  String(s || "")
    .split(/\n+/)
    .map((x) => x.replace(/^\s*[-*]\s+/, "").trim())
    .filter(Boolean)
    .map((x) => `- ${x}`);

function planGoals(root, today) {
  const dir = path.join(root, OLD.goals);
  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.mdx?$/.test(f) && !f.startsWith("_") && !/^readme\.mdx?$/i.test(f))
    .sort();
  const goals = files.map((f) => {
    const { data, body } = legacyFrontmatter(readText(root, `${OLD.goals}/${f}`));
    const base = f.replace(/\.mdx?$/, "");
    const slug = SLUG.test(String(data.id || "")) ? String(data.id) : slugify(data.id || base) || slugify(base) || "goal";
    return { file: `${OLD.goals}/${f}`, data, body, slug, order: Number.isFinite(Number(data.order)) ? Number(data.order) : Infinity };
  });
  goals.sort((a, b) => a.order - b.order || cmp(a.slug, b.slug) || cmp(a.file, b.file));
  const step = exists(root, L.loops) ? kit.firstGate(kit.load(root)) : templateFirstGate();
  const first = Number(kit.nextGoalId(root).slice(2));
  return goals.map((g, i) => {
    const id = `G-${String(first + i).padStart(3, "0")}`;
    const dirRel = `${L.goals}/${id}-${g.slug}`;
    const title = String(g.data.title || g.slug).trim();
    const opened = kit.validDate(String(g.data.created || "")) ? String(g.data.created) : today;
    const prose = g.body
      .split("\n")
      .filter((l) => !/^#\s/.test(l))
      .join("\n")
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const context = [
      `- Moved from ${g.file}${g.data.id ? ` (id ${g.data.id})` : ""}${g.data.status ? `, status ${g.data.status} there` : ""}.`,
      ...(g.data.icp ? [`- For: ${String(g.data.icp).trim()}.`] : []),
      ...prose.map((p) => `- ${p}`),
    ];
    const section = (name, lines) => `## ${name}\n${lines.length ? lines.join("\n") + "\n" : ""}`;
    const goal =
      stringifyFrontmatter({ id, title, status: "open", step: step || "", opened }) +
      `\n# ${title}\n\n` +
      [section("Success criteria", toBullets(g.data["success-criteria"])), section("Kill if", toBullets(g.data["kill-if"])), section("Context", context)].join("\n");
    return {
      from: g.file,
      files: [
        [`${dirRel}/goal.md`, goal],
        [`${dirRel}/evals.md`, "# Evals\n\n| id | must be true | checked by | bar | answered at | status |\n|---|---|---|---|---|---|\n"],
        [`${dirRel}/decisions.md`, "# Decisions\n\n"],
      ],
    };
  });
}

// ------------------------------------------------------------------------------------------------ plan

/**
 * Everything migrate would do: the public result plus the private steps --apply runs.
 * Steps: { write: [[to, content]], move: [[from, to]], remove: [path] }.
 */
function plan(root, today) {
  const legacy = {
    guardrails: exists(root, OLD.guardrails),
    experiments: exists(root, OLD.experiments),
    learnings: exists(root, OLD.learnings),
    goals: exists(root, OLD.goals),
    state: exists(root, OLD.state),
    evals: exists(root, OLD.evals),
    data: OLD.moved.some((e) => exists(root, `${OLD.data}/${e}`)),
  };
  const moves = [];
  const conflicts = [];
  const steps = { write: [], move: [], remove: [] };
  let unmapped = [];

  if (legacy.learnings) {
    const r = planLearnings(root);
    moves.push({ from: OLD.learnings, to: L.learnings, action: "rewrite" });
    steps.write.push([L.learnings, r.content]);
    steps.remove.push(OLD.learnings);
    unmapped = r.unmapped;
  }
  if (legacy.goals) {
    for (const g of planGoals(root, today)) {
      for (const [to, content] of g.files) {
        moves.push({ from: g.from, to, action: "create" });
        steps.write.push([to, content]);
      }
      steps.remove.push(g.from);
    }
  }
  if (legacy.evals) {
    for (const f of walk(path.join(root, OLD.evals))) {
      const from = `${OLD.evals}/${f}`;
      const to = `${L.rulesDir}/${f}`;
      if (exists(root, to)) {
        if (fs.readFileSync(path.join(root, to)).equals(fs.readFileSync(path.join(root, from)))) {
          moves.push({ from, to, action: "drop" });
          steps.remove.push(from);
        } else conflicts.push({ from, to, why: `${to} already exists with different content; the older sample stays where it is` });
        continue;
      }
      moves.push({ from, to, action: "move" });
      steps.move.push([from, to]);
    }
  }
  // the system itself: design/<entry> → studio/<entry>, file by file, never over an existing file
  for (const e of OLD.moved) {
    const base = `${OLD.data}/${e}`;
    if (!exists(root, base)) continue;
    const files = fs.statSync(path.join(root, base)).isDirectory() ? walk(path.join(root, base)).map((f) => `${e}/${f}`) : [e];
    for (const f of files) {
      const from = `${OLD.data}/${f}`;
      const to = `${L.data}/${f}`;
      if (exists(root, to)) {
        if (fs.readFileSync(path.join(root, to)).equals(fs.readFileSync(path.join(root, from)))) {
          moves.push({ from, to, action: "drop" });
          steps.remove.push(from);
        } else conflicts.push({ from, to, why: `${to} already exists with different content; the older file stays where it is` });
        continue;
      }
      moves.push({ from, to, action: "move" });
      steps.move.push([from, to]);
    }
  }
  if (legacy.state) {
    moves.push({ from: `${OLD.state}/`, to: null, action: "drop" });
    steps.remove.push(OLD.state);
  }
  moves.sort((a, b) => cmp(a.from, b.from) || cmp(a.to || "", b.to || ""));
  conflicts.sort((a, b) => cmp(a.from, b.from));
  const guardrails = legacy.guardrails ? guardrailBullets(readText(root, OLD.guardrails)) : [];
  return { result: { applied: false, moves, guardrails, unmapped, conflicts, legacy }, steps };
}

// ------------------------------------------------------------------------------------------------ apply

const git = (root, args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });

/** Paths with uncommitted changes (tracked or untracked) among the ones given; null when root is no git repo. */
function dirtyUnder(root, paths) {
  try {
    git(root, ["rev-parse", "--is-inside-work-tree"]);
  } catch {
    return null;
  }
  if (!paths.length) return [];
  const out = git(root, ["status", "--porcelain", "--untracked-files=all", "--", ...paths]);
  return out
    .split("\n")
    .filter(Boolean)
    .map((l) => l.slice(3).replace(/^"|"$/g, "").replace(/.* -> /, ""))
    .sort();
}

/** Remove now-empty folders from dir upwards, stopping at root. */
function prune(root, rel) {
  let dir = path.join(root, rel);
  while (dir.startsWith(root) && dir !== root && fs.existsSync(dir) && fs.statSync(dir).isDirectory() && fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
    dir = path.dirname(dir);
  }
}

function apply(root, steps) {
  for (const [to, content] of steps.write) {
    fs.mkdirSync(path.dirname(path.join(root, to)), { recursive: true });
    fs.writeFileSync(path.join(root, to), content);
  }
  for (const [from, to] of steps.move) {
    fs.mkdirSync(path.dirname(path.join(root, to)), { recursive: true });
    fs.renameSync(path.join(root, from), path.join(root, to));
  }
  for (const p of steps.remove) fs.rmSync(path.join(root, p), { recursive: true, force: true });
  const touched = [...steps.move.map((m) => m[0]), ...steps.remove].map((p) => path.posix.dirname(p));
  for (const d of [...new Set(touched)].sort().reverse()) prune(root, d);
}

// ------------------------------------------------------------------------------------------------ run

function report(ctx, r) {
  const verb = r.applied ? "Moved" : "Would move";
  if (!r.moves.length && !r.guardrails.length) {
    ctx.out("  Nothing to migrate: no older install found here.");
    return;
  }
  ctx.out(`  migrate${r.applied ? " --apply" : " (dry run: nothing written)"}`);
  if (r.moves.length) {
    ctx.out(`\n  ${verb} ${r.moves.length}:`);
    const w = Math.max(...r.moves.map((m) => m.action.length));
    for (const m of r.moves) ctx.out(`    ${m.action.padEnd(w)}  ${m.from}${m.to ? ` → ${m.to}` : ""}`);
  }
  if (r.guardrails.length) ctx.out(`\n  ${r.guardrails.length} bullets in ${OLD.guardrails} to map to rule rows (the file stays).`);
  if (r.unmapped.length) {
    ctx.out(`\n  ${r.unmapped.length} learnings could not be rewritten:`);
    r.unmapped.forEach((u) => ctx.out(`    line ${u.line}: ${u.why}`));
  }
  if (r.conflicts.length) {
    ctx.out(`\n  ${r.conflicts.length} left in place:`);
    r.conflicts.forEach((c) => ctx.out(`    ${c.from}: ${c.why}`));
  }
}

async function run(argv, ctx) {
  const parsed = parseArgs(argv, { bools: ["--dry-run", "--apply"] });
  if (parsed.help || parsed.positional[0] === "help") {
    ctx.out(USAGE);
    return 0;
  }
  const bad = problems(parsed);
  if (parsed.positional.length) bad.push(`migrate takes no arguments, not ${parsed.positional.join(" ")}`);
  if (parsed.bools.has("--dry-run") && parsed.bools.has("--apply")) bad.push("pass --dry-run or --apply, not both");
  if (bad.length) return ctx.usage(bad.join("; "), USAGE);
  const root = ctx.rootFrom(last(parsed, "--root"));
  const json = parsed.bools.has("--json");
  const { result, steps } = plan(root, ctx.today());

  if (parsed.bools.has("--apply")) {
    const touched = [...new Set([...result.moves.flatMap((m) => [m.from, m.to]).filter(Boolean).map((p) => p.replace(/\/$/, ""))])].sort();
    const dirty = dirtyUnder(root, touched);
    if (dirty === null || dirty.length) {
      const refusal =
        dirty === null
          ? { ok: false, error: "not-a-git-repo", message: "migrate --apply needs a git repository, so every move can be reviewed and undone; commit first", dirty: [] }
          : { ok: false, error: "dirty-tree", message: "uncommitted changes under the paths migrate would touch; commit or stash them first", dirty };
      if (json) ctx.json(refusal);
      else {
        ctx.err(`  ✗ ${refusal.message}`);
        refusal.dirty.forEach((d) => ctx.err(`    ${d}`));
      }
      return 1;
    }
    apply(root, steps);
    result.applied = true;
  }
  if (json) ctx.json(result);
  else report(ctx, result);
  return 0;
}

module.exports = { run, plan, rewriteBullet, guardrailBullets };
