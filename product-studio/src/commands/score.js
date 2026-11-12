"use strict";

/**
 * score: the one readiness score (beta). Read-only.
 *
 *   score [<dirs…>] [--json]
 *
 * Renders rubric/readiness.v2.json: six dimensions with fixed weights, each from inputs that other
 * commands compute (audit, rules lint|eval, tokens lint, loops status, learnings list), taken through
 * src/lib/invoke.js so a number is computed once, by the command that owns it. An input that cannot
 * be computed is left out and named; when coverage falls below the rubric's floor the score is
 * withheld, never estimated.
 */

const fs = require("fs");
const path = require("path");
const { parseArgs, last, problems } = require("../lib/args");
const { rel: L } = require("../lib/layout");
const invokeLib = require("../lib/invoke");

const RUBRIC_FILE = path.join(__dirname, "..", "..", "rubric", "readiness.v2.json");
const loadRubric = () => JSON.parse(fs.readFileSync(RUBRIC_FILE, "utf8"));

const USAGE = `
  Usage: score [<dirs…>] [--root <dir>] [--json]

    The readiness score out of 100 (beta), from six dimensions with fixed published weights:
    tokens, rules, drift, components, rationale and accessibility. Every input is computed by
    another command; an input that cannot be computed lowers the coverage, and below the
    rubric's floor the score is withheld. Writes nothing.
`;

const r2 = (n) => Math.round(n * 100) / 100;
const clamp = (n) => Math.max(0, Math.min(100, n));
const exists = (root, rel) => fs.existsSync(path.join(root, rel));

/** A computed input: its raw value and its 0–100 score. */
const got = (value, score) => ({ value, score: Math.round(clamp(score)) });
/** An input that could not be computed, and why. */
const missing = (why) => ({ value: null, score: null, missing: why });

const notAvailable = (argv, res) => `${argv.join(" ")} gave no result${res && res.stderr ? ` (${res.stderr.replace(/^\s*✗\s*/, "").split("\n")[0]})` : ""}`;

