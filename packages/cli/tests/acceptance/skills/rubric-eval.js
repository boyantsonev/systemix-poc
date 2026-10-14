"use strict";

/**
 * rubric-eval.js: the reference evaluator for rubric v1 (rubric-language/2).
 *
 * The three audit skills publish their scoring as data (a fenced JSON block between HTML-comment markers inside the
 * SKILL.md that owns it). This file reads those blocks and computes every score from a counters report
 * (`systemix audit counters`), so the skill text is provably computable. Nothing here reads a repo, a clock or a
 * model: scores are a pure function of (counters report, rubric).
 *
 * No counters, no score. `evaluate()` prints no number unless the report is whole (not a slice, no skipped group, no
 * absent counter, the asked-for folders exist, the right schema and major), the audited folders hold styling code, and
 * the audit saw most of the source-looking files under them. Otherwise it returns `scored: false`, the reasons, and
 * null in place of every score. `evaluateAll()` computes everything regardless (tests, diagnostics) and says so.
 *
 * The expression language (rubric-language/2):
 *
 *   term      "counter.id"                    the counter's value (boolean -> 1/0); null or absent -> not rated
 *             "counter.id#detail.path"        a number inside the counter's `detail`
 *             "id!"                           the counter without the files the guardrails declare exempt (id_excluding_exempt, else
 *                                             detail.exempt.excludingExemptFiles), when the exemption is within the cap
 *                                             (guards.exemption_cap of the audited files); else the counter itself
 *             "a|b|c"                         first alternative that yields a number
 *             "@name"                         a value the block derives (block.derived.name)
 *   expr      number | term
 *             { sum: [expr] }  { sub: [expr] } (first minus the rest, floored at 0)  { min: [expr] }  { max: [expr] }
 *             { if: {sum_of: [expr], when}, then: expr, else: expr }
 *             { mapped: {counter, path, names, class_prefix, name_prefixes} }   sum of detail[path][class] over the classes
 *                 `<class_prefix><x>` for which `<name_prefix><x>` is listed in the detail.names of the `names` counter
 *             { detail_sum: {counter, path, keys} }                              sum of detail[path][key] over keys
 *             { detail_count: {counter, path} }                                  the number of entries (array items or object keys) at detail[path]
 *   measure   an expr | { counter: expr } | { ratio: {...} } | { mean_ratio: {...} }
 *             ratio: { num: [expr], den: [expr], num_op?: "sum"|"max", num_if?: gate, one_minus?, scale?, clamp?,
 *                      min_den?, min_den_note?, zero: n|null, zero_note }
 *                 value = (one_minus ? den - num : num) * scale / den. den = 0, or den < min_den, gives `zero`
 *             mean_ratio: { parts: [ratio + {id,label,unit,requires?}], zero, zero_note }  mean of the rated parts
 *   gate      { sum_of: [expr], when, note? } | { measure, when, note? } | { gate: "name" } (block.gates.name)
 *   item      { id, max, direction, requires?: [gate], ceilings?: [{if: gate, max_points, text}], measure, bands: [{when, pts}] }
 *   band      when = ">= n" | "> n" | "<= n" | "< n" | "== n" | "true" | "false" | "else"; first match wins
 *   banding   always on the exact value, never on a rounded one; published scores are rounded half-up once, at the end
 *   compare   every comparison tolerates 1e-9, so an edge such as 0.85 is hit by 0.85 however it was computed
 */

const fs = require("node:fs");
const path = require("node:path");

const LANGUAGE = "rubric-language/2";
const EPS = 1e-9;
const roundHalfUp = (x) => Math.floor(x + 0.5 + EPS);
const sumOf = (a) => a.reduce((s, n) => s + n, 0);

const OPS = {
  ">=": (a, b) => a >= b - EPS,
  "<=": (a, b) => a <= b + EPS,
  ">": (a, b) => a > b + EPS,
  "<": (a, b) => a < b - EPS,
  "==": (a, b) => Math.abs(a - b) <= EPS,
};
const WHEN_RE = /^\s*(>=|<=|==|>|<)\s*(-?\d+(?:\.\d+)?)\s*$/;

function parseWhen(when) {
  if (when === "else") return { op: "else" };
  if (when === "true") return { op: "==", n: 1 };
  if (when === "false") return { op: "==", n: 0 };
  const m = WHEN_RE.exec(String(when));
  if (!m) throw new Error(`rubric: cannot read the condition "${when}"`);
  return { op: m[1], n: Number(m[2]) };
}
const holds = (when, v) => {
  const w = parseWhen(when);
  return w.op === "else" ? true : OPS[w.op](v, w.n);
};

// one fact under two ids (counters README, "Where one fact has two names"): the ownership test treats each pair as one
const ALIASES = {
  "docs.spine.guardrails_mdx": "guardrails.file.exists",
  "docs.spine.design_md": "decisions.design_md.exists",
  "colour.scanner.files_audited": "census.files.audited",
};
const canonicalId = (id) => ALIASES[id] || id;

// ---------------------------------------------------------------------------------------------------- terms

const dig = (obj, p) => p.split(".").reduce((v, k) => (v !== null && typeof v === "object" ? v[k] : undefined), obj);

/** A context over one report for one owner block (its gates, derived values and guards). Throws on a duplicate id. */
function makeCtx(report, bump = {}, block = {}) {
  if (!report || !Array.isArray(report.counters)) throw new TypeError("not a counters report: no counters array");
  const byId = new Map();
  for (const c of report.counters) {
    if (!c || typeof c.id !== "string") continue; // reported by integrityNotes
    if (byId.has(c.id)) throw new Error(`not a valid counters report: counter id ${c.id} appears twice`);
    byId.set(c.id, c);
  }
  const ctx = { byId, bump, gates: block.gates || {}, derived: block.derived || {}, guards: block.guards || {}, report };
  ctx.exempt = exemptionState(ctx);
  return ctx;
}

