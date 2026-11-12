"use strict";

/**
 * loopkit: the reader and checker for the product and build loops.
 *
 * Reads studio/loops/*-loop.md, roster.md, joins.md, studio/context/*.md, studio/briefs/ and
 * studio/goals/G-NNN-<slug>/, and refuses anything malformed, so every session reads the same
 * picture. Every problem is { file, line, message } with a repo-relative file.
 *
 * The flow is the order a goal walks the steps: the first loop's first step, on through its
 * steps, across a join into another loop where one starts, and back. A gate is a step a person
 * rules on; a person-held step (`runs: <role> + agent`) moves on a person's ruling too.
 */

const fs = require("fs");
const path = require("path");
const { frontmatter } = require("./md");
const { rel: L } = require("./layout");

const LOOP_STATUS = ["draft", "agreed"];
const GOAL_STATUS = ["open", "building", "shipped", "dropped"];
const EVAL_STATUS = ["open", "pass", "fail", "waived"];
const GATE_ACTS = ["approve", "decide"];
const STEP_KINDS = ["frame", "build", "measure", "decide", "record"];
const RULINGS = ["approve", "rework", "drop"];
const AGENT_ROLE = "coding-agent";
const EVAL_HEADER = ["id", "must be true", "checked by", "bar", "answered at", "status"];
const GOAL_FIELDS = ["id", "title", "status", "step", "opened"];
const GOAL_SECTIONS = ["Success criteria", "Kill if", "Context"];
const LOOP_FIELDS = ["id", "kind", "title", "status", "awaiting", "lead", "clock", "updated"];
const BRIEF_FIELDS = ["id", "goal", "gate", "role", "rules", "context", "date"];
const BRIEF_SECTIONS = ["Question", "Options", "What we already know", "Sources", "Who rules"];
const PACK_MAX_LINES = 90;
const EVALS_MIN = 5;
const EVALS_MAX = 12;
const GOAL_DIR = /^(G-\d{3,})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** - <YYYY-MM-DD> · <gate> · <approve|rework|drop> · by <name> · brief: <B-NNN|none>[ · note: …] */
const DECISION_LINE = /^- (\d{4}-\d{2}-\d{2}) · ([a-z][\w-]*\.[a-z][\w-]*) · (approve|rework|drop) · by ([^·]+?) · brief: (B-\d{3,}|none)(?: · note: (.+))?$/;

// ------------------------------------------------------------------------------------------------ parsing

const readLines = (file) => fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n").split("\n");
const list = (v) => (Array.isArray(v) ? v.map(String) : v ? String(v).split(",").map((s) => s.trim()).filter(Boolean) : []);