/** Gather every input the rubric names. Returns { [dimension]: { [input]: {value, score} | missing } }. */
async function gather(ctx, rubric, dirs) {
  const root = ctx.root;
  const call = (argv) => invokeLib.invoke(ctx, argv);
  const spec = Object.fromEntries(rubric.dimensions.map((d) => [d.id, Object.fromEntries(d.inputs.map((i) => [i.id, i]))]));
  const scaled = (dim, id, n) => {
    const s = spec[dim][id];
    if (s.scale === "target") return (Math.min(n, s.target) / s.target) * 100;
    if (s.scale === "penalty") return 100 - n * s.perUnit;
    return n * 100;
  };
  const out = { tokens: {}, rules: {}, drift: {}, components: {}, rationale: {}, accessibility: {} };

  // audit: token source, coverage, drift, components, images
  const auditArgv = ["audit", ...dirs];
  const a = await call(auditArgv);
  const audit = a.json && a.json.version === 1 ? a.json : null;
  if (audit) {
    out.tokens.source = got(audit.tokenSource.kind, audit.tokenSource.kind === "none" ? 0 : 100);
    out.tokens.share = got(audit.tokenCoverage.share, audit.tokenCoverage.share * 100);
    const ui = audit.files.ui;
    const per100 = (n) => (ui ? r2((n / ui) * 100) : 0);
    const c = per100(audit.drift.critical.length);
    const w = per100(audit.drift.warning.length);
    out.drift.critical = got({ count: audit.drift.critical.length, uiFiles: ui, per100: c }, scaled("drift", "critical", c));
    out.drift.warning = got({ count: audit.drift.warning.length, uiFiles: ui, per100: w }, scaled("drift", "warning", w));
    out.components.duplicates = got(audit.duplicates.length, scaled("components", "duplicates", audit.duplicates.length));
    out.components.primitives = got(audit.primitives.length, scaled("components", "primitives", audit.primitives.length));
    const { total, withoutAlt } = audit.images;
    out.accessibility.alt = got({ total, withoutAlt }, total ? ((total - withoutAlt) / total) * 100 : 100);
  } else {
    const why = notAvailable(auditArgv, a);
    for (const [dim, id] of [["tokens", "source"], ["tokens", "share"], ["drift", "critical"], ["drift", "warning"], ["components", "duplicates"], ["components", "primitives"], ["accessibility", "alt"]]) out[dim][id] = missing(why);
  }

  // tokens lint: roles in both themes, contrast pairs
  if (!exists(root, L.tokens)) {
    out.tokens.roles = got(`no ${L.tokens}`, 0);
    out.accessibility.contrast = got(`no ${L.tokens}`, 0);
  } else {
    const t = await call(["tokens", "lint"]);
    const j = t.json;
    if (j && j.missing && Array.isArray(j.raw) && Array.isArray(j.pairs)) {
      const R = rubric.requiredRoles * 2;
      const miss = (j.missing.light || []).length + (j.missing.dark || []).length;
      out.tokens.roles = got({ missing: miss, raw: j.raw.length, required: R }, ((R - miss - j.raw.length) / R) * 100);
      const ok = j.pairs.filter((p) => p.ok).length;
      out.accessibility.contrast = got({ pairs: j.pairs.length, passing: ok }, j.pairs.length ? (ok / j.pairs.length) * 100 : 0);
    } else {
      const why = notAvailable(["tokens", "lint"], t);
      out.tokens.roles = missing(why);
      out.accessibility.contrast = missing(why);
    }
  }

  // rules lint and eval
  const lint = await call(["rules", "lint"]);
  const lj = lint.json;
  let rulesCount = null;
  let reviewCount = 0;
  if (lj && lj.error === "no-rules") {
    rulesCount = 0;
    out.rules.rows = got(`no ${L.rules}`, 0);
    out.rules.scripted = got(`no ${L.rules}`, 0);
  } else if (lj && Number.isInteger(lj.rules)) {
    rulesCount = lj.rules;
    reviewCount = lj.review || 0;
    out.rules.rows = got(lj.rules, scaled("rules", "rows", lj.rules));
    out.rules.scripted = got({ scripted: lj.scripted, rules: lj.rules }, lj.rules ? (lj.scripted / lj.rules) * 100 : 0);
  } else {
    const why = notAvailable(["rules", "lint"], lint);
    out.rules.rows = missing(why);
    out.rules.scripted = missing(why);
  }
  if (rulesCount === 0) {
    out.rules.eval = got(lj && lj.error === "no-rules" ? `no ${L.rules}` : { rows: 0, ok: 0 }, 0);
    out.rules.reviewCases = got(lj && lj.error === "no-rules" ? `no ${L.rules}` : { review: 0, ok: 0 }, 0);
  } else if (lj && lj.ok === false) {
    // eval refuses to run until lint passes: nothing behaves yet
    out.rules.eval = got({ rows: 0, ok: 0, lint: "fails" }, 0);
    out.rules.reviewCases = got({ review: reviewCount, ok: 0, lint: "fails" }, 0);
  } else if (rulesCount !== null) {
    const ev = await call(["rules", "eval"]);
    const ej = ev.json;
    if (ej && Array.isArray(ej.rows) && Array.isArray(ej.reviewCases)) {
      const ok = ej.rows.filter((x) => x.ok).length;
      out.rules.eval = got({ rows: ej.rows.length, ok, uncovered: (ej.uncovered || []).length }, ej.rows.length ? (ok / ej.rows.length) * 100 : 0);
      const cases = ej.reviewCases.filter((c) => c.ok).length;
      const of = Math.max(reviewCount, ej.reviewCases.length);
      out.rules.reviewCases = got({ review: of, ok: cases }, of ? (cases / of) * 100 : 100);
    } else {
      const why = notAvailable(["rules", "eval"], ev);
      out.rules.eval = missing(why);
      out.rules.reviewCases = missing(why);
    }
  } else {
    out.rules.eval = missing("rules lint gave no result");
    out.rules.reviewCases = missing("rules lint gave no result");
  }

  // rationale: decisions (files), goals (loops status), learnings (learnings list)
  const decDir = path.join(root, L.decisions);
  const decisions = fs.existsSync(decDir) ? fs.readdirSync(decDir).filter((f) => /^D-\d+.*\.md$/.test(f)).length : 0;
  out.rationale.decisions = got(decisions, scaled("rationale", "decisions", decisions));
  if (!exists(root, L.goals)) out.rationale.goals = got(`no ${L.goals}`, 0);
  else {
    const s = await call(["loops", "status"]);
    if (s.json && Array.isArray(s.json.goals)) out.rationale.goals = got(s.json.goals.length, scaled("rationale", "goals", s.json.goals.length));
    else out.rationale.goals = missing(notAvailable(["loops", "status"], s));
  }
  if (!exists(root, L.learnings)) out.rationale.learnings = got(`no ${L.learnings}`, 0);
  else {
    const l = await call(["learnings", "list"]);
    if (l.json && Array.isArray(l.json.learnings)) {
      const sourced = l.json.learnings.filter((x) => x && typeof x.source === "string" && x.source.trim()).length;
      out.rationale.learnings = got({ learnings: l.json.learnings.length, sourced }, scaled("rationale", "learnings", sourced));
    } else out.rationale.learnings = missing(notAvailable(["learnings", "list"], l));
  }
  return out;
}

const bandOf = (rubric, s) => rubric.bands.filter((b) => s >= b.min).slice(-1)[0];
const nextBand = (rubric, s) => rubric.bands.find((b) => b.min > s) || null;