function plainNumber(ctx, id) {
  const c = ctx.byId.get(id);
  if (!c) return null;
  const v = typeof c.value === "boolean" ? (c.value ? 1 : 0) : c.value;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** The declared exemption and whether it is within the cap: a larger one is ignored (the plain counts are used). */
function exemptionState(ctx) {
  const cap = ctx.guards.exemption_cap;
  const files = plainNumber(ctx, "typography.exempt.files");
  const audited = plainNumber(ctx, "census.files.audited");
  const share = files !== null && audited ? files / audited : null;
  const applied = cap === undefined || share === null || files === 0 ? true : share <= cap + EPS;
  return { files, audited, share, cap: cap === undefined ? null : cap, applied };
}

// a bump moves one term by one unit; a ratio counter moves by one numerator unit, a count never goes below 0
function bumped(c, sub, v, d) {
  if (!sub && c.unit === "ratio" && c.detail && Number.isFinite(c.detail.numerator) && c.detail.denominator > 0) {
    return Math.max(0, c.detail.numerator + d) / c.detail.denominator;
  }
  return Math.max(0, v + d);
}

// "id!" = the counter without the declared-exempt files when it carries that split and the exemption is within the cap
const expandWith = (ctx, spec) => {
  if (!spec.endsWith("!")) return spec;
  const id = spec.slice(0, -1);
  // typography.arbitrary_size.{matches,files,lines} have a counter of their own for the split; the others carry it in detail
  return ctx.exempt.applied ? `${id}_excluding_exempt|${id}#exempt.excludingExemptFiles|${id}` : id;
};
const expandAll = (spec) => (spec.endsWith("!") ? `${spec.slice(0, -1)}#exempt.excludingExemptFiles|${spec.slice(0, -1)}` : spec);

function term(ctx, spec) {
  let present = false;
  for (const alt of expandWith(ctx, spec).split("|")) {
    const i = alt.indexOf("#");
    const id = i < 0 ? alt : alt.slice(0, i);
    const sub = i < 0 ? null : alt.slice(i + 1);
    const c = ctx.byId.get(id);
    if (!c) continue;
    present = true;
    let v = sub ? dig(c.detail, sub) : c.value;
    const bool = typeof v === "boolean";
    if (bool) v = v ? 1 : 0;
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    const d = ctx.bump[spec] || 0;
    return { ok: true, spec, id, tag: sub ? `${id}#${sub}` : id, value: d && !bool ? bumped(c, sub, v, d) : v, bool };
  }
  return { ok: false, spec, absent: !present };
}

// keys whose values are term specs (measures, gates, expressions, severity lists, drift classes, guards)
const SPEC_KEYS = new Set([
  "counter", "sum", "sum_of", "sub", "min", "max", "num", "den", "hits", "files", "dirty_files", "audited_files", "scanner_tally", "total", "parts",
  "names", "then", "else", "any_type", "census",
]);

/** All term specs a node mentions, as written ("@name" and "id!" included). */
function collectSpecs(node, acc = new Set()) {
  if (Array.isArray(node)) node.forEach((n) => collectSpecs(n, acc));
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (SPEC_KEYS.has(k)) [].concat(v).forEach((s) => (typeof s === "string" ? acc.add(s) : collectSpecs(s, acc)));
      else collectSpecs(v, acc);
    }
  }
  return acc;
}
const specIds = (spec) => (spec.startsWith("@") ? [] : [...new Set(expandAll(spec).split("|").map((a) => a.split("#")[0]))]);

/** Every leaf term spec reachable from `node` in `block`, following "@derived" values and { gate } references. */
function leafSpecs(block, node, acc = new Set(), seen = new Set(), withDerived = false, skip = null) {
  const visit = (n) => {
    if (Array.isArray(n)) n.forEach(visit);
    else if (n && typeof n === "object") {
      if (typeof n.gate === "string" && !seen.has(`g:${n.gate}`)) {
        seen.add(`g:${n.gate}`);
        if (block.gates && block.gates[n.gate]) visit(block.gates[n.gate]);
      }
      for (const [k, v] of Object.entries(n)) {
        if (skip && skip.has(k)) continue;
        if (SPEC_KEYS.has(k)) {
          for (const s of [].concat(v)) {
            if (typeof s === "string") {
              if (s.startsWith("@")) {
                if (withDerived) acc.add(s);
                if (!seen.has(s)) {
                  seen.add(s);
                  if (block.derived && block.derived[s.slice(1)] !== undefined) visit(block.derived[s.slice(1)]);
                }
              } else acc.add(s);
            } else visit(s);
          }
        } else visit(v);
      }
    }
  };
  visit(node);
  return acc;
}

/** The specs a near-threshold probe moves by one unit: the leaves, and the derived values ("one more dirty file"). */
const probeSpecs = (block, node) => leafSpecs(block, node, new Set(), new Set(), true);

// ---------------------------------------------------------------------------------------------------- expressions

const newOut = () => ({ inputs: [], missing: [], na: [] });

function evalExpr(ctx, e, out, depth = 0) {
  if (depth > 16) throw new Error("rubric: expression nested too deep (a derived value that refers to itself?)");
  if (typeof e === "number") return e;
  if (typeof e === "string") {
    if (e.startsWith("@")) {
      const def = ctx.derived[e.slice(1)];
      if (def === undefined) throw new Error(`rubric: unknown derived value ${e}`);
      const v = evalExpr(ctx, def, out, depth + 1);
      const d = ctx.bump[e] || 0;
      return d && v !== null ? Math.max(0, v + d) : v; // a probe can move a derived value ("one more dirty file") by one unit too
    }
    const t = term(ctx, e);
    if (!t.ok) {
      (t.absent ? out.missing : out.na).push(e);
      return null;
    }
    out.inputs.push({ spec: e, id: t.id, tag: t.tag, value: t.value });
    return t.value;
  }
  if (!e || typeof e !== "object") throw new Error("rubric: cannot read the expression " + JSON.stringify(e));
  const all = (list) => {
    const vals = list.map((x) => evalExpr(ctx, x, out, depth + 1));
    return vals.some((v) => v === null) ? null : vals;
  };
  if (e.sum) { const v = all(e.sum); return v && sumOf(v); }
  if (e.sub) { const v = all(e.sub); return v && Math.max(0, v[0] - sumOf(v.slice(1))); }
  if (e.min) { const v = all(e.min); return v && Math.min(...v); }
  if (e.max) { const v = all(e.max); return v && Math.max(...v); }
  if (e.if) {
    const v = all(e.if.sum_of);
    if (v === null) return null;
    return evalExpr(ctx, holds(e.if.when, sumOf(v)) ? e.then : e.else, out, depth + 1);
  }
  if (e.mapped) {
    const m = e.mapped;
    const c = ctx.byId.get(m.counter);
    const n = ctx.byId.get(m.names);
    if (!c || !n) { out.missing.push(!c ? m.counter : m.names); return null; }
    const classes = dig(c.detail, m.path);
    const names = n.detail && n.detail.names;
    if (!classes || typeof classes !== "object" || !Array.isArray(names)) { out.na.push(`${m.counter}#${m.path}`); return null; }
    let total = 0;
    for (const [cls, count] of Object.entries(classes)) {
      if (!cls.startsWith(m.class_prefix)) continue;
      const rest = cls.slice(m.class_prefix.length);
      if (m.name_prefixes.some((p) => names.includes(p + rest))) total += Number(count) || 0;
    }
    out.inputs.push({ spec: `mapped(${m.counter}#${m.path}, ${m.names}#names)`, id: m.counter, tag: `${m.counter}#${m.path}`, value: total });
    return total;
  }
  if (e.detail_count) {
    const m = e.detail_count;
    const c = ctx.byId.get(m.counter);
    if (!c) { out.missing.push(m.counter); return null; }
    const v = dig(c.detail, m.path);
    if (v === null || typeof v !== "object") { out.na.push(`${m.counter}#${m.path}`); return null; }
    const n = Array.isArray(v) ? v.length : Object.keys(v).length;
    out.inputs.push({ spec: `detail_count(${m.counter}#${m.path})`, id: m.counter, tag: `${m.counter}#${m.path}`, value: n });
    return n;
  }
  if (e.detail_sum) {
    const m = e.detail_sum;
    const c = ctx.byId.get(m.counter);
    if (!c) { out.missing.push(m.counter); return null; }
    const obj = dig(c.detail, m.path);
    if (!obj || typeof obj !== "object") { out.na.push(`${m.counter}#${m.path}`); return null; }
    const total = sumOf(m.keys.map((k) => Number(obj[k]) || 0));
    out.inputs.push({ spec: `detail_sum(${m.counter}#${m.path}: ${m.keys.join(" ")})`, id: m.counter, tag: `${m.counter}#${m.path}`, value: total });
    return total;
  }
  throw new Error("rubric: unknown expression " + JSON.stringify(e));
}

const describe = (x) => (typeof x === "string" ? x : typeof x === "number" ? String(x) : `(${Object.keys(x)[0]} …)`);

// ---------------------------------------------------------------------------------------------------- measures

function takeExprs(ctx, list, out) {
  return list.map((e) => evalExpr(ctx, e, out) ?? 0);
}