const validDate = (s) => {
  if (!DATE.test(String(s))) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

/** Frontmatter data plus the line each key sits on (1-based). */
function fm(lines) {
  const text = lines.join("\n");
  const { data, lines: n } = frontmatter(text);
  const lineOf = {};
  if (n) {
    for (let i = 1; i < n; i++) {
      const m = /^([A-Za-z_][\w-]*):/.exec(lines[i]);
      if (m && !(m[1] in lineOf)) lineOf[m[1]] = i + 1;
    }
  }
  return { data: n ? data : null, end: n, lineOf };
}

/** `- key: value` bullets in [from, to), with indented continuation lines. */
function bullets(lines, from, to) {
  const out = {};
  const lineOf = {};
  let last = null;
  for (let i = from; i < to; i++) {
    const m = /^- ([a-z]+):\s*(.*)$/.exec(lines[i]);
    if (m) {
      last = m[1];
      out[last] = m[2].trim();
      lineOf[last] = i + 1;
    } else if (last && /^\s{2,}\S/.test(lines[i])) out[last] += " " + lines[i].trim();
    else last = null;
  }
  return { out, lineOf };
}

/** gate: <act> · <lead role> [· with a, b] [· context p, q] */
function parseGate(text) {
  const parts = text.split("·").map((s) => s.trim());
  const gate = { act: parts[0], lead: parts[1] || "", with: [], context: [] };
  for (const p of parts.slice(2)) {
    if (p.startsWith("with ")) gate.with = list(p.slice(5));
    else if (p.startsWith("context ")) gate.context = list(p.slice(8));
  }
  return gate;
}

function parseLoop(file) {
  const lines = readLines(file);
  const head = fm(lines);
  const loop = { file, fm: head, id: head.data && head.data.id ? String(head.data.id) : null, story: [], steps: [] };
  let section = null;
  let step = null;
  const close = (end) => {
    if (!step) return;
    const b = bullets(lines, step.start, end);
    step.fields = b.out;
    step.lineOf = b.lineOf;
    if (b.out.id) step.id = b.out.id;
    step.gate = b.out.gate ? parseGate(b.out.gate) : null;
    loop.steps.push(step);
    step = null;
  };
  for (let i = head.end; i < lines.length; i++) {
    const l = lines[i];
    const h2 = /^## (.+)$/.exec(l);
    const h3 = /^### (.+)$/.exec(l);
    if (h2) {
      close(i);
      section = h2[1].trim();
      continue;
    }
    if (section === "Story") {
      const m = /^- \*\*(.+?)\*\*:? .*→\s*(.+)$/.exec(l);
      if (m) loop.story.push({ phase: m[1].replace(/:$/, ""), steps: list(m[2]), line: i + 1 });
    }
    if (section === "Steps" && h3) {
      close(i);
      const label = h3[1].replace(/\s*\(.*\)\s*$/, "").trim();
      step = { label, id: label.toLowerCase().replace(/\s+/g, "-"), line: i + 1, start: i + 1 };
    }
  }
  close(lines.length);
  return loop;
}

/** ## <role> sections with - holder: a, b · - deputy: <role or name> · - domains: · - may: · - never: */
function parseRoster(file) {
  const roster = { file, exists: false, preset: null, presetLine: 1, roles: {} };
  if (!fs.existsSync(file)) return roster;
  roster.exists = true;
  const lines = readLines(file);
  const head = fm(lines);
  if (head.data) {
    roster.preset = head.data.preset === undefined ? null : String(head.data.preset);
    roster.presetLine = head.lineOf.preset || 1;
  }
  const starts = [];
  lines.forEach((l, i) => {
    const h = /^## ([a-z][a-z-]*)\s*$/.exec(l);
    if (h && i >= head.end) starts.push({ name: h[1], line: i + 1, start: i + 1 });
  });
  starts.forEach((s, k) => {
    const end = k + 1 < starts.length ? starts[k + 1].line - 1 : lines.length;
    const b = bullets(lines, s.start, end);
    roster.roles[s.name] = {
      name: s.name,
      line: s.line,
      holders: "holder" in b.out ? list(b.out.holder) : [],
      hasHolder: "holder" in b.out,
      deputy: b.out.deputy ? b.out.deputy.trim() : null,
      domains: list(b.out.domains),
      may: b.out.may || null,
      never: b.out.never || null,
      lineOf: b.lineOf,
    };
  });
  return roster;
}

function parseJoins(file) {
  if (!fs.existsSync(file)) return [];
  const joins = [];
  readLines(file).forEach((l, i) => {
    const m = /^### ([a-z][\w-]*)\.([a-z][\w-]*) → ([a-z][\w-]*)\.([a-z][\w-]*)\s*$/.exec(l);
    if (m) joins.push({ from: `${m[1]}.${m[2]}`, to: `${m[3]}.${m[4]}`, line: i + 1, carries: [] });
    const c = /^- carries:\s*(.*)$/.exec(l);
    if (c && joins.length) joins[joins.length - 1].carries = list(c[1]);
  });
  return joins;
}

/** The whole loop system under root. */
function load(root) {
  const loopsDir = path.join(root, L.loops);
  const files = fs.existsSync(loopsDir) ? fs.readdirSync(loopsDir).filter((f) => f.endsWith("-loop.md")).sort() : [];
  const loops = files.map((f) => parseLoop(path.join(loopsDir, f)));
  loops.sort((a, b) => (Number(a.fm.data && a.fm.data.order) || 99) - (Number(b.fm.data && b.fm.data.order) || 99) || (a.file < b.file ? -1 : 1));
  const steps = {};
  for (const l of loops) for (const s of l.steps) if (l.id) steps[`${l.id}.${s.id}`] = { loop: l, step: s, key: `${l.id}.${s.id}` };
  const sys = {
    root,
    hasLoops: fs.existsSync(loopsDir),
    loops,
    steps,
    roster: parseRoster(path.join(root, L.roster)),
    joins: parseJoins(path.join(loopsDir, "joins.md")),
  };
  sys.flow = flow(sys);
  return sys;
}

/** The order a goal walks the steps, following joins into another loop. */
function flow(sys) {
  const loops = sys.loops.filter((l) => l.id);
  if (!loops.length) return [];
  const byId = Object.fromEntries(loops.map((l) => [l.id, l]));
  const keys = (l) => l.steps.map((s) => `${l.id}.${s.id}`);
  const seq = [];
  const seen = new Set();
  let cur = keys(loops[0])[0];
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    seq.push(cur);
    const loopId = cur.split(".")[0];
    const j = sys.joins.find((x) => x.from === cur && sys.steps[x.to] && !seen.has(x.to) && x.to.split(".")[0] !== loopId);
    if (j) {
      cur = j.to;
      continue;
    }
    const mine = keys(byId[loopId]);
    cur = mine.slice(mine.indexOf(cur) + 1).find((k) => !seen.has(k)) || null;
  }
  for (const l of loops) for (const k of keys(l)) if (!seen.has(k)) seq.push(k);
  return seq;
}