const describe = (v) => {
  if (v === null || v === undefined) return "n/a";
  if (typeof v !== "object") return String(v);
  return Object.entries(v)
    .map(([k, x]) => `${k} ${x === null ? "none" : x}`)
    .join(", ");
};

/** Turn gathered inputs into the score JSON. Pure: the same inputs give the same output. */
function render(rubric, gathered) {
  let coverage = 0;
  const dimensions = rubric.dimensions.map((d) => {
    const inputs = {};
    let sum = 0;
    let weights = 0;
    const parts = [];
    for (const i of d.inputs) {
      const v = (gathered[d.id] && gathered[d.id][i.id]) || missing("not gathered");
      inputs[i.id] = v;
      if (v.score === null) {
        parts.push(`${i.name}: not computed (${v.missing})`);
        continue;
      }
      coverage += d.weight * i.weight;
      sum += i.weight * v.score;
      weights += i.weight;
      parts.push(`${i.name}: ${describe(v.value)} → ${v.score}`);
    }
    const score = weights ? Math.round(sum / weights) : null;
    return { id: d.id, name: d.name, weight: d.weight, score, inputs, why: parts.join("; ") };
  });
  coverage = r2(coverage);

  const lacking = dimensions.flatMap((d) => Object.entries(d.inputs).filter(([, v]) => v.score === null).map(([k]) => `${d.id}.${k}`));
  const withheld = coverage < rubric.coverageFloor ? `coverage ${coverage} is below ${rubric.coverageFloor}: ${lacking.join(", ")} could not be computed` : null;
  const scored = dimensions.filter((d) => d.score !== null);
  const totalW = scored.reduce((n, d) => n + d.weight, 0);
  const score = withheld || !totalW ? null : Math.round(scored.reduce((n, d) => n + d.weight * d.score, 0) / totalW);

  let opportunities = [];
  let nearThreshold = [];
  if (score !== null) {
    const imp = Object.fromEntries(rubric.dimensions.map((d, k) => [d.id, { importance: d.importance, order: k }]));
    opportunities = scored
      .filter((d) => d.score < 100)
      .map((d) => ({ dimension: d.id, gap: 100 - d.score, importance: imp[d.id].importance, priority: imp[d.id].importance * (100 - d.score) }))
      .sort((a, b) => b.priority - a.priority || imp[a.dimension].order - imp[b.dimension].order);
    opportunities = opportunities.map((o) => ({ ...o, tie: opportunities.filter((x) => x !== o && x.priority === o.priority).map((x) => x.dimension) }));
    const near = (id, s) => {
      const next = nextBand(rubric, s);
      if (next && next.min - s <= rubric.nearThreshold) nearThreshold.push({ dimension: id, score: s, band: bandOf(rubric, s).id, next: next.id, distance: next.min - s });
    };
    near("overall", score);
    scored.forEach((d) => near(d.id, d.score));
  }

  return {
    version: 2,
    beta: true,
    score,
    band: score === null ? null : bandOf(rubric, score).id,
    withheld,
    coverage,
    dimensions,
    opportunities,
    nearThreshold,
    validity: rubric.validity,
    limits: rubric.limits,
  };
}

async function run(argv, ctx) {
  const parsed = parseArgs(argv);
  if (parsed.help) {
    ctx.out(USAGE);
    return 0;
  }
  const bad = problems(parsed);
  if (bad.length) return ctx.usage(bad.join("; "), USAGE);
  const root = ctx.rootFrom(last(parsed, "--root"));
  for (const d of parsed.positional) {
    const abs = path.resolve(root, d);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) return ctx.usage(`no such folder: ${d}`, USAGE);
  }
  const rubric = loadRubric();
  const r = render(rubric, await gather(ctx, rubric, parsed.positional));
  if (parsed.bools.has("--json")) {
    ctx.json(r);
    return 0;
  }
  ctx.out(`  Readiness (beta): ${r.score === null ? `withheld (${r.withheld || "no dimension could be scored"})` : `${r.score}/100, ${r.band}`} · coverage ${r.coverage}`);
  for (const d of r.dimensions) ctx.out(`    ${d.name.padEnd(20)} ${d.score === null ? "  —" : String(d.score).padStart(3)}  × ${d.weight}`);
  if (r.opportunities.length) {
    ctx.out("  Biggest gaps (importance × gap):");
    r.opportunities.slice(0, 3).forEach((o) => ctx.out(`    ${o.dimension}: gap ${o.gap}, importance ${o.importance}${o.tie.length ? ` (tied with ${o.tie.join(", ")})` : ""}`));
  }
  for (const n of r.nearThreshold) ctx.out(`  Near a band edge: ${n.dimension} at ${n.score} is ${n.distance} from ${n.next}`);
  ctx.out(`  ${r.validity}`);
  return 0;
}

module.exports = { run, render, gather, loadRubric, RUBRIC_FILE, USAGE };