/** A gate holds, fails, or cannot be read (a counter is absent or null). */
function evalGate(ctx, g, out) {
  if (g.gate !== undefined) {
    const def = ctx.gates[g.gate];
    if (!def) throw new Error(`rubric: unknown gate "${g.gate}"`);
    return evalGate(ctx, def, out);
  }
  if (g.measure) {
    const m = evalMeasure(ctx, g.measure);
    out.inputs.push(...m.inputs);
    out.missing.push(...m.missing);
    out.na.push(...m.na);
    return m.status === "ok" && m.value !== null && holds(g.when, m.value);
  }
  const vals = takeExprs(ctx, g.sum_of, out);
  return out.missing.length || out.na.length ? false : holds(g.when, sumOf(vals));
}

const gateName = (g) => (g.gate !== undefined ? g.gate : g.sum_of ? g.sum_of.map(describe).join(" + ") : "a measure");

function evalRatio(ctx, r) {
  const out = { ...newOut(), status: "ok", value: null };
  const nums = takeExprs(ctx, r.num, out);
  const dens = takeExprs(ctx, r.den, out);
  const gateOk = r.num_if ? evalGate(ctx, r.num_if, out) : true;
  if (out.missing.length) return { ...out, status: "missing" };
  if (out.na.length) return { ...out, status: "na" };
  const n = gateOk ? (r.num_op === "max" ? Math.max(...nums) : sumOf(nums)) : 0;
  const d = sumOf(dens);
  out.num = n;
  out.den = d;
  out.gated = r.num_if ? gateOk : undefined;
  const thin = r.min_den !== undefined && d < r.min_den - EPS;
  if (d === 0 || thin) {
    const note = thin && d > 0 ? r.min_den_note || r.zero_note : r.zero_note;
    if (r.zero === null || r.zero === undefined) return { ...out, status: "zero", note };
    return { ...out, value: r.zero, note };
  }
  let v = ((r.one_minus ? d - n : n) * (r.scale ?? 1)) / d;
  if (r.clamp) v = Math.min(Math.max(v, r.clamp[0]), r.clamp[1]);
  return { ...out, value: v };
}

/** Gates in front of a measure, an item, a sub-score axis: { ok } or { ok: false, status, note, missing } */
function checkGates(ctx, list) {
  for (const g of list || []) {
    const gate = newOut();
    const ok = evalGate(ctx, g, gate);
    if (gate.missing.length) return { ok: false, status: "missing", missing: gate.missing, inputs: gate.inputs, note: `missing counter(s): ${gate.missing.join(", ")}` };
    if (gate.na.length) return { ok: false, status: "na", missing: [], inputs: gate.inputs, note: `counter(s) not computable in this report (null): ${gate.na.join(", ")}` };
    if (!ok) {
      const def = g.gate !== undefined ? ctx.gates[g.gate] : g;
      const have = gate.inputs.map((i) => `${i.id}=${i.value}`).join(", ") || gate.na.join(", ");
      const what = def.note || `${def.label || gateName(g)}: needs ${gateName(def)} ${def.when}; found ${have}`;
      return { ok: false, status: "gated", missing: [], inputs: gate.inputs, note: what };
    }
  }
  return { ok: true, inputs: [] };
}

function evalMeasure(ctx, m) {
  if (m.ratio) return evalRatio(ctx, m.ratio);
  if (m.mean_ratio) {
    const cfg = m.mean_ratio;
    const parts = cfg.parts.map((p) => {
      const g = checkGates(ctx, p.requires);
      const base = { id: p.id, label: p.label, unit: p.unit };
      if (!g.ok) return { ...base, ...newOut(), missing: g.missing, status: g.status, value: null, note: g.note };
      return { ...base, ...evalRatio(ctx, p) };
    });
    const out = { inputs: parts.flatMap((p) => p.inputs), missing: parts.flatMap((p) => p.missing), na: [], parts, status: "ok", value: null };
    if (out.missing.length) return { ...out, status: "missing" };
    const rated = parts.filter((p) => p.value !== null);
    if (!rated.length) {
      if (cfg.zero === null || cfg.zero === undefined) return { ...out, status: "zero", note: cfg.zero_note };
      return { ...out, value: cfg.zero, note: cfg.zero_note };
    }
    return { ...out, value: sumOf(rated.map((p) => p.value)) / rated.length };
  }
  const out = { ...newOut(), status: "ok", value: null };
  const v = evalExpr(ctx, m.counter !== undefined ? m.counter : m, out);
  if (out.missing.length) return { ...out, status: "missing" };
  if (out.na.length || v === null) return { ...out, status: "na" };
  return { ...out, value: v };
}

// ---------------------------------------------------------------------------------------------------- items

function evalItem(ctx, item) {
  const row = { id: item.id, label: item.label, unit: item.unit, max: item.max, points: 0, value: null, band: null, status: "scored", missing: [], inputs: [], note: null };
  const g = checkGates(ctx, item.requires);
  if (!g.ok) return { ...row, status: g.status, inputs: g.inputs || [], missing: g.missing || [], note: g.note };
  const m = evalMeasure(ctx, item.measure);
  row.inputs = m.inputs;
  if (m.parts) row.parts = m.parts;
  if (m.num !== undefined) row.fraction = { num: m.num, den: m.den };
  if (m.status === "missing") return { ...row, status: "missing", missing: m.missing, note: `missing counter(s): ${m.missing.join(", ")}` };
  if (m.status === "na") return { ...row, status: "na", note: `counter(s) not computable in this report (null): ${m.na.join(", ")}` };
  if (m.status === "zero") return { ...row, status: "zero", note: m.note };
  row.exact = m.value;
  row.value = m.value;
  const band = item.bands.find((b) => holds(b.when, row.value));
  row.band = band ? band.when : null;
  row.points = band ? band.pts : 0;
  for (const c of item.ceilings || []) {
    const probe = checkGates(ctx, [c.if]);
    if (probe.ok && row.points > c.max_points + EPS) {
      row.ceiling = { from: row.points, to: c.max_points, text: c.text };
      row.points = c.max_points;
    }
  }
  if (row.inputs.some((i) => i.spec.endsWith("!"))) row.exemption = { ...ctx.exempt };
  return row;
}

// ---------------------------------------------------------------------------------------------------- design-audit

function evalSubScore(ctx, def) {
  const g = checkGates(ctx, def.requires);
  if (!g.ok) return { exact: null, value: null, defined: false, status: g.status, missing: g.missing || [], note: g.note };
  if (def.floor) {
    const f = checkGates(ctx, [def.floor]);
    if (!f.ok) return { exact: 0, value: 0, defined: true, status: "floor", missing: f.missing || [], note: def.floor.floor_note || f.note };
  }
  const m = evalMeasure(ctx, def.measure);
  const defined = m.status === "ok" && m.value !== null;
  const exact = defined ? Math.min(Math.max(m.value, 0), 100) : null;
  const row = { exact, value: defined ? roundHalfUp(exact) : null, defined, status: m.status, missing: m.missing, note: m.note || null };
  if (m.parts) row.axes = Object.fromEntries(m.parts.map((p) => [p.id, { label: p.label, unit: p.unit, value: p.value, status: p.status, num: p.num, den: p.den, gated: p.gated, note: p.note || null }]));
  if (m.num !== undefined) row.fraction = { num: m.num, den: m.den };
  return row;
}