// ------------------------------------------------------------------------------------------------ roles and rulings

/** The role whose person rules a step: its gate's lead, or the role a person-held step runs as. */
function rulingRole(sys, key) {
  const at = sys.steps[key];
  if (!at) return null;
  if (at.step.gate) return at.step.gate.lead || null;
  const runs = (at.step.fields.runs || "").replace(/\s*\+\s*agent$/, "").trim();
  if (!runs || runs === "agent" || runs === "world") return null;
  return runs;
}

/** The people a deputy entry names: the holders of a role, or the names themselves. */
function deputyPeople(sys, role) {
  const r = sys.roster.roles[role];
  if (!r || !r.deputy) return [];
  const asRole = sys.roster.roles[r.deputy];
  return asRole ? asRole.holders : list(r.deputy);
}

/** { role, holder, deputy } for a role, holder and deputy as ", "-joined names (deputy null when none). */
function whoRules(sys, role) {
  const r = sys.roster.roles[role];
  const dep = deputyPeople(sys, role);
  return { role, holder: r ? r.holders.join(", ") : "", deputy: dep.length ? dep.join(", ") : null };
}

const mayRule = (sys, role, name) => {
  const r = sys.roster.roles[role];
  return Boolean(r) && (r.holders.includes(name) || deputyPeople(sys, role).includes(name));
};

const everyone = (sys) => new Set(Object.values(sys.roster.roles).filter((r) => r.name !== AGENT_ROLE).flatMap((r) => [...r.holders, ...deputyPeople(sys, r.name)]));

/** Where a ruling moves a goal: approve → the next step in the flow; rework → back to the work; drop → stays. */
function afterRuling(sys, key, ruling) {
  const i = sys.flow.indexOf(key);
  if (ruling === "approve") return i >= 0 && i + 1 < sys.flow.length ? sys.flow[i + 1] : key;
  if (ruling === "drop") return key;
  const at = sys.steps[key];
  if (at && at.step.fields.kind === "decide") {
    const steps = at.loop.steps;
    const before = steps.slice(0, steps.indexOf(at.step)).reverse().find((s) => s.fields.kind === "build");
    if (before) return `${at.loop.id}.${before.id}`;
  }
  return key;
}

/** The status a goal takes after an approve: a decide in the first loop starts the build; a later one ships it. */
function statusAfterApprove(sys, key, current) {
  const at = sys.steps[key];
  if (!at || at.step.fields.kind !== "decide") return current;
  const first = sys.flow.length ? sys.flow[0].split(".")[0] : null;
  return at.loop.id === first ? "building" : "shipped";
}

const nextStep = (sys, key) => {
  const i = sys.flow.indexOf(key);
  return i >= 0 && i + 1 < sys.flow.length ? sys.flow[i + 1] : null;
};

/** The first gate a new goal stops at: where `loops goal new` parks it. */
const firstGate = (sys) => sys.flow.find((k) => sys.steps[k].step.gate) || sys.flow[0] || null;

// ------------------------------------------------------------------------------------------------ goals

