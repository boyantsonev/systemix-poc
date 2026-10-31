"use strict";

/**
 * loopkit.js — the checker for the product and build loops (the Loop Kit).
 *
 * Reads design/loops/*-loop.md, roster.md, joins.md, design/context/*.md and
 * design/goals/G-NNN-<slug>/ and refuses anything malformed, so every agent session
 * reads the same truth. No dependencies: the Claude Code plugin ships this file as-is.
 * Every problem is { file, line, message }, printed as file:line: message.
 */

const fs = require("fs");
const path = require("path");

const DEFAULT_DIR = "design";
const LOOP_STATUS = ["draft", "agreed"];
const GOAL_STATUS = ["open", "building", "shipped", "dropped"];
const EVAL_STATUS = ["open", "pass", "fail", "waived"];
const GATE_ACTS = ["review", "approve", "decide"];
const STEP_KINDS = ["frame", "build", "measure", "decide", "record"];
const PACK_SECTIONS = ["What we know", "Numbers", "Open bets", "Sources", "Questions the expert would ask"];
const EVAL_HEADER = ["id", "must be true", "checked by", "bar", "answered at", "status"];
const GOAL_FIELDS = ["id", "slug", "title", "asked", "status", "step", "waiting", "lead", "repos", "opened", "updated"];
const LOOP_FIELDS = ["id", "kind", "title", "status", "awaiting", "lead", "clock", "updated"];
const DECISION_LINE = /^- \*\*(\d{4}-\d{2}-\d{2}) · ([^*]+?)\*\* (.*) \(([a-z][a-z-]*): ([^·()]+?)( as deputy)? · context ([a-z][a-z, -]*?)( · brief (B-\d{3,}))?\)$/;

// ------------------------------------------------------------------------------------------------ parsing

function readLines(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n").split("\n");
}