function evalSetupClass(ctx, sc, subScores) {
  const values = {};
  for (const [name, v] of Object.entries(sc.values)) {
    let x;
    if (v.counter) {
      const o = newOut();
      const e = evalExpr(ctx, v.counter, o);
      x = e === null ? undefined : e;
    } else {
      const axis = subScores.tokens.axes && subScores.tokens.axes[v.axis];
      x = axis && axis.value !== null && axis.value !== undefined ? axis.value : undefined;
    }
    values[name] = x === undefined ? v.if_undefined : x;
  }
  const test = (c) => holds(c.when, values[c.value]);
  for (const rule of sc.rules) {
    const hit = rule.else || (rule.any && rule.any.some(test)) || (rule.all && rule.all.every(test));
    if (hit) return { class: rule.class, reason: rule.reason || null, recommend: rule.recommend || (sc.recommend && sc.recommend[rule.class]) || null, values, triggered: rule.any ? rule.any.filter(test) : rule.all || [] };
  }
  return { class: null, values };
}

// the words of a path: segments split on - _ . and on camelCase, lowercased (so BrandCard.tsx has brand and card)
function pathWords(file) {
  return String(file)
    .split("/")
    .flatMap((seg) => seg.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").split(/[-_.\s]+/))
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}
function infoRuleFor(rules, file) {
  for (const r of rules) {
    if (r.pattern ? new RegExp(r.pattern, r.flags || "").test(file) : pathWords(file).some((w) => r.words.includes(w))) return r.id;
  }
  return null;
}

function evalSeverity(ctx, sv) {
  const exemptFiles = sv.exempt_files && dig((ctx.byId.get(sv.exempt_files.counter) || {}).detail, sv.exempt_files.detail);
  const exemptSet = ctx.exempt.applied && Array.isArray(exemptFiles) ? new Set(exemptFiles) : new Set();
  const fam = () => ({ critical: 0, warning: 0, info: 0, exempt: 0 });
  const out = { n: sv.n, critical: 0, warning: 0, info: 0, exempt: 0, complete: true, incompleteBecause: [], missing: [], families: {}, infoByRule: {}, checks: [] };
  const take = (entries, klass) => {
    for (const { family, counter: s } of entries) {
      const t = term(ctx, s);
      const c = ctx.byId.get(specIds(s)[0]);
      if (!t.ok) { out.missing.push(s); out.complete = false; continue; }
      const f = (out.families[family] = out.families[family] || fam());
      let placed = 0;
      if (t.value > 0 && !(c && Array.isArray(c.perFile))) {
        out.complete = false;
        out.incompleteBecause.push(`${c ? c.id : s} carries no perFile rows`);
      }
      for (const row of c && Array.isArray(c.perFile) ? c.perFile : []) {
        if (!row || typeof row.file !== "string" || !Number.isFinite(row.count)) {
          out.complete = false;
          out.incompleteBecause.push(`${c.id} has a perFile row without a file or a numeric count`);
          continue;
        }
        const info = exemptSet.has(row.file) ? null : infoRuleFor(sv.info_rules, row.file);
        const bucket = exemptSet.has(row.file) ? "exempt" : info ? "info" : klass;
        out[bucket] += row.count;
        f[bucket] += row.count;
        if (info) out.infoByRule[info] = (out.infoByRule[info] || 0) + row.count;
        placed += row.count;
      }
      out[klass] += t.value - placed;
      f[klass] += t.value - placed;
      if (c && c.perFileOmitted && c.perFileOmitted.count > 0) {
        out.complete = false;
        out.incompleteBecause.push(`${c.id} cut its perFile rows at 200: the rest are classed as ${klass}`);
      }
    }
  };
  take(sv.critical, "critical");
  take(sv.warning, "warning");
  for (const chk of sv.checks || []) {
    const total = term(ctx, chk.total);
    const parts = chk.parts.map((p) => term(ctx, p));
    if (total.ok && parts.every((p) => p.ok)) out.checks.push({ total: chk.total, value: total.value, sum: sumOf(parts.map((p) => p.value)), ok: total.value === sumOf(parts.map((p) => p.value)) });
  }
  out.exemption = { ...ctx.exempt };
  return out;
}

function evalDesignAudit(ctx, block) {
  const subScores = {};
  for (const [id, def] of Object.entries(block.sub_scores)) subScores[id] = evalSubScore(ctx, def);
  const rated = block.health.mean_of.filter((id) => subScores[id].defined);
  const exact = rated.length ? sumOf(rated.map((id) => subScores[id].exact)) / rated.length : null;
  subScores.health = { exact, value: exact === null ? null : roundHalfUp(exact), defined: exact !== null, ratedFrom: rated, note: exact === null ? block.health.none_note || "no sub-score could be rated" : null };
  return { subScores, setupClass: evalSetupClass(ctx, block.setup_class, subScores) };
}

function evalLines(ctx, lines) {
  const out = {};
  for (const l of lines || []) {
    const g = checkGates(ctx, l.requires);
    const m = g.ok ? evalMeasure(ctx, l.measure) : { value: null, status: g.status, note: g.note };
    out[l.id] = { label: l.label, unit: l.unit, value: m.value, status: m.status, note: m.note || null };
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------- drift-report

// a class declared only because a guardrails file with rule bullets exists: nothing says a rule covers this class
const PROXY_KIND = "regex hits against a guardrails file that has rules";

function evalDrift(ctx, block) {
  const dc = block.drift_control;
  const g = checkGates(ctx, dc.requires);
  const m = g.ok ? evalMeasure(ctx, dc.measure) : { value: null, status: g.status, note: g.note, missing: g.missing || [] };
  const exact = m.value;
  const side = (spec) => { const o = newOut(); const v = evalExpr(ctx, spec, o); return v; };
  const driftControl = {
    exact,
    value: exact === null ? null : roundHalfUp(exact),
    status: m.status,
    dirtyFiles: side(dc.dirty_files),
    auditedFiles: side(dc.audited_files),
    note: m.note || null,
    missing: m.missing || [],
  };
  const classes = block.classes.map((c) => {
    const o = newOut();
    const hits = c.hits.map((s) => evalExpr(ctx, s, o));
    const files = evalExpr(ctx, c.files, o);
    let declared = false;
    let why = "no guardrails counter can say whether this class has a rule: reported as unruled";
    if (c.declared_when) {
      const gg = newOut();
      declared = c.declared_when.every((cond) => evalGate(ctx, cond, gg));
      why = declared ? (c.declared_basis === "proxy" ? "a guardrails file with rule bullets exists; no counter identifies a rule for this class" : "a guardrails rule is declared") : "no declaring guardrail found by the counters";
    }
    return {
      id: c.id,
      label: c.label,
      unit: c.unit,
      hits: hits.every((h) => h !== null) ? sumOf(hits) : null,
      files,
      declared,
      kind: declared ? (c.declared_basis === "proxy" ? PROXY_KIND : "violations of a declared rule") : "unruled drift",
      proxy: declared && c.declared_basis === "proxy",
      why,
      feeds: c.feeds,
    };
  });
  return {
    driftControl,
    classes,
    lines: evalLines(ctx, block.lines),
    scannerTally: Object.fromEntries(block.scanner_tally.map((s) => [s, side(s)])),
  };
}

// ---------------------------------------------------------------------------------------------------- readiness

function evalDimension(ctx, block, dim) {
  const items = dim.items.map((it) => evalItem(ctx, it));
  let points = sumOf(items.map((i) => i.points));
  const raw = points;
  const caps = [];
  for (const cap of block.caps || []) {
    if (!cap.dimensions.includes(dim.key)) continue;
    const g = checkGates(ctx, cap.unless);
    if (!g.ok && points > cap.max_points + EPS) {
      caps.push({ id: cap.id, from: points, to: cap.max_points, reason: cap.text, because: g.note });
      points = cap.max_points;
    }
  }
  return { items, points, rawPoints: raw, capped: caps };
}

function evalReadiness(ctx, block) {
  const dimensions = {};
  for (const dim of block.dimensions) {
    const d = evalDimension(ctx, block, dim);
    const importance = block.importance[dim.key];
    const [lo, hi] = block.satisfaction.clamp;
    const satisfaction = Math.min(Math.max(roundHalfUp(d.points), lo), hi);
    dimensions[dim.key] = {
      key: dim.key, label: dim.label, importance, points: d.points, rawPoints: d.rawPoints, satisfaction,
      opportunity: importance + Math.max(importance - satisfaction, 0), underserved: satisfaction < importance, capped: d.capped, limit: dim.limit || null, items: d.items,
    };
  }
  const keys = block.order;
  const sumSat = sumOf(keys.map((k) => dimensions[k].satisfaction));
  const exact = (sumSat * 10) / keys.length;
  const cmp = (a, b) => {
    const x = dimensions[a], y = dimensions[b];
    return y.opportunity - x.opportunity || y.importance - x.importance || x.satisfaction - y.satisfaction || keys.indexOf(a) - keys.indexOf(b);
  };
  const ordered = keys.filter((k) => dimensions[k].underserved).sort(cmp);
  const satisfied = keys.filter((k) => !dimensions[k].underserved);
  const top = ordered.length ? dimensions[ordered[0]].opportunity : null;
  const decidedBy = (a, b) => {
    const x = dimensions[a], y = dimensions[b];
    if (x.opportunity !== y.opportunity) return "opportunity";
    if (x.importance !== y.importance) return "importance";
    if (x.satisfaction !== y.satisfaction) return "satisfaction";
    return "order";
  };
  const ranking = ordered.map((k, i) => ({
    rank: i + 1,
    key: k,
    opportunity: dimensions[k].opportunity,
    importance: dimensions[k].importance,
    satisfaction: dimensions[k].satisfaction,
    decidedBy: i === 0 ? null : decidedBy(ordered[i - 1], k),
    tiedWithTop: dimensions[k].opportunity >= top - block.tie.within_opportunity_points_of_top,
  }));
  const gapToNext = ordered.length > 1 ? top - dimensions[ordered[1]].opportunity : null;
  return {
    dimensions,
    overall: { exact, value: roundHalfUp(exact), sumSatisfaction: sumSat, perSatisfactionPoint: 10 / keys.length },
    ranking,
    satisfied,
    noneUnderserved: ordered.length === 0,
    tied: ranking.filter((r) => r.tiedWithTop).map((r) => r.key),
    mostUnderserved: ordered.length === 1 || (gapToNext !== null && gapToNext >= block.named_underserved.min_gap_to_next) ? ordered[0] : null,
    gapToNext,
  };
}

// ---------------------------------------------------------------------------------------------------- near-threshold

/**
 * Awards that change when ONE input counter moves by ONE unit (booleans are not stepped). Rows that earned nothing because
 * a gate failed or a denominator was 0 are probed too: an `unrated` edge says one more unit would let the item be rated.
 */
function nearThreshold(report, rubric, base) {
  const near = [];
  const record = (owner, scope, item, value, edges, extra = {}) => edges.length && near.push({ owner, scope, item, value, edges, ...extra });
  const ra = rubric["readiness-audit"];
  if (ra && base.dimensions) {
    for (const dim of ra.dimensions) {
      for (const item of dim.items) {
        const row = base.dimensions[dim.key].items.find((i) => i.id === item.id);
        if (row.status === "missing") continue;
        const edges = [];
        for (const spec of probeSpecs(ra, { r: item.requires, m: item.measure, c: item.ceilings })) {
          for (const d of [1, -1]) {
            const moved = evalItem(makeCtx(report, { [spec]: d }, ra), item);
            if (moved.points !== row.points) edges.push({ counter: term(makeCtx(report, {}, ra), spec).id || spec, delta: d, from: row.points, to: moved.points });
          }
        }
        record("readiness-audit", dim.key, item.id, row.value, edges, row.status === "scored" ? {} : { unrated: true, status: row.status });
      }
      const capSpecs = probeSpecs(ra, (ra.caps || []).filter((c) => c.dimensions.includes(dim.key)).map((c) => c.unless));
      const capEdges = [];
      for (const spec of capSpecs) {
        for (const d of [1, -1]) {
          const moved = evalDimension(makeCtx(report, { [spec]: d }, ra), ra, dim);
          if (Math.abs(moved.points - base.dimensions[dim.key].points) > EPS) capEdges.push({ counter: term(makeCtx(report, {}, ra), spec).id || spec, delta: d, from: base.dimensions[dim.key].points, to: moved.points });
        }
      }
      record("readiness-audit", dim.key, "(cap)", base.dimensions[dim.key].points, capEdges);
      const p = base.dimensions[dim.key].points;
      if (Math.abs(p - Math.floor(p) - 0.5) < EPS) {
        record("readiness-audit", dim.key, "(rounding)", p, [{ counter: null, delta: 0, from: roundHalfUp(p), to: roundHalfUp(p) - 1, note: "points end in .5: half a point lower rounds down" }]);
      }
    }
  }
  const da = rubric["design-audit"];
  if (da && base.setupClass) {
    const edges = [];
    const axes = da.sub_scores.tokens.measure.mean_ratio.parts.filter((p) => ["colour", "spacing"].includes(p.id));
    const specs = probeSpecs(da, [axes, da.sub_scores.tokens.requires, da.sub_scores.tokens.floor, Object.values(da.setup_class.values).filter((v) => v.counter)]);
    for (const spec of specs) {
      for (const d of [1, -1]) {
        const moved = evalDesignAudit(makeCtx(report, { [spec]: d }, da), da).setupClass.class;
        if (moved !== base.setupClass.class) edges.push({ counter: term(makeCtx(report, {}, da), spec).id || spec, delta: d, from: base.setupClass.class, to: moved });
      }
    }
    record("design-audit", "setup_class", "setup_class", base.setupClass.values, edges);
  }
  return near;
}

// ---------------------------------------------------------------------------------------------------- flags, coverage, completeness

function evalFlags(ctx, block) {
  const out = [];
  for (const f of block.flags || []) {
    const g = checkGates(ctx, f.requires);
    if (!g.ok) continue;
    const m = evalMeasure(ctx, f.measure);
    if (m.status === "ok" && m.value !== null && holds(f.when, m.value)) out.push({ id: f.id, text: f.text, value: m.value });
  }
  return out;
}

function evalCoverage(ctx, guards) {
  const g = guards && guards.coverage;
  if (!g) return null;
  const any = ctx.byId.get(g.any_type);
  const census = plainNumber(ctx, g.census);
  if (!any || census === null) return { ok: null, note: "census.files.any_type is absent or census.files.total is not a number" };
  const byExt = (any.detail && any.detail.byExt) || {};
  const sourceLike = sumOf(g.source_ext.map((e) => Number(byExt[e]) || 0));
  const share = sourceLike > 0 ? census / sourceLike : null;
  return { ok: share === null ? true : share >= g.min_share - EPS, censusFiles: census, sourceLikeFiles: sourceLike, share, floor: g.min_share, notSeen: Math.max(0, sourceLike - census) };
}

/**
 * A counter whose per-file rows do not add up to its value was not written by the counters (the README guarantees they do).
 * The skills word the check the way it runs here: a `match` or `line` counter's row counts sum to its value; a `file`
 * counter has one row per file (a row's count is a hit count, so its counts do not sum to the value); other units, and
 * counters that cut their rows (`perFileTotal`, `perFileOmitted`), are not checked.
 */
function integrityNotes(report) {
  const bad = [];
  const odd = report.counters.filter((c) => !c || typeof c.id !== "string" || !(c.value === null || typeof c.value === "boolean" || typeof c.value === "string" || (typeof c.value === "number" && Number.isFinite(c.value))));
  for (const c of report.counters) {
    if (!c || typeof c !== "object") continue;
    if (!Array.isArray(c.perFile) || typeof c.value !== "number" || c.perFileOmitted || c.perFileTotal) continue;
    if (c.unit !== "match" && c.unit !== "line" && c.unit !== "file") continue;
    const rows = c.unit === "file" ? c.perFile.length : sumOf(c.perFile.map((r) => (r && Number.isFinite(r.count) ? r.count : NaN)));
    if (rows !== c.value) bad.push(`${c.id} (rows add to ${Number.isNaN(rows) ? "a non-number" : rows}, value ${c.value})`);
  }
  const notes = [];
  if (odd.length) notes.push(`the report is not the counters' own output: ${odd.length} counters have no id or a value that is not a finite number, a boolean, a string or null (first: ${odd.slice(0, 3).map((c) => (c && c.id) || "?").join(", ")})`);
  if (bad.length) notes.push(`the report is not the counters' own output: per-file rows disagree with the value of ${bad.length} counters (first: ${bad.slice(0, 3).join(", ")})`);
  return notes;
}

function incompleteReasons(report, rubric, ids) {
  const reasons = [];
  const sl = report.slice;
  if (sl && typeof sl === "object") {
    // a slice that drops per-file rows or definitions keeps every value; one that drops counters or detail cannot be scored
    const partial = (Array.isArray(sl.ids) && sl.ids.length > 0) || sl.brief === true || (Number.isFinite(sl.of) && Number.isFinite(sl.counters) && sl.counters < sl.of);
    if (partial) reasons.push(`the report is a slice (${sl.brief ? "brief, " : ""}${sl.counters ?? "?"} of ${sl.of ?? "?"} counters${Array.isArray(sl.ids) && sl.ids.length ? `, ids ${sl.ids.join(" ")}` : ""}): scores need the whole report`);
  } else if (sl) reasons.push("the report carries a slice field that cannot be read: scores need the whole report");
  const skipped = report.groups && report.groups.skipped;
  if (Array.isArray(skipped) && skipped.length) reasons.push(`counter groups were skipped: ${skipped.join(", ")}`);
  const scope = report.scope || {};
  if ((scope.missingDirs || []).length) reasons.push(`audited folders not found: ${scope.missingDirs.join(", ")}`);
  if ((scope.rejectedDirs || []).length) reasons.push(`audited folders refused: ${scope.rejectedDirs.join(", ")}`);
  if (ids.missing.length) reasons.push(`${ids.missing.length} counters the rubric reads are absent from the report (first: ${ids.missing.slice(0, 3).join(", ")})`);
  return reasons;
}

// ---------------------------------------------------------------------------------------------------- evaluate

const BLOCKS = ["design-audit", "drift-report", "readiness-audit"];
const blockOf = (rubric) => BLOCKS.map((k) => rubric[k]).filter(Boolean);

/** Everything, whether or not the report is whole. The `scored` field says whether the numbers may be published. */
function evaluateAll(report, rubric, opts = {}) {
  const base = makeCtx(report);
  const major = Number(String(report.countersVersion || "").split(".")[0]);
  const notes = [];
  if (rubric.counters && report.schema !== rubric.counters.schema) notes.push(`report schema is ${report.schema}, rubric expects ${rubric.counters.schema}`);
  if (rubric.counters && major !== rubric.counters.major) notes.push(`countersVersion ${report.countersVersion} has major ${major}, rubric expects ${rubric.counters.major}: scores are not comparable`);

  const blocks = blockOf(rubric);
  const allSpecs = new Set();
  for (const b of blocks) leafSpecs(b, b).forEach((s) => specIds(s).forEach((id) => allSpecs.add(id)));
  const missingIds = [...allSpecs].filter((id) => !base.byId.has(id)).sort();
  notes.push(...incompleteReasons(report, rubric, { missing: missingIds }));
  notes.push(...integrityNotes(report));

  const scope = report.scope || {};
  const guardBlock = blocks[0] || {};
  const gctx = makeCtx(report, {}, guardBlock);
  const coverage = evalCoverage(gctx, guardBlock.guards);
  const evidenceGate = guardBlock.guards && guardBlock.guards.evidence;
  const ev = evidenceGate ? checkGates(gctx, [{ gate: evidenceGate }]) : { ok: true };
  const auditedFiles = plainNumber(gctx, "census.files.audited");
  const evidence = { ok: ev.ok && auditedFiles !== 0, note: ev.ok && auditedFiles !== 0 ? null : "no styling code in the audited folders (no markup or style files and no styling counters above 0): nothing to score" };
  const withheld = [...notes];
  const covered = !coverage || coverage.ok === true;
  // hidden source is the cause when files exist that nobody audited; "no styling code" is then a symptom and is not said
  if (!evidence.ok && notes.length === 0 && covered) withheld.push(evidence.note);
  if (coverage && coverage.ok === null) withheld.push(`the audit coverage cannot be computed: ${coverage.note}`);
  if (coverage && coverage.ok === false) withheld.push(`the audit saw ${coverage.censusFiles} of ${coverage.sourceLikeFiles} source-looking files under the audited folders (${(coverage.share * 100).toFixed(1)} percent, floor ${coverage.floor * 100} percent): ${coverage.notSeen} sit in skipped, vendored, generated or dot folders or in *.gen.* / *.min.* files`);

  const warnings = Array.isArray(report.warnings) ? report.warnings : [];
  const out = {
    rubricVersion: rubric.rubric_version,
    compat: { ok: notes.length === 0, notes },
    scored: withheld.length === 0,
    withheld: { reasons: withheld, evidence },
    header: {
      countersVersion: report.countersVersion,
      schema: report.schema,
      commit: report.repo && report.repo.commit ? String(report.repo.commit).slice(0, 12) : null,
      commitDate: (report.repo && report.repo.commitDate) || null,
      tokenSource: scope.tokenSource ? { path: scope.tokenSource.path, via: scope.tokenSource.via } : null,
      dirs: scope.dirs || null,
      audited: scope.population ? scope.population.audited : null,
      population: scope.population || null,
      missingDirs: scope.missingDirs || [],
      rejectedDirs: scope.rejectedDirs || [],
      skippedDirs: scope.skippedDirs || [],
      slice: report.slice && typeof report.slice === "object" ? report.slice : report.slice ? String(report.slice) : null,
      groupsSkipped: (report.groups && report.groups.skipped) || [],
      warnings: warnings.slice(0, 20),
      warningsTotal: warnings.length,
      coverage,
      exemption: gctx.exempt,
    },
    limits: Object.fromEntries(blocks.filter((b) => b.limits).map((b) => [b.owner, b.limits])),
    validity: (blocks.find((b) => b.validity) || {}).validity || null,
    flags: [],
  };
  if ((scope.skippedDirs || []).length) out.flags.push({ id: "skipped_dirs", text: `folders skipped by name and not audited: ${scope.skippedDirs.join(", ")}` });
  if (!gctx.exempt.applied) out.flags.push({ id: "exemption_ignored", text: `the declared exemption covers ${gctx.exempt.files} of ${gctx.exempt.audited} audited files (${(gctx.exempt.share * 100).toFixed(1)} percent, cap ${gctx.exempt.cap * 100} percent): it is ignored and the plain counts are used`, value: gctx.exempt.share });
  else if (gctx.exempt.files > 0) out.flags.push({ id: "exemption_applied", text: `a declared exemption removes ${gctx.exempt.files} of ${gctx.exempt.audited} audited files from the items marked with !`, value: gctx.exempt.share });

  const da = rubric["design-audit"];
  if (da) {
    const ctx = makeCtx(report, {}, da);
    Object.assign(out, evalDesignAudit(ctx, da));
    out.severity = evalSeverity(ctx, da.severity);
    out.lines = evalLines(ctx, da.lines);
    out.flags.push(...evalFlags(ctx, da));
  }
  const dr = rubric["drift-report"];
  if (dr) {
    const ctx = makeCtx(report, {}, dr);
    const d = evalDrift(ctx, dr);
    out.driftControl = d.driftControl;
    out.driftClasses = d.classes;
    out.scannerTally = d.scannerTally;
    out.lines = { ...(out.lines || {}), ...d.lines };
    for (const f of evalFlags(ctx, dr)) if (!out.flags.some((x) => x.id === f.id)) out.flags.push(f);
  }
  const ra = rubric["readiness-audit"];
  if (ra) {
    const ctx = makeCtx(report, {}, ra);
    Object.assign(out, evalReadiness(ctx, ra));
    for (const dim of Object.values(out.dimensions)) {
      for (const c of dim.capped) out.flags.push({ id: `capped_${dim.key}`, text: `${dim.label} is capped at ${c.to} points (it earned ${c.from}): ${c.reason}`, value: c.to });
    }
    for (const f of evalFlags(ctx, ra)) if (!out.flags.some((x) => x.id === f.id)) out.flags.push(f);
  }

  out.nearThreshold = opts.nearThreshold === false ? [] : nearThreshold(report, rubric, out);
  out.missing = [];
  for (const dim of Object.values(out.dimensions || {})) {
    for (const it of dim.items) it.missing.forEach((c) => out.missing.push({ where: `${dim.key}.${it.id}`, counter: c }));
  }
  for (const [id, s] of Object.entries(out.subScores || {})) (s.missing || []).forEach((c) => out.missing.push({ where: `subScores.${id}`, counter: c }));
  for (const id of missingIds) if (!out.missing.some((m) => m.counter === id)) out.missing.push({ where: "report", counter: id });
  return out;
}

const WITHHELD_KEYS = ["dimensions", "subScores", "setupClass", "severity", "lines", "driftControl", "driftClasses", "scannerTally", "overall", "ranking", "satisfied", "tied", "mostUnderserved", "gapToNext", "noneUnderserved", "nearThreshold"];

/**
 * The only function a skill should print from. Returns every number when the report is whole and rateable; otherwise
 * `scored: false`, the reasons, and null in place of each score (nothing partial to paste by mistake).
 */
function evaluate(report, rubric) {
  const all = evaluateAll(report, rubric);
  if (all.scored) return all;
  const out = { ...all };
  for (const k of WITHHELD_KEYS) out[k] = null;
  out.missing = all.missing;
  return out;
}

// ---------------------------------------------------------------------------------------------------- rubric loading

/** Which marker pair holds which owner block, and in which SKILL.md. */
const RUBRIC_MARKERS = [
  { owner: "readiness-audit", file: path.join("readiness-audit", "SKILL.md"), marker: "rubric-v1" },
  { owner: "design-audit", file: path.join("design-audit", "SKILL.md"), marker: "scores-v1" },
  { owner: "drift-report", file: path.join("drift-report", "SKILL.md"), marker: "drift-v1" },
];

function extractBlock(text, marker, where) {
  const begin = `<!-- ${marker}:begin -->`;
  const end = `<!-- ${marker}:end -->`;
  const count = (s) => text.split(s).length - 1;
  if (count(begin) === 0 && count(end) === 0) {
    const e = new Error(`${where}: no ${begin} ... ${end} block`);
    e.code = "NO_BLOCK";
    throw e;
  }
  if (count(begin) !== 1 || count(end) !== 1) throw new Error(`${where}: expected exactly one ${begin} and one ${end}`);
  const from = text.indexOf(begin) + begin.length;
  const to = text.indexOf(end);
  if (to < from) throw new Error(`${where}: ${end} comes before ${begin}`);
  const m = /```json[^\n]*\n([\s\S]*?)\n```/.exec(text.slice(from, to));
  if (!m) throw new Error(`${where}: no fenced json block between the ${marker} markers`);
  try {
    return JSON.parse(m[1]);
  } catch (e) {
    throw new Error(`${where}: the ${marker} block is not valid JSON (${e.message})`);
  }
}

/** Read the three owner blocks out of `<skillsDir>/<skill>/SKILL.md`; the skill text is the source of truth. */
function loadRubric(skillsDir) {
  const rubric = {};
  for (const { owner, file, marker } of RUBRIC_MARKERS) {
    const where = path.join(skillsDir, file);
    const block = extractBlock(fs.readFileSync(where, "utf8"), marker, where);
    if (block.owner !== owner) throw new Error(`${where}: block says owner "${block.owner}", expected "${owner}"`);
    if (block.language !== LANGUAGE) throw new Error(`${where}: the block is written in ${block.language}, this evaluator reads ${LANGUAGE}`);
    rubric[owner] = block;
  }
  const blocks = Object.values(rubric);
  const versions = new Set(blocks.map((b) => b.rubric_version));
  if (versions.size !== 1) throw new Error(`rubric_version differs between skills: ${[...versions].join(", ")}`);
  if (new Set(blocks.map((b) => JSON.stringify(b.counters))).size !== 1) throw new Error("the skills disagree on which counters schema and major they score");
  rubric.rubric_version = [...versions][0];
  rubric.counters = blocks[0].counters;
  return rubric;
}

const loadRubricFile = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

// ---------------------------------------------------------------------------------------------------- validation

const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The counters an item scores, for the ownership rule (one fact, one dimension). A gate marked `evidence: true` only
 * decides whether something can be rated; it adds no points, so it is not an owner. Neither are the population
 * denominators the readiness guards name.
 */
function ownedSpecs(ra, it) {
  const isEvidence = (g) => g && g.gate !== undefined && ra.gates && ra.gates[g.gate] && ra.gates[g.gate].evidence;
  const requires = (it.requires || []).filter((g) => !isEvidence(g));
  return leafSpecs(ra, { r: requires, m: it.measure, c: it.ceilings });
}

/** Problems with a rubric (empty list = sound). `knownIds` (optional) checks that every counter id exists. */
function validateRubric(rubric, { knownIds } = {}) {
  const bad = [];
  const ra = rubric["readiness-audit"];
  const da = rubric["design-audit"];
  const dr = rubric["drift-report"];
  const owners = { "readiness-audit": ra, "design-audit": da, "drift-report": dr };
  for (const [owner, b] of Object.entries(owners)) {
    if (!b) bad.push(`missing block ${owner}`);
    else if (b.owner !== owner || b.rubric_version !== rubric.rubric_version) bad.push(`${owner}: owner or rubric_version differs`);
    else if (b.language !== LANGUAGE) bad.push(`${owner}: written in ${b.language}, not ${LANGUAGE}`);
    else if (!deepEqual(b.counters, rubric.counters)) bad.push(`${owner}: scores a different counters schema or major than the rubric`);
  }
  const present = Object.entries(owners).filter(([, b]) => b);
  const lineIds = [...((da && da.lines) || []), ...((dr && dr.lines) || [])].map((l) => l.id);
  if (new Set(lineIds).size !== lineIds.length) bad.push("two report lines share an id");

  // what the blocks must say word for word
  const validities = new Set(present.map(([, b]) => b.validity));
  if (validities.size !== 1 || validities.has(undefined)) bad.push("the three blocks must carry the same validity sentence");
  const guardSets = new Set(present.map(([, b]) => JSON.stringify(b.guards)));
  if (guardSets.size !== 1 || guardSets.has(undefined)) bad.push("the three blocks must carry the same guards");
  for (const key of ["gates", "derived"]) {
    const seenDef = new Map();
    for (const [owner, b] of present) {
      for (const [name, def] of Object.entries(b[key] || {})) {
        if (seenDef.has(name) && !deepEqual(seenDef.get(name).def, def)) bad.push(`${key} "${name}" differs between ${seenDef.get(name).owner} and ${owner}`);
        else if (!seenDef.has(name)) seenDef.set(name, { owner, def });
      }
    }
  }

  // every "@name" and { gate } reference resolves; every id exists
  const allSpecs = new Set();
  for (const [owner, b] of present) {
    collectSpecs(b).forEach((s) => allSpecs.add(s));
    const mentions = JSON.stringify(b);
    for (const m of mentions.matchAll(/"(@[a-z0-9_]+)"/g)) if (!(b.derived && b.derived[m[1].slice(1)] !== undefined)) bad.push(`${owner}: ${m[1]} is not derived`);
    for (const m of mentions.matchAll(/"gate":"([a-z0-9_]+)"/g)) if (!(b.gates && b.gates[m[1]])) bad.push(`${owner}: gate "${m[1]}" is not defined`);
    if (b.guards && b.guards.evidence && !(b.gates && b.gates[b.guards.evidence])) bad.push(`${owner}: guards.evidence names a gate the block does not define`);
  }
  if (knownIds) {
    for (const s of allSpecs) {
      if (!specIds(s).every((id) => knownIds.has(id))) bad.push(`unknown counter id in "${s}"`);
    }
  }

  if (ra) {
    const sets = {};
    const numeratorOwner = new Map();
    const population = new Set(((ra.guards || {}).population || []).map(canonicalId));
    for (const dim of ra.dimensions) {
      const ids = new Set();
      let total = 0;
      for (const it of dim.items) {
        total += it.max;
        const peak = Math.max(...it.bands.map((b) => b.pts));
        if (peak !== it.max) bad.push(`${dim.key}.${it.id}: max ${it.max} is not the best band (${peak})`);
        if (it.bands[it.bands.length - 1].when !== "else") bad.push(`${dim.key}.${it.id}: last band must be "else"`);
        if (it.round !== undefined) bad.push(`${dim.key}.${it.id}: round is gone in rubric-language/2 (bands read exact values)`);
        const unreadable = it.bands.filter((b) => {
          try {
            parseWhen(b.when);
            return false;
          } catch (e) {
            bad.push(`${dim.key}.${it.id}: ${e.message}`);
            return true;
          }
        });
        const cmpBands = unreadable.length ? [] : it.bands.filter((b) => b.when !== "else" && b.when !== "false");
        for (let i = 1; i < it.bands.length; i++) if (it.bands[i].pts > it.bands[i - 1].pts) bad.push(`${dim.key}.${it.id}: points rise down the band list`);
        const ns = cmpBands.map((b) => parseWhen(b.when).n);
        const dir = it.direction;
        for (let i = 1; i < ns.length; i++) {
          if (dir === "higher" && !(ns[i] < ns[i - 1])) bad.push(`${dim.key}.${it.id}: thresholds must fall for a "higher" item`);
          if (dir === "lower" && !(ns[i] > ns[i - 1])) bad.push(`${dim.key}.${it.id}: thresholds must rise for a "lower" item`);
        }
        const numer = (m) => (m.ratio ? m.ratio.num : m.mean_ratio ? m.mean_ratio.parts.flatMap((p) => p.num) : [m.counter !== undefined ? m.counter : m]);
        // a counter that only classifies (the condition of an if, the names a theme maps) is not a measured quantity
        for (const s of leafSpecs(ra, { num: numer(it.measure) }, new Set(), new Set(), false, new Set(["if", "names"]))) {
          for (const id of specIds(s).map(canonicalId)) {
            if (population.has(id)) continue;
            if (numeratorOwner.has(id) && numeratorOwner.get(id) !== `${dim.key}.${it.id}`) bad.push(`${id} is measured by two items (${numeratorOwner.get(id)} and ${dim.key}.${it.id})`);
            numeratorOwner.set(id, `${dim.key}.${it.id}`);
          }
        }
        ownedSpecs(ra, it).forEach((s) => specIds(s).forEach((id) => ids.add(canonicalId(id))));
        if (it.same_as) {
          const other = it.same_as.startsWith("design-audit:") ? da && da.sub_scores.components : dr && dr.drift_control;
          if (!other || !deepEqual(other.measure, it.measure)) bad.push(`${dim.key}.${it.id}: measure differs from ${it.same_as}`);
          else if (!deepEqual(other.requires || [], it.requires || [])) bad.push(`${dim.key}.${it.id}: requires differ from ${it.same_as}`);
        }
      }
      if (Math.abs(total - 10) > EPS) bad.push(`${dim.key}: items sum to ${total}, not 10`);
      sets[dim.key] = ids;
    }
    const seen = new Map();
    for (const [key, ids] of Object.entries(sets)) {
      for (const id of ids) {
        if (population.has(id)) continue;
        if (seen.has(id) && seen.get(id) !== key) bad.push(`${id} feeds two dimensions (${seen.get(id)} and ${key})`);
        seen.set(id, key);
      }
    }
    const imp = ra.importance;
    if (!deepEqual(ra.order, ra.dimensions.map((d) => d.key)) || Object.keys(imp).length !== ra.order.length) bad.push("order, importance and dimensions disagree");
    for (const cap of ra.caps || []) for (const k of cap.dimensions) if (!ra.order.includes(k)) bad.push(`cap ${cap.id} names an unknown dimension ${k}`);
  }
  return bad;
}

module.exports = {
  LANGUAGE, evaluate, evaluateAll, loadRubric, loadRubricFile, validateRubric, extractBlock, RUBRIC_MARKERS, roundHalfUp, collectSpecs, leafSpecs, specIds,
  evalItem, evalDimension, makeCtx, pathWords, ownedSpecs, probeSpecs, ALIASES,
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const diagnostic = args.includes("--diagnostic");
  const [reportFile, rubricFile, skillsArg] = args.filter((a) => a !== "--diagnostic");
  if (!reportFile) {
    console.error("usage: node rubric-eval.js <counters.json> [rubric-v1.json | --skills [skillsDir]] [--diagnostic]  (default: the skills in this package)");
    process.exit(2);
  }
  try {
    const skillsDir = path.join(__dirname, "..", "..", "..", "pipelines", "design-system", "skills");
    const rubric = rubricFile === "--skills" ? loadRubric(skillsArg || skillsDir) : rubricFile ? loadRubricFile(rubricFile) : loadRubric(skillsDir);
    const report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
    const result = diagnostic ? { DIAGNOSTIC_NOT_FOR_PUBLICATION: true, ...evaluateAll(report, rubric) } : evaluate(report, rubric);
    console.info(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`rubric-eval: ${e.message}`);
    process.exit(1);
  }
}