function goalDirs(root) {
  const g = path.join(root, L.goals);
  if (!fs.existsSync(g)) return [];
  return fs.readdirSync(g, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

function findGoal(root, id) {
  const name = goalDirs(root).find((n) => n.startsWith(`${id}-`) && GOAL_DIR.test(n));
  return name ? path.join(root, L.goals, name) : null;
}

function nextGoalId(root) {
  const nums = goalDirs(root).map((n) => /^G-(\d+)-/.exec(n)).filter(Boolean).map((m) => Number(m[1]));
  return `G-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0")}`;
}

function readGoal(dir) {
  const file = path.join(dir, "goal.md");
  if (!fs.existsSync(file)) return null;
  const lines = readLines(file);
  const head = fm(lines);
  return { file, lines, data: head.data || {}, lineOf: head.lineOf, hasFrontmatter: Boolean(head.data) };
}

/** The one markdown table in a file: header, rows with cells and lines, and how many tables there are. */
function parseTable(lines) {
  const rows = [];
  let header = null;
  let headerLine = 0;
  let tables = 0;
  let inTable = false;
  lines.forEach((l, i) => {
    if (!/^\|.*\|\s*$/.test(l)) {
      inTable = false;
      return;
    }
    const cells = l.trim().slice(1, -1).split("|").map((c) => c.trim());
    if (!inTable) {
      tables++;
      inTable = true;
      if (tables === 1) {
        header = cells;
        headerLine = i + 1;
      }
      return;
    }
    if (cells.every((c) => /^:?-{3,}:?$/.test(c))) return;
    if (tables === 1) rows.push({ cells, line: i + 1 });
  });
  return { header, headerLine, rows, tables };
}

const evalRows = (dir) => {
  const f = path.join(dir, "evals.md");
  return fs.existsSync(f) ? parseTable(readLines(f)).rows.length : 0;
};

function parseDecisionLine(l) {
  const m = DECISION_LINE.exec(l);
  if (!m) return null;
  return { date: m[1], gate: m[2], ruling: m[3], by: m[4].trim(), brief: m[5], note: m[6] === undefined ? null : m[6] };
}

function decisionLine({ date, gate, ruling, by, brief, note }) {
  return `- ${date} · ${gate} · ${ruling} · by ${by} · brief: ${brief}${note ? ` · note: ${note}` : ""}`;
}

/** Every decision line across goals, sorted by date, goal and line. */
function decisions(sys) {
  const out = [];
  for (const name of goalDirs(sys.root)) {
    const m = GOAL_DIR.exec(name);
    if (!m) continue;
    const f = path.join(sys.root, L.goals, name, "decisions.md");
    if (!fs.existsSync(f)) continue;
    readLines(f).forEach((l, i) => {
      const d = parseDecisionLine(l);
      if (d) out.push({ goal: m[1], ...d, file: `${L.goals}/${name}/decisions.md`, line: i + 1 });
    });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.goal < b.goal ? -1 : a.goal > b.goal ? 1 : a.line - b.line));
}

const briefExists = (root, id) => {
  const dir = path.join(root, L.briefs);
  return fs.existsSync(dir) && fs.readdirSync(dir).some((f) => f.startsWith(`${id}-`) && f.endsWith(".md"));
};

/** One row per goal: id, slug, title, status, step, whose ruling it waits on, the last ruling. */
function status(sys) {
  const all = decisions(sys);
  const rows = [];
  for (const name of goalDirs(sys.root)) {
    const m = GOAL_DIR.exec(name);
    if (!m) continue;
    const g = readGoal(path.join(sys.root, L.goals, name));
    if (!g) continue;
    const d = g.data;
    const step = d.step ? String(d.step) : null;
    const role = d.status === "dropped" || !step ? null : rulingRole(sys, step);
    const last = all.filter((x) => x.goal === m[1]).slice(-1)[0] || null;
    rows.push({
      id: m[1],
      slug: m[2],
      title: d.title === undefined ? null : String(d.title),
      status: d.status === undefined ? null : String(d.status),
      step,
      waitsOn: role ? whoRules(sys, role) : null,
      lastRuling: last ? { date: last.date, gate: last.gate, ruling: last.ruling, by: last.by, brief: last.brief, note: last.note } : null,
    });
  }
  return rows.sort((a, b) => (a.id < b.id ? -1 : 1));
}

/** Rewrite `key: value` lines inside goal.md's frontmatter, leaving every other byte alone. */
function setGoalFields(file, fields) {
  const lines = readLines(file);
  const head = fm(lines);
  for (const [k, v] of Object.entries(fields)) {
    if (head.lineOf[k]) lines[head.lineOf[k] - 1] = `${k}: ${v}`;
    else lines.splice(head.end - 1, 0, `${k}: ${v}`);
  }
  fs.writeFileSync(file, lines.join("\n"));
}

// ------------------------------------------------------------------------------------------------ check

function makeErr(sys, errs) {
  return (file, line, message) => errs.push({ file: path.relative(sys.root, file).split(path.sep).join("/") || file, line: line || 1, message });
}

/** Paths a loop may name before they exist: the ones the layout defines. */
const LAYOUT_PATHS = new Set(Object.values(L).filter((v) => typeof v === "string"));

function placeholders(sys, rels, err) {
  const walk = (p) => {
    if (!fs.existsSync(p)) return;
    if (fs.statSync(p).isDirectory()) {
      for (const e of fs.readdirSync(p).sort()) walk(path.join(p, e));
      return;
    }
    if (!/\.(md|mdx|txt|json|ya?ml)$/i.test(p)) return;
    readLines(p).forEach((l, i) => {
      if (l.includes("{{")) err(p, i + 1, `an unfilled placeholder: ${(l.match(/\{\{[^}]*\}?\}?/) || ["{{"])[0]}`);
    });
  };
  for (const r of rels) walk(path.join(sys.root, r));
}

function checkRoster(sys, err) {
  const R = sys.roster;
  const file = path.join(sys.root, L.roster);
  if (!R.exists) return err(file, 1, "roster.md is missing: run loops init");
  if (!["solo", "team"].includes(R.preset)) err(file, R.presetLine, `frontmatter: preset "${R.preset || ""}" is not solo | team`);
  const people = Object.values(R.roles).filter((r) => r.name !== AGENT_ROLE);
  if (!people.length) err(file, 1, "roster.md names no roles");
  for (const r of people) {
    if (!r.holders.length) err(file, r.lineOf.holder || r.line, `role ${r.name}: no holder`);
    for (const h of r.holders) if (/claude|coding agent|^agent$/i.test(h)) err(file, r.lineOf.holder, `role ${r.name}: "${h}" is the coding agent; a person holds every role`);
    if (r.deputy) {
      if (R.preset === "solo") err(file, r.lineOf.deputy, `role ${r.name}: the solo preset has no deputy`);
      if (r.deputy === r.name) err(file, r.lineOf.deputy, `role ${r.name}: a role cannot deputise for itself`);
    }
  }
  if (R.preset === "solo") {
    const names = new Set(people.flatMap((r) => r.holders));
    if (names.size > 1) err(file, 1, `the solo preset has one person in every role (found ${[...names].sort().join(", ")})`);
  }
  const agent = R.roles[AGENT_ROLE];
  if (!agent) err(file, 1, `roster.md has no ## ${AGENT_ROLE} section (the coding agent: what it may and never does)`);
  else {
    if (agent.hasHolder) err(file, agent.lineOf.holder, "the coding agent holds no role and no gate; remove its holder line");
    if (!agent.may) err(file, agent.line, "the coding agent: no may: line");
    else if (/\bmerg/i.test(agent.may)) err(file, agent.lineOf.may, "the coding agent may never merge; take merge out of its may: line");
    if (!agent.never) err(file, agent.line, "the coding agent: no never: line");
  }
}

function checkPack(sys, pack, err, from) {
  const p = path.join(sys.root, L.context, `${pack}.md`);
  if (!fs.existsSync(p)) {
    if (from) err(from.file, from.line, `context pack ${pack} has no ${L.context}/${pack}.md`);
    return;
  }
  const lines = readLines(p);
  const firstH2 = lines.findIndex((l) => /^## /.test(l));
  if (!lines.some((l) => /^## Questions\b/.test(l))) err(p, 1, `context pack ${pack}: no "## Questions …" section (what this pack's holder would ask)`);
  if (lines.length > PACK_MAX_LINES) err(p, PACK_MAX_LINES, `context pack ${pack}: ${lines.length} lines (keep it under ${PACK_MAX_LINES})`);
  lines.slice(0, firstH2 < 0 ? lines.length : firstH2).forEach((l, i) => {
    if (/^- /.test(l) && !/\(source: [^)]+\)\s*$/.test(l)) err(p, i + 1, `context pack ${pack}: a fact without its source; end it with (source: <file, or who said it and when>)`);
  });
}

function checkLoops(sys) {
  const errs = [];
  const err = makeErr(sys, errs);
  const loopsDir = path.join(sys.root, L.loops);
  if (!sys.hasLoops) {
    err(loopsDir, 1, `no ${L.loops}/: run loops init`);
    return errs;
  }
  placeholders(sys, [L.loops, L.context], err);
  checkRoster(sys, err);
  const roles = sys.roster.roles;
  const people = everyone(sys);
  if (!sys.loops.length) err(loopsDir, 1, "no <name>-loop.md files");

  const roleCheck = (file, line, name, what) => {
    if (!name) return err(file, line, `${what}: empty`);
    if (name === AGENT_ROLE || name === "agent") return err(file, line, `${what}: the coding agent never holds a gate or a person's step`);
    if (roles[name]) return;
    if (people.has(name)) return err(file, line, `${what}: "${name}" is a person; loops name roles (see roster.md)`);
    err(file, line, `${what}: "${name}" is not a role in roster.md`);
  };
  const exists = (p) => LAYOUT_PATHS.has(p) || fs.existsSync(path.join(sys.root, p));
  const packs = new Set();
  const loopIds = new Set();

  for (const loop of sys.loops) {
    const d = loop.fm.data;
    if (!d) {
      err(loop.file, 1, "no frontmatter");
      continue;
    }
    for (const f of LOOP_FIELDS) if (d[f] === undefined || d[f] === "") err(loop.file, 1, `frontmatter: missing ${f}`);
    if (loop.id && loopIds.has(loop.id)) err(loop.file, loop.fm.lineOf.id, `loop id "${loop.id}" twice`);
    if (loop.id) loopIds.add(loop.id);
    if (d.status && !LOOP_STATUS.includes(d.status)) err(loop.file, loop.fm.lineOf.status, `status "${d.status}" is not draft | agreed`);
    const awaiting = list(d.awaiting);
    if (d.status === "agreed" && awaiting.length) err(loop.file, loop.fm.lineOf.status, `status agreed while awaiting [${awaiting.join(", ")}]`);
    for (const a of awaiting) roleCheck(loop.file, loop.fm.lineOf.awaiting, a, "awaiting");
    if (d.lead) roleCheck(loop.file, loop.fm.lineOf.lead, d.lead, "lead");
    if (d.updated !== undefined && !validDate(String(d.updated))) err(loop.file, loop.fm.lineOf.updated, `updated "${d.updated}" is not a YYYY-MM-DD date`);

    const decide = loop.steps.filter((s) => s.fields.kind === "decide");
    if (decide.length !== 1) err(loop.file, 1, `exactly one decide step per loop (found ${decide.length})`);
    for (const s of decide) if (!s.gate || s.gate.act !== "decide") err(loop.file, s.line, `decide step "${s.label}" needs a decide gate led by a person`);
    if (!loop.steps.length) err(loop.file, 1, "no steps under ## Steps");

    const ids = new Set();
    for (const s of loop.steps) {
      if (ids.has(s.id)) err(loop.file, s.line, `step id "${s.id}" twice`);
      ids.add(s.id);
      const f = s.fields;
      if (!STEP_KINDS.includes(f.kind)) err(loop.file, s.line, `step "${s.label}": kind "${f.kind || ""}" is not ${STEP_KINDS.join(" | ")}`);
      if (!f.runs) err(loop.file, s.line, `step "${s.label}": missing runs`);
      else if (!["agent", "world"].includes(f.runs)) roleCheck(loop.file, s.lineOf.runs, f.runs.replace(/\s*\+\s*agent$/, ""), `step "${s.label}" runs`);
      if (s.gate) {
        const g = s.gate;
        if (!GATE_ACTS.includes(g.act)) err(loop.file, s.lineOf.gate, `step "${s.label}": gate act "${g.act}" is not ${GATE_ACTS.join(" | ")}`);
        roleCheck(loop.file, s.lineOf.gate, g.lead, `step "${s.label}" gate lead`);
        for (const w of g.with) roleCheck(loop.file, s.lineOf.gate, w, `step "${s.label}" gate with`);
        if (!g.context.length) err(loop.file, s.lineOf.gate, `step "${s.label}": a gate names at least one context pack`);
        for (const pack of g.context) {
          if (!packs.has(pack)) checkPack(sys, pack, err, { file: loop.file, line: s.lineOf.gate });
          packs.add(pack);
        }
      }
      for (const key of ["reads", "writes"]) {
        for (const p of list(f[key])) {
          if (path.isAbsolute(p) || p.split("/").includes("..")) err(loop.file, s.lineOf[key], `step "${s.label}": ${key} path ${p} is outside the repo`);
          else if (!exists(p)) err(loop.file, s.lineOf[key], `step "${s.label}": ${key} path ${p} does not exist`);
        }
      }
    }

    const inStory = {};
    for (const ph of loop.story) {
      for (const id of ph.steps) {
        if (!ids.has(id)) err(loop.file, ph.line, `Story phase "${ph.phase}" names unknown step "${id}"`);
        inStory[id] = (inStory[id] || 0) + 1;
      }
    }
    for (const s of loop.steps) {
      if (!inStory[s.id]) err(loop.file, s.line, `step "${s.label}" is in no Story phase`);
      else if (inStory[s.id] > 1) err(loop.file, s.line, `step "${s.label}" is in ${inStory[s.id]} Story phases`);
    }
  }

  const ctxDir = path.join(sys.root, L.context);
  if (fs.existsSync(ctxDir)) {
    for (const f of fs.readdirSync(ctxDir).filter((x) => x.endsWith(".md") && x !== "README.md").sort()) {
      const pack = f.slice(0, -3);
      if (!packs.has(pack)) checkPack(sys, pack, err, null);
    }
  }

  const joinsFile = path.join(loopsDir, "joins.md");
  for (const j of sys.joins) {
    for (const end of [j.from, j.to]) if (!sys.steps[end]) err(joinsFile, j.line, `join names unknown step ${end}`);
    for (const c of j.carries) if (!exists(c)) err(joinsFile, j.line, `join carries ${c}, which does not exist`);
  }
  return errs;
}

function checkGoals(sys) {
  const errs = [];
  const err = makeErr(sys, errs);
  placeholders(sys, [L.goals], err);
  const seen = new Set();
  const people = everyone(sys);
  const first = firstGate(sys);
  const firstAt = sys.flow.indexOf(first);

  for (const name of goalDirs(sys.root)) {
    const dir = path.join(sys.root, L.goals, name);
    const m = GOAL_DIR.exec(name);
    if (!m) {
      err(dir, 1, `goal folder "${name}" is not G-NNN-<slug>`);
      continue;
    }
    if (seen.has(m[1])) err(dir, 1, `goal id ${m[1]} used twice`);
    seen.add(m[1]);
    const goalFile = path.join(dir, "goal.md");
    const evalsFile = path.join(dir, "evals.md");
    const decisionsFile = path.join(dir, "decisions.md");
    for (const f of [goalFile, evalsFile, decisionsFile]) if (!fs.existsSync(f)) err(f, 1, `missing ${path.basename(f)}`);
    if (!fs.existsSync(goalFile)) continue;

    const g = readGoal(dir);
    const d = g.data;
    if (!g.hasFrontmatter) err(goalFile, 1, "no frontmatter");
    for (const f of GOAL_FIELDS) if (!(f in d) || d[f] === "" || d[f] === null) err(goalFile, 1, `frontmatter: missing ${f}`);
    if (d.id && d.id !== m[1]) err(goalFile, g.lineOf.id, `id ${d.id} does not match the folder (${m[1]})`);
    if (d.status && !GOAL_STATUS.includes(d.status)) err(goalFile, g.lineOf.status, `status "${d.status}" is not ${GOAL_STATUS.join(" | ")}`);
    if (d.opened && !validDate(String(d.opened))) err(goalFile, g.lineOf.opened, `opened "${d.opened}" is not a YYYY-MM-DD date`);
    const step = d.step ? String(d.step) : null;
    const hasLoops = sys.loops.length > 0;
    if (step && hasLoops && !sys.steps[step]) err(goalFile, g.lineOf.step, `step "${step}" is not a <loop>.<step> in ${L.loops}/`);
    const heads = g.lines.filter((l) => /^## /.test(l)).map((l) => l.slice(3).trim());
    for (const s of GOAL_SECTIONS) if (!heads.includes(s)) err(goalFile, 1, `missing section "## ${s}"`);
    const pos = step ? sys.flow.indexOf(step) : -1;

    let lines = [];
    if (fs.existsSync(decisionsFile)) {
      lines = readLines(decisionsFile);
      lines.forEach((l, i) => {
        if (!l.startsWith("- ")) return;
        const x = parseDecisionLine(l);
        if (!x) return err(decisionsFile, i + 1, "decision line does not parse: - YYYY-MM-DD · <loop>.<step> · approve|rework|drop · by <name> · brief: B-NNN|none[ · note: …]");
        if (!validDate(x.date)) err(decisionsFile, i + 1, `${x.date} is not a date`);
        if (!hasLoops) return;
        if (!sys.steps[x.gate]) err(decisionsFile, i + 1, `gate ${x.gate} is not a <loop>.<step>`);
        else if (!rulingRole(sys, x.gate)) err(decisionsFile, i + 1, `${x.gate} has no gate and no person's role; nobody rules on it`);
        if (sys.roster.exists && !people.has(x.by)) err(decisionsFile, i + 1, `${x.by} is not a person in roster.md; a person rules every gate`);
        if (x.brief !== "none" && !briefExists(sys.root, x.brief)) err(decisionsFile, i + 1, `brief ${x.brief} has no file in ${L.briefs}/`);
      });
    }
    const ruled = lines.map(parseDecisionLine).filter(Boolean);

    // only a person's approve moves a goal past a gate
    if (pos >= 0 && d.status !== "dropped") {
      for (const k of sys.flow.slice(0, pos)) {
        if (sys.steps[k].step.gate && !ruled.some((x) => x.gate === k && x.ruling === "approve")) {
          err(goalFile, g.lineOf.step, `step ${step} is past the ${k} gate, but no approve line for ${k} is in decisions.md`);
        }
      }
    }
    if (d.status === "dropped" && !ruled.some((x) => x.ruling === "drop")) err(goalFile, g.lineOf.status, "status dropped, but no drop line is in decisions.md");

    if (fs.existsSync(evalsFile)) {
      const t = parseTable(readLines(evalsFile));
      if (t.tables !== 1) err(evalsFile, 1, `evals.md holds ${t.tables} tables (exactly one)`);
      if (!t.header || t.header.join("|") !== EVAL_HEADER.join("|")) err(evalsFile, t.headerLine || 1, `the evals table's columns are: ${EVAL_HEADER.join(" | ")}`);
      else {
        const ids = new Set();
        const decisionText = lines.join("\n");
        for (const r of t.rows) {
          const [id, mustBe, checkedBy, bar, answeredAt, st] = r.cells;
          if (!/^E\d+$/.test(id || "")) err(evalsFile, r.line, `eval id "${id || ""}" is not E<n>`);
          if (ids.has(id)) err(evalsFile, r.line, `eval id ${id} twice`);
          ids.add(id);
          if (!mustBe) err(evalsFile, r.line, `${id}: "must be true" is empty`);
          if (!checkedBy || /looks good/i.test(checkedBy)) err(evalsFile, r.line, `${id}: "checked by" must be a command, script or observation`);
          if (!bar) err(evalsFile, r.line, `${id}: no bar`);
          if (hasLoops ? !sys.steps[answeredAt] : !/^[a-z][\w-]*\.[a-z][\w-]*$/.test(answeredAt || "")) err(evalsFile, r.line, `${id}: answered at "${answeredAt || ""}" is not a <loop>.<step>`);
          if (!EVAL_STATUS.includes(st)) err(evalsFile, r.line, `${id}: status "${st || ""}" is not ${EVAL_STATUS.join(" | ")}`);
          if (st === "waived" && !new RegExp(`\\b${id}\\b`).test(decisionText)) err(evalsFile, r.line, `${id} is waived but no decision line names it`);
        }
        // a goal still at its first gate may have an empty table while the evals are drafted
        const drafting = t.rows.length === 0 && pos >= 0 && pos <= firstAt && !ruled.some((x) => x.ruling === "approve");
        if (!drafting && (t.rows.length < EVALS_MIN || t.rows.length > EVALS_MAX)) err(evalsFile, t.headerLine, `${t.rows.length} evals (${EVALS_MIN} to ${EVALS_MAX})`);
      }
    }
  }
  return errs;
}

function checkBriefs(sys) {
  const errs = [];
  const err = makeErr(sys, errs);
  const dir = path.join(sys.root, L.briefs);
  if (!fs.existsSync(dir)) return errs;
  const seen = new Set();
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".md") && x !== "README.md").sort()) {
    const file = path.join(dir, f);
    const m = /^(B-\d{3,})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.exec(f);
    if (!m) {
      err(file, 1, `brief file "${f}" is not B-NNN-<slug>.md`);
      continue;
    }
    if (seen.has(m[1])) err(file, 1, `brief id ${m[1]} used twice`);
    seen.add(m[1]);
    const lines = readLines(file);
    const head = fm(lines);
    const d = head.data || {};
    if (!head.data) err(file, 1, "no frontmatter");
    for (const k of BRIEF_FIELDS) if (!(k in d) || d[k] === "" || d[k] === null) err(file, 1, `frontmatter: missing ${k}`);
    if (d.id && d.id !== m[1]) err(file, head.lineOf.id, `id ${d.id} does not match the file name (${m[1]})`);
    if (d.goal && d.goal !== "question" && !/^G-\d{3,}$/.test(String(d.goal))) err(file, head.lineOf.goal, `goal "${d.goal}" is not G-NNN or question`);
    if (d.gate && d.gate !== "question" && !sys.steps[d.gate]) err(file, head.lineOf.gate, `gate "${d.gate}" is not a <loop>.<step> or question`);
    if (d.role && !sys.roster.roles[d.role]) err(file, head.lineOf.role, `role "${d.role}" is not in roster.md`);
    if (d.date && !validDate(String(d.date))) err(file, head.lineOf.date, `date "${d.date}" is not a YYYY-MM-DD date`);
    const heads = lines.filter((l) => /^## /.test(l)).map((l) => l.slice(3).trim());
    for (const s of BRIEF_SECTIONS) if (!heads.includes(s)) err(file, 1, `missing section "## ${s}"`);
  }
  return errs;
}

const sortProblems = (errs) =>
  errs.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line || (a.message < b.message ? -1 : a.message > b.message ? 1 : 0)));

const format = (errs) => errs.map((e) => `${e.file}:${e.line}: ${e.message}`).join("\n");

module.exports = {
  load,
  flow,
  checkLoops,
  checkGoals,
  checkBriefs,
  sortProblems,
  decisions,
  status,
  format,
  rulingRole,
  whoRules,
  mayRule,
  afterRuling,
  statusAfterApprove,
  nextStep,
  firstGate,
  goalDirs,
  findGoal,
  nextGoalId,
  readGoal,
  setGoalFields,
  evalRows,
  briefExists,
  decisionLine,
  parseDecisionLine,
  parseRoster,
  parseLoop,
  validDate,
  DECISION_LINE,
  RULINGS,
  AGENT_ROLE,
  EVALS_MIN,
  EVALS_MAX,
  GOAL_SECTIONS,
};