const unquote = (v) => v.replace(/^(["'])(.*)\1$/, "$2");

/** The small YAML subset the loop files use: key: value, key: [a, b], # comments. */
function frontmatter(lines) {
  if (lines[0] !== "---") return { data: null, end: 0, lineOf: {} };
  const data = {};
  const lineOf = {};
  let i = 1;
  for (; i < lines.length && lines[i] !== "---"; i++) {
    const m = lines[i].match(/^([A-Za-z_][\w-]*):\s*(.*?)\s*(?:#.*)?$/);
    if (!m) continue;
    let v = m[2];
    if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(",").map((s) => unquote(s.trim())).filter(Boolean);
    else v = unquote(v);
    data[m[1]] = v;
    lineOf[m[1]] = i + 1;
  }
  return { data, end: i + 1, lineOf };
}

/** `- key: value` bullets under a heading, with indented continuation lines. */
function bullets(lines, from, to) {
  const out = {};
  const lineOf = {};
  let last = null;
  for (let i = from; i < to; i++) {
    const m = lines[i].match(/^- ([a-z]+):\s*(.*)$/);
    if (m) {
      last = m[1];
      out[last] = m[2].trim();
      lineOf[last] = i + 1;
    } else if (last && /^\s{2,}\S/.test(lines[i])) {
      out[last] += " " + lines[i].trim();
    } else if (lines[i].trim() === "") {
      last = null;
    }
  }
  return { out, lineOf };
}

const list = (v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);

/** gate: <act> · <lead> [· with a, b] [· needs q] [· context p, q] */
function parseGate(text) {
  const parts = text.split("·").map((s) => s.trim());
  const gate = { act: parts[0], lead: parts[1] || "", with: [], needs: null, context: [] };
  for (const p of parts.slice(2)) {
    if (p.startsWith("with ")) gate.with = list(p.slice(5));
    else if (p.startsWith("needs ")) gate.needs = p.slice(6);
    else if (p.startsWith("context ")) gate.context = list(p.slice(8));
  }
  return gate;
}

function parseLoop(file) {
  const lines = readLines(file);
  const fm = frontmatter(lines);
  const loop = { file, fm, story: [], steps: [] };
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
  for (let i = fm.end; i < lines.length; i++) {
    const l = lines[i];
    const h2 = l.match(/^## (.+)$/);
    const h3 = l.match(/^### (.+)$/);
    if (h2) {
      close(i);
      section = h2[1].trim();
      continue;
    }
    if (section === "Story") {
      const m = l.match(/^- \*\*(.+?)\*\* — .*→\s*(.+)$/);
      if (m) loop.story.push({ phase: m[1], steps: list(m[2]), line: i + 1 });
    }
    if (section === "Steps" && h3) {
      close(i);
      const label = h3[1].replace(/\s*\(.*\)\s*$/, "").trim();
      step = { label, id: label.toLowerCase(), line: i + 1, start: i + 1 };
    }
  }
  close(lines.length);
  return loop;
}

function parseRoster(file) {
  const roles = {};
  if (!fs.existsSync(file)) return roles;
  const lines = readLines(file);
  let role = null;
  lines.forEach((l, i) => {
    const h = l.match(/^## ([a-z][a-z-]*)\s*$/);
    if (h) {
      role = { name: h[1], line: i + 1, holders: [], deputy: null, domains: [], away: null };
      roles[role.name] = role;
      return;
    }
    if (!role) return;
    const m = l.match(/^- (holder|deputy|domains|away):\s*(.*)$/);
    if (!m) return;
    if (m[1] === "holder") role.holders = m[2].split("—")[0].split(",").map((s) => s.trim()).filter(Boolean);
    if (m[1] === "deputy") role.deputy = m[2].trim();
    if (m[1] === "domains") role.domains = list(m[2]);
    if (m[1] === "away") role.away = m[2].trim();
  });
  return roles;
}

function parseJoins(file) {
  if (!fs.existsSync(file)) return [];
  const lines = readLines(file);
  const joins = [];
  lines.forEach((l, i) => {
    const m = l.match(/^### ([a-z][\w-]*)\.([a-z][\w-]*) → ([a-z][\w-]*)\.([a-z][\w-]*)\s*$/);
    if (m) joins.push({ from: `${m[1]}.${m[2]}`, to: `${m[3]}.${m[4]}`, line: i + 1, carries: [] });
    const c = l.match(/^- carries:\s*(.*)$/);
    if (c && joins.length) joins[joins.length - 1].carries = list(c[1]);
  });
  return joins;
}

/** The whole loop system under <root>/<dir>. */
function load(root, dir = DEFAULT_DIR) {
  const base = path.join(root, dir);
  const loopsDir = path.join(base, "loops");
  const loopFiles = fs.existsSync(loopsDir) ? fs.readdirSync(loopsDir).filter((f) => f.endsWith("-loop.md")).sort() : [];
  const loops = loopFiles.map((f) => parseLoop(path.join(loopsDir, f)));
  const steps = {};
  for (const l of loops) for (const s of l.steps) if (l.fm.data && l.fm.data.id) steps[`${l.fm.data.id}.${s.id}`] = { loop: l, step: s };
  return {
    root,
    dir,
    base,
    loops,
    steps,
    roster: parseRoster(path.join(loopsDir, "roster.md")),
    joins: parseJoins(path.join(loopsDir, "joins.md")),
  };
}

// ------------------------------------------------------------------------------------------------ check: loops

function checkLoops(sys) {
  const errs = [];
  const rel = (f) => path.relative(sys.root, f);
  const err = (file, line, message) => errs.push({ file: rel(file), line, message });
  const roles = sys.roster;
  const rosterFile = path.join(sys.base, "loops", "roster.md");
  const people = new Set(Object.values(roles).flatMap((r) => r.holders));

  if (!Object.keys(roles).length) err(rosterFile, 1, "roster.md is missing or names no roles");
  for (const r of Object.values(roles)) {
    for (const h of r.holders) if (/\{\{/.test(h)) err(rosterFile, r.line, `role ${r.name}: holder is still a placeholder (${h})`);
    if (r.deputy && !roles[r.deputy]) err(rosterFile, r.line, `role ${r.name}: deputy "${r.deputy}" is not a role`);
  }
  if (!sys.loops.length) err(path.join(sys.base, "loops"), 1, "no <name>-loop.md files");

  const roleCheck = (file, line, name, what) => {
    if (!name) return err(file, line, `${what}: empty`);
    if (roles[name]) return;
    if (people.has(name)) return err(file, line, `${what}: "${name}" is a person; loops name roles (see roster.md)`);
    err(file, line, `${what}: "${name}" is not a role in roster.md`);
  };
  const exists = (p) => fs.existsSync(path.join(sys.root, p));
  const packsSeen = new Set();

  for (const loop of sys.loops) {
    const d = loop.fm.data;
    if (!d) {
      err(loop.file, 1, "no frontmatter");
      continue;
    }
    for (const f of LOOP_FIELDS) if (d[f] === undefined || d[f] === "") err(loop.file, 1, `frontmatter: missing ${f}`);
    if (d.status && !LOOP_STATUS.includes(d.status)) err(loop.file, loop.fm.lineOf.status, `status "${d.status}" is not draft | agreed`);
    const awaiting = Array.isArray(d.awaiting) ? d.awaiting : list(d.awaiting);
    if (d.status === "agreed" && awaiting.length) err(loop.file, loop.fm.lineOf.status, `status agreed while awaiting [${awaiting.join(", ")}]`);
    for (const a of awaiting) roleCheck(loop.file, loop.fm.lineOf.awaiting, a, "awaiting");
    if (d.lead) roleCheck(loop.file, loop.fm.lineOf.lead, d.lead, "lead");

    const decide = loop.steps.filter((s) => s.fields.kind === "decide");
    if (decide.length !== 1) err(loop.file, 1, `exactly one decide step per loop (found ${decide.length})`);
    for (const s of decide) {
      if (!s.gate || s.gate.act !== "decide") err(loop.file, s.line, `decide step "${s.label}" needs a decide gate led by a person`);
    }

    const ids = new Set();
    for (const s of loop.steps) {
      if (ids.has(s.id)) err(loop.file, s.line, `step id "${s.id}" twice`);
      ids.add(s.id);
      const f = s.fields;
      if (!STEP_KINDS.includes(f.kind)) err(loop.file, s.line, `step "${s.label}": kind "${f.kind || ""}" is not ${STEP_KINDS.join(" | ")}`);
      if (!f.runs) err(loop.file, s.line, `step "${s.label}": missing runs`);
      else if (!["agent", "code", "world"].includes(f.runs)) {
        const r = f.runs.replace(/\s*\+\s*agent$/, "");
        roleCheck(loop.file, s.lineOf.runs, r, `step "${s.label}" runs`);
      }
      if (s.gate) {
        const g = s.gate;
        if (!GATE_ACTS.includes(g.act)) err(loop.file, s.lineOf.gate, `step "${s.label}": gate act "${g.act}" is not ${GATE_ACTS.join(" | ")}`);
        if (g.lead === "agent") err(loop.file, s.lineOf.gate, `step "${s.label}": the agent never leads a gate`);
        else roleCheck(loop.file, s.lineOf.gate, g.lead, `step "${s.label}" gate lead`);
        for (const w of g.with) roleCheck(loop.file, s.lineOf.gate, w, `step "${s.label}" gate with`);
        if ((g.act === "approve" || g.act === "decide") && !g.context.length) err(loop.file, s.lineOf.gate, `step "${s.label}": an ${g.act} gate names at least one context pack`);
        for (const pack of g.context) checkPack(sys, pack, loop.file, s.lineOf.gate, err, packsSeen);
      }
      for (const key of ["reads", "writes"]) {
        for (const p of list(f[key])) if (!exists(p)) err(loop.file, s.lineOf[key], `step "${s.label}": ${key} path ${p} does not exist`);
      }
      if (f.surface && f.surface !== "none" && !exists(f.surface)) err(loop.file, s.lineOf.surface, `step "${s.label}": surface ${f.surface} does not exist`);
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

  const joinsFile = path.join(sys.base, "loops", "joins.md");
  for (const j of sys.joins) {
    for (const end of [j.from, j.to]) if (!sys.steps[end]) err(joinsFile, j.line, `join names unknown step ${end}`);
    for (const c of j.carries) if (!exists(c)) err(joinsFile, j.line, `join carries ${c}, which does not exist`);
  }
  return errs;
}

/** A context pack exists and has the five sections; each pack is reported once per run. */
function checkPack(sys, pack, file, line, err, seen) {
  const p = path.join(sys.base, "context", `${pack}.md`);
  if (seen.has(pack)) return;
  seen.add(pack);
  if (!fs.existsSync(p)) return err(file, line, `context pack ${pack} has no ${path.relative(sys.root, p)}`);
  const lines = readLines(p);
  const heads = lines.filter((l) => /^## /.test(l)).map((l) => l.slice(3).trim());
  for (const s of PACK_SECTIONS) if (!heads.includes(s)) err(p, 1, `context pack ${pack}: missing section "## ${s}"`);
  if (lines.length > 90) err(p, 90, `context pack ${pack}: ${lines.length} lines (keep it under 90)`);
}

// ------------------------------------------------------------------------------------------------ check: goals

function goalDirs(sys) {
  const g = path.join(sys.base, "goals");
  if (!fs.existsSync(g)) return [];
  return fs.readdirSync(g, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

/** Steps in loop order, product first, so "from product.shape on" is a position. */
function stepOrder(sys) {
  const order = [];
  const sorted = [...sys.loops].sort((a, b) => (Number(a.fm.data && a.fm.data.order) || 99) - (Number(b.fm.data && b.fm.data.order) || 99));
  for (const l of sorted) for (const s of l.steps) if (l.fm.data) order.push(`${l.fm.data.id}.${s.id}`);
  return order;
}

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

function checkGoals(sys) {
  const errs = [];
  const err = (file, line, message) => errs.push({ file: path.relative(sys.root, file), line, message });
  const order = stepOrder(sys);
  const shapeAt = order.indexOf("product.shape");
  const seen = new Set();

  for (const name of goalDirs(sys)) {
    const dir = path.join(sys.base, "goals", name);
    const m = name.match(/^(G-\d{3,})-([a-z0-9]+(?:-[a-z0-9]+)*)$/);
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

    const fm = frontmatter(readLines(goalFile));
    const d = fm.data || {};
    for (const f of GOAL_FIELDS) if (!(f in d)) err(goalFile, 1, `frontmatter: missing ${f}`);
    if (d.id && d.id !== m[1]) err(goalFile, fm.lineOf.id, `id ${d.id} does not match the folder (${m[1]})`);
    if (d.slug && d.slug !== m[2]) err(goalFile, fm.lineOf.slug, `slug ${d.slug} does not match the folder (${m[2]})`);
    if (d.status && !GOAL_STATUS.includes(d.status)) err(goalFile, fm.lineOf.status, `status "${d.status}" is not ${GOAL_STATUS.join(" | ")}`);
    if (d.lead && !sys.roster[d.lead]) err(goalFile, fm.lineOf.lead, `lead "${d.lead}" is not a role in roster.md`);
    const at = d.step && sys.steps[d.step];
    if (d.step && !at) err(goalFile, fm.lineOf.step, `step "${d.step}" is not a <loop>.<step>`);
    if (d.waiting) {
      if (at && !at.step.gate) err(goalFile, fm.lineOf.waiting, `waiting is set but ${d.step} has no gate`);
      else if (at && at.step.gate.lead !== d.waiting) err(goalFile, fm.lineOf.waiting, `waiting "${d.waiting}" is not the gate lead of ${d.step} (${at.step.gate.lead})`);
    }

    // decisions first: a waived eval needs a decision line that names it
    let decisionText = "";
    if (fs.existsSync(decisionsFile)) {
      const lines = readLines(decisionsFile);
      decisionText = lines.join("\n");
      lines.forEach((l, i) => {
        if (!l.startsWith("- ")) return;
        if (!DECISION_LINE.test(l)) err(decisionsFile, i + 1, "decision line does not parse: - **YYYY-MM-DD · Title.** body (role: person[ as deputy] · context a, b[ · brief B-NNN])");
        else {
          const m = l.match(DECISION_LINE);
          const role = m[4];
          const person = m[5].trim();
          const r = sys.roster[role];
          if (!r) err(decisionsFile, i + 1, `decision line names role "${role}", which is not in roster.md`);
          else if (role === "agent" || (sys.roster.agent && sys.roster.agent.holders.includes(person))) {
            err(decisionsFile, i + 1, `decision line is ruled by the agent (${person}); a person rules every gate`);
          } else if (m[6]) {
            const dep = r.deputy && sys.roster[r.deputy];
            if (!dep) err(decisionsFile, i + 1, `${person} rules as deputy, but ${role} names no deputy role`);
            else if (!dep.holders.includes(person)) err(decisionsFile, i + 1, `${person} rules as deputy for ${role}, but does not hold its deputy role ${r.deputy}`);
          } else if (!r.holders.includes(person)) {
            err(decisionsFile, i + 1, `${person} does not hold ${role} (holders: ${r.holders.join(", ") || "none"})`);
          }
        }
      });
    }

    if (fs.existsSync(evalsFile)) {
      const t = parseTable(readLines(evalsFile));
      if (t.tables !== 1) err(evalsFile, 1, `evals.md holds ${t.tables} tables (exactly one)`);
      if (!t.header || t.header.join("|") !== EVAL_HEADER.join("|")) err(evalsFile, t.headerLine || 1, `the evals table's columns are: ${EVAL_HEADER.join(" | ")}`);
      else {
        const ids = new Set();
        for (const r of t.rows) {
          const [id, , checkedBy, bar, answeredAt, status] = r.cells;
          if (!/^E\d+$/.test(id)) err(evalsFile, r.line, `eval id "${id}" is not E<n>`);
          if (ids.has(id)) err(evalsFile, r.line, `eval id ${id} twice`);
          ids.add(id);
          if (!checkedBy || /looks good/i.test(checkedBy)) err(evalsFile, r.line, `${id}: "checked by" must be a command, script or observation`);
          if (!bar) err(evalsFile, r.line, `${id}: no bar`);
          if (!sys.steps[answeredAt]) err(evalsFile, r.line, `${id}: answered at "${answeredAt}" is not a <loop>.<step>`);
          if (!EVAL_STATUS.includes(status)) err(evalsFile, r.line, `${id}: status "${status}" is not ${EVAL_STATUS.join(" | ")}`);
          if (status === "waived" && !new RegExp(`\\b${id}\\b`).test(decisionText)) err(evalsFile, r.line, `${id} is waived but no decision line names it`);
        }
        if (t.rows.length < 5 || t.rows.length > 12) err(evalsFile, t.headerLine, `${t.rows.length} evals (five to twelve)`);
      }
    }

    const pos = order.indexOf(d.step);
    if (shapeAt >= 0 && pos >= shapeAt) {
      const artFile = path.join(dir, "artifacts.md");
      if (!fs.existsSync(artFile)) err(artFile, 1, `from product.shape on, artifacts.md is required (or the line "No pictures — <why>")`);
      else {
        const lines = readLines(artFile);
        if (!lines.some((l) => /^No pictures — \S/.test(l))) {
          const t = parseTable(lines);
          if (!t.rows.length) err(artFile, 1, "artifacts.md lists no artifact");
          for (const r of t.rows) {
            const link = r.cells[4] || "";
            const date = r.cells[5] || "";
            if (!/^(https?:\/\/|design\/)/.test(link)) err(artFile, r.line, `${r.cells[0]}: no published link`);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) err(artFile, r.line, `${r.cells[0]}: no published date`);
          }
        }
      }
    }
  }
  return errs;
}

// ------------------------------------------------------------------------------------------------ decisions + status

function decisions(sys) {
  const out = [];
  for (const name of goalDirs(sys)) {
    const f = path.join(sys.base, "goals", name, "decisions.md");
    if (!fs.existsSync(f)) continue;
    readLines(f).forEach((l, i) => {
      const m = l.match(DECISION_LINE);
      if (!m) return;
      out.push({ goal: name.match(/^G-\d+/)[0], date: m[1], title: m[2].replace(/\.$/, ""), body: m[3], role: m[4], person: m[5].trim(), deputy: Boolean(m[6]), context: list(m[7]), brief: m[9] || null, file: path.relative(sys.root, f), line: i + 1 });
    });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.goal < b.goal ? -1 : 1));
}

function status(sys) {
  const rows = [];
  const all = decisions(sys);
  for (const name of goalDirs(sys)) {
    const f = path.join(sys.base, "goals", name, "goal.md");
    if (!fs.existsSync(f)) continue;
    const d = frontmatter(readLines(f)).data || {};
    const role = d.waiting ? sys.roster[d.waiting] : null;
    const last = all.filter((x) => x.goal === d.id).slice(-1)[0] || null;
    rows.push({ id: d.id, title: d.title, status: d.status, step: d.step, waiting: d.waiting || null, holders: role ? role.holders : [], lastRuling: last ? `${last.date} · ${last.title}` : null });
  }
  const rank = { open: 0, building: 1, shipped: 2, dropped: 3 };
  return rows.sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || (a.id < b.id ? -1 : 1));
}

const format = (errs) => errs.map((e) => `${e.file}:${e.line}: ${e.message}`).join("\n");

module.exports = { load, checkLoops, checkGoals, decisions, status, format, parseLoop, parseRoster, frontmatter, DECISION_LINE, DEFAULT_DIR, PACK_SECTIONS };
