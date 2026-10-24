"use strict";

/**
 * rubric-eval.test.js: the reference evaluator for rubric v1, held to hand-computed numbers.
 *
 * Every expectation below was worked out on paper from the rubric's bands; none is read back from an evaluator run
 * or from a real repo. Reports are tiny hand-built counters reports; the last describe runs the real counters over a
 * tiny temp repo to prove that every counter and detail field the rubric reads exists in a real report.
 */

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  LANGUAGE, evaluate, evaluateAll, loadRubric, validateRubric, RUBRIC_FILES, roundHalfUp, collectSpecs, leafSpecs, specIds,
  evalItem, makeCtx, pathWords, ownedSpecs,
} = require("./rubric-eval");

const SKILLS_DIR = path.join(__dirname, "..", "..", "..", "pipelines", "design-system", "skills");
// the rubric.json files are the source of truth: the rubric is read out of the three skill folders
const rubric = loadRubric(SKILLS_DIR);
const ra = rubric["readiness-audit"];
const da = rubric["design-audit"];
const dr = rubric["drift-report"];
const PRIM = ["button", "badge", "card", "input"];

// ------------------------------------------------------------------------------------------------ report builders

// the detail fields a real report always carries on these counters (the rubric reads them)
const DETAIL = {
  "census.files.audited": { byExt: {} },
  "census.files.any_type": { byExt: {} },
  "typography.named_size.matches": { byClass: {} },
  "tokens.theme.maps_font_size": { names: [] },
  "tokens.theme.maps_space": { names: [] },
  "colour.rgb_fn.outside_token_source": { withVarArgument: 0 },
  "colour.hsl_fn.outside_token_source": { withVarArgument: 0 },
  "colour.oklch_fn.outside_token_source": { withVarArgument: 0 },
  "tokens.font_size.unconsumed": { declared: 0 },
  "tokens.text.unconsumed": { declared: 0 },
  "tokens.space.unconsumed": { declared: 0 },
  ...Object.fromEntries(PRIM.map((p) => [`primitives.${p}.resolved.to_ui_definition`, { to_ui_definition: 0, to_package: 0, to_other_file: 0 }])),
};

function counterOf(id, v) {
  const isObj = v !== null && typeof v === "object" && "value" in v;
  const c = isObj ? { id, unit: "number", ...v } : { id, unit: typeof v === "boolean" ? "boolean" : "number", value: v };
  if (DETAIL[id]) c.detail = { ...DETAIL[id], ...(c.detail || {}) };
  return c;
}

/** A minimal valid counters report: only the counters named in `map` (id -> value | {value, detail, perFile, ...}). */
function mk(map = {}, extra = {}) {
  return {
    schema: "systemix.audit-counters/1",
    countersVersion: "1.0.0",
    toolVersion: "0.2.1",
    repo: { commit: "0123456789abcdef0123456789abcdef01234567", commitDate: "2026-10-13T22:26:41+00:00", dirty: null, prefix: "" },
    scope: {
      dirs: ["src"],
      missingDirs: [],
      rejectedDirs: [],
      skippedDirs: [],
      tokenSource: { path: "src/app/globals.css", via: "doc:design/DESIGN.md" },
      population: { census: 12, tests: 2, declarations: 0, audited: 10, unreadable: 0 },
    },
    groups: { run: ["census"], skipped: [] },
    counters: Object.entries(map).map(([id, v]) => counterOf(id, v)),
    warnings: [],
    ...extra,
  };
}

const allRubricIds = () => {
  const ids = new Set();
  for (const block of [da, dr, ra]) for (const s of leafSpecs(block, block)) specIds(s).forEach((id) => ids.add(id));
  return [...ids].sort();
};
/** Every counter the rubric reads, at 0, then overrides. A counter set to undefined is left out (absent from the report). */
const zeros = (over = {}) => {
  const m = { ...Object.fromEntries(allRubricIds().map((id) => [id, 0])), ...over };
  for (const k of Object.keys(m)) if (m[k] === undefined) delete m[k];
  return m;
};
const aud = (n, byExt = { ".tsx": n }) => ({ value: n, detail: { byExt } });
/** The counters of a repo that has n audited tsx files and a Tailwind theme: styling code is present and rateable. */
const UI = (n = 10) => ({
  "census.files.audited": aud(n), "colour.scanner.files_audited": n, "census.files.total": n,
  "census.files.any_type": { value: n, detail: { byExt: { ".tsx": n } } }, "tokens.theme.present": true,
});
// counters a real report gives as null when there is nothing to date or divide (no ADR, no snapshot, no status heading, no token record)
const EMPTY_NULLS = {
  "decisions.adr.newest_age_days": null,
  "docs.coverage.token_records_per_custom_property": { value: null, unit: "ratio", detail: { numerator: 0, denominator: 0 } },
  "habit.snapshots.last_age_days": null,
  "legibility.freshness.status_heading_age_days": null,
};
const uiMap = (over = {}) => zeros({ ...EMPTY_NULLS, ...UI(), ...over });
const emptyMap = () => zeros(EMPTY_NULLS);

const ratioCounter = (num, den) => ({ value: den ? Math.round((num / den) * 1e4) / 1e4 : null, unit: "ratio", detail: { numerator: num, denominator: den } });

/** primitives: p -> {ui, local, raw, pkg, other, defs} */
const primCounters = (o) => {
  const m = {};
  for (const p of PRIM) {
    const x = o[p] || {};
    m[`primitives.${p}.resolved.to_ui_definition`] = { value: x.ui || 0, detail: { to_ui_definition: x.ui || 0, to_package: x.pkg || 0, to_other_file: x.other || 0 } };
    m[`primitives.${p}.resolved.to_local_definition`] = x.local || 0;
    m[`primitives.${p}.definitions.total`] = x.defs === undefined ? 0 : x.defs;
    if (p === "button" || p === "input") m[`primitives.${p}.raw.outside_ui`] = x.raw || 0;
  }
  return m;
};
// shorthand rows: button [ui, local, raw], badge [ui, local], card [ui, local], input [ui, local, raw]
const prim = (o) => primCounters({
  button: o.button && { ui: o.button[0], local: o.button[1], raw: o.button[2] },
  badge: o.badge && { ui: o.badge[0], local: o.badge[1] },
  card: o.card && { ui: o.card[0], local: o.card[1] },
  input: o.input && { ui: o.input[0], local: o.input[1], raw: o.input[2] },
});

const IDEAL_PRIMS = Object.fromEntries(PRIM.map((p) => [p, { ui: 100, defs: 1 }]));

/** One counters report in which every readiness item earns its maximum. */
function idealMap() {
  return uiMap({
    ...UI(100),
    "decisions.adr.headings": 10, "decisions.files.lines": 40, "decisions.design_md.h2": 5, "decisions.design_md.lines": 20,
    "docs.coverage.token_records_per_custom_property": ratioCounter(5, 10), "decisions.adr.newest_age_days": 90,
    "docs.token_records.matches": 10, "docs.token_records.keyed": 10, "decisions.design_md.colors_equal_dark": 10, "decisions.design_md.front_matter_colors": 10,
    "guardrails.file.lines": 20, "guardrails.file.bytes": 600, "guardrails.structure.rule_bullets": 8, "guardrails.structure.starred_rules": 1,
    "guardrails.rules.type_size": true, "guardrails.rules.spacing_scale": true, "guardrails.structure.h2_sections": 3, "guardrails.contrast.pairs": 1, "docs.spine.tokens_css": true,
    "tokens.source.found": true,
    "typography.named_size.matches": { value: 100, detail: { byClass: { "text-sm": 100 } } },
    "tokens.theme.maps_font_size": { value: 1, detail: { names: ["--text-sm"] } },
    "tokens.theme.maps_space": { value: 1, detail: { names: ["--spacing"] } },
    "tokens.text.unconsumed": { value: 0, detail: { declared: 1 } },
    "tokens.space.unconsumed": { value: 0, detail: { declared: 1 } },
    "scale.radius.named_classes": 100,
    ...primCounters(IDEAL_PRIMS),
    "reachability.components.other.total": 20,
    "habit.scripts.drift_files": 1, "habit.snapshots.distinct_days": 2, "habit.workflows.drift_noncomment_lines": 1,
    "habit.snapshots.count": 1, "habit.snapshots.last_age_days": 30, "habit.drift_script.exits_nonzero": true,
    "legibility.instructions.present": 1, "legibility.claude_md.lines": 30, "legibility.claude_md.headings": 3, "legibility.guardrails.files_mentioning": 1,
    "legibility.path_refs.resolved": 20, "legibility.path_refs.distinct": 20, "legibility.freshness.status_heading_age_days": 60,
    "legibility.skills.named_installed": 5, "legibility.skills.named_with_skill_md_in_repo": 5,
  });
}

/** A middling report: most items sit inside a band, none at its maximum. */
function midMap() {
  return uiMap({
    ...UI(100),
    "decisions.adr.headings": 5, "decisions.files.lines": 20, "decisions.design_md.h2": 3, "decisions.design_md.lines": 12,
    "docs.coverage.token_records_per_custom_property": ratioCounter(2, 10), "decisions.adr.newest_age_days": 150,
    "docs.token_records.matches": 6, "docs.token_records.keyed": 10, "decisions.design_md.colors_equal_light": 6, "decisions.design_md.front_matter_colors": 10,
    "docs.oklch.docs_claim_without_declaration": true,
    "guardrails.file.lines": 15, "guardrails.file.bytes": 200, "guardrails.structure.rule_bullets": 5, "guardrails.structure.starred_rules": 1,
    "guardrails.rules.spacing_scale": true, "guardrails.structure.h2_sections": 2, "guardrails.contrast.pairs": 2, "docs.spine.tokens_css": true,
    "tokens.source.found": true, "colour.palette_class.matches": 1,
    "typography.arbitrary_size.matches": 10,
    "typography.named_size.matches": { value: 40, detail: { byClass: { "text-sm": 36, "text-lg": 4 } } },
    "tokens.theme.maps_font_size": { value: 1, detail: { names: ["--text-sm"] } },
    "tokens.font_size.unconsumed": { value: 2, detail: { declared: 10 } },
    "tokens.space.unconsumed": { value: 5, detail: { declared: 10 } },
    "scale.spacing_arbitrary.length_literal_matches": 2,
    "scale.radius.named_classes": 40, "scale.radius.var_uses": 5, "scale.radius.hardcoded_uses": 5,
    ...primCounters({ button: { ui: 10, raw: 5, defs: 2 }, badge: { ui: 5, local: 5, defs: 1 }, card: { ui: 2, defs: 1 }, input: { ui: 3, raw: 1, defs: 1 } }),
    "primitives.definitions.identical_groups": 1,
    "reachability.components.other.no_importer": 4, "reachability.components.other.total": 20,
    "colour.scanner.files_with_colour_hits": 5, "colour.scanner.colour_hits": 5,
    "habit.scripts.drift_files": 1, "habit.snapshots.distinct_days": 1, "habit.snapshots.count": 3, "habit.snapshots.last_age_days": 60,
    "legibility.instructions.present": 1, "legibility.claude_md.lines": 20, "legibility.claude_md.headings": 3, "legibility.guardrails.files_mentioning": 1,
    "legibility.path_refs.resolved": 17, "legibility.path_refs.distinct": 20, "legibility.machine_paths.matches": 1, "legibility.freshness.status_heading_age_days": 90,
    "legibility.skills.named_installed": 3, "legibility.skills.named_with_skill_md_in_repo": 5,
  });
}

const all = (map, r = rubric, extra) => evaluateAll(mk(map, extra), r);
const lean = (map) => evaluateAll(mk(map), rubric, { nearThreshold: false });
const pub = (map, r = rubric, extra) => evaluate(mk(map, extra), r);
const run = all;
const findItem = (dimKey, itemId) => ra.dimensions.find((d) => d.key === dimKey).items.find((i) => i.id === itemId);
const itemRow = (dimKey, itemId, map) => evalItem(makeCtx(mk(uiMap(map)), {}, ra), findItem(dimKey, itemId));
const dimOf = (r, key) => r.dimensions[key];
const itemOf = (r, dimKey, id) => r.dimensions[dimKey].items.find((i) => i.id === id);
const deepFreeze = (o) => {
  if (o && typeof o === "object" && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(deepFreeze); }
  return o;
};

// ------------------------------------------------------------------------------------------------ the rubric itself

describe("the rubric is sound", () => {
  const README = fs.readFileSync(path.join(__dirname, "..", "..", "..", "src", "lib", "counters", "README.md"), "utf8");
  const knownIds = new Set([...README.matchAll(/^\| `([a-z0-9_]+(?:\.[a-z0-9_]+)+)` \| (?:file|line|match|distinct|boolean|ratio|number|string|date) \|/gm)].map((m) => m[1]));

  test("the counters README lists at least the 354 ids of countersVersion 1.0.0 (ids may be added, never removed, within a major)", () => {
    expect(knownIds.size).toBeGreaterThanOrEqual(354);
  });

  test("validateRubric finds nothing: ids exist, six dimensions of 10 points, bands monotone, shared parts equal", () => {
    expect(validateRubric(rubric, { knownIds })).toEqual([]);
  });

  test("importance is the pinned table and the dimension order is fixed", () => {
    expect(ra.order).toEqual(["captured_rationale", "codified_rules", "token_discipline", "component_consistency", "drift_control", "agent_legibility"]);
    expect(ra.importance).toEqual({ captured_rationale: 9, codified_rules: 9, token_discipline: 8, component_consistency: 8, drift_control: 7, agent_legibility: 6 });
  });

  test("every dimension's items sum to exactly 10 points", () => {
    for (const dim of ra.dimensions) expect([dim.key, dim.items.reduce((s, i) => s + i.max, 0)]).toEqual([dim.key, 10]);
  });

  test("no counter id feeds two readiness dimensions (an alias pair is one fact; an evidence gate adds no points)", () => {
    const owner = new Map();
    for (const dim of ra.dimensions) {
      for (const it of dim.items) {
        for (const s of ownedSpecs(ra, it)) {
          for (const id of specIds(s)) {
            if (ra.guards.population.includes(id)) continue;
            expect([id, owner.get(id) ?? dim.key]).toEqual([id, dim.key]);
            owner.set(id, dim.key);
          }
        }
      }
    }
    expect(owner.size).toBeGreaterThan(60);
  });

  test("each counter family belongs to one dimension: colour hits to drift control, typography and scale to token discipline", () => {
    const dims = (prefix) => new Set(ra.dimensions.filter((d) => d.items.some((it) => [...ownedSpecs(ra, it)].some((s) => specIds(s).some((id) => id.startsWith(prefix))))).map((d) => d.key));
    expect(dims("colour.scanner.")).toEqual(new Set(["drift_control"]));
    expect(dims("typography.")).toEqual(new Set(["token_discipline"]));
    expect(dims("scale.")).toEqual(new Set(["token_discipline"]));
    expect(dims("habit.")).toEqual(new Set(["drift_control"]));
    expect(dims("legibility.")).toEqual(new Set(["agent_legibility"]));
    expect(dims("guardrails.")).toEqual(new Set(["codified_rules"]));
    expect(dims("docs.spine.")).toEqual(new Set(["codified_rules"]));
    expect(dims("primitives.")).toEqual(new Set(["component_consistency"]));
    expect(dims("reachability.")).toEqual(new Set(["component_consistency"]));
    expect(dims("decisions.")).toEqual(new Set(["captured_rationale"]));
  });

  test("the type-size axis lives in token discipline, not in the drift-control measure", () => {
    const driftIds = [...leafSpecs(dr, dr.drift_control.measure)].flatMap(specIds);
    expect(driftIds.some((id) => id.startsWith("typography.") || id === "colour.scanner.px_hits" || id === "colour.scanner.files_with_hits")).toBe(false);
  });

  test("the shared measures, their gates and the derived values they read are word for word the same in both owners", () => {
    expect(findItem("component_consistency", "canonical_reuse").measure).toEqual(da.sub_scores.components.measure);
    expect(findItem("drift_control", "drift_control_score").measure).toEqual(dr.drift_control.measure);
    expect(findItem("drift_control", "drift_control_score").requires).toEqual(dr.drift_control.requires);
    for (const name of Object.keys(da.derived)) if (ra.derived[name]) expect(ra.derived[name]).toEqual(da.derived[name]);
    for (const name of Object.keys(dr.derived)) if (da.derived[name]) expect(da.derived[name]).toEqual(dr.derived[name]);
  });

  test("the three blocks carry the same validity sentence, the same guards, and no item rounds before banding", () => {
    expect(new Set([ra.validity, da.validity, dr.validity]).size).toBe(1);
    expect(ra.validity).toMatch(/calibrated to nothing yet/);
    expect(JSON.stringify(ra.guards)).toBe(JSON.stringify(da.guards));
    expect(JSON.stringify(da.guards)).toBe(JSON.stringify(dr.guards));
    expect(JSON.stringify(ra)).not.toMatch(/"round"/);
  });

  test("every block publishes its limits, and the readiness overall is labelled a rubric score, not a measurement", () => {
    for (const b of [ra, da, dr]) expect(b.limits.length).toBeGreaterThan(0);
    expect(ra.overall.label).toMatch(/rubric score/);
    expect(ra.dimensions.every((d) => typeof d.limit === "string" || d.key === "x")).toBe(true);
  });

  describe("validateRubric catches a broken rubric", () => {
    const clone = () => JSON.parse(JSON.stringify(rubric));
    test("items that do not sum to 10", () => {
      const r = clone();
      r["readiness-audit"].dimensions[1].items[0].max = 3;
      expect(validateRubric(r)).toEqual(expect.arrayContaining([expect.stringContaining("items sum to")]));
    });
    test("a counter measured by two items", () => {
      const r = clone();
      r["readiness-audit"].dimensions[0].items[1].measure = { counter: "decisions.adr.headings" }; // adr_corpus already measures it
      expect(validateRubric(r).join("\n")).toMatch(/decisions\.adr\.headings is measured by two items/);
    });
    test("a counter feeding two dimensions, even as a gate only", () => {
      const r = clone();
      r["readiness-audit"].dimensions[1].items[1].requires = [{ sum_of: ["decisions.adr.headings"], when: ">= 1" }]; // codified_rules reads a captured_rationale counter
      expect(validateRubric(r)).toEqual(["decisions.adr.headings feeds two dimensions (captured_rationale and codified_rules)"]);
    });
    test("an alias pair is one fact: the scanner population and the census population cannot be split across dimensions once the population exemption is gone", () => {
      const r = clone();
      for (const k of ["readiness-audit", "design-audit", "drift-report"]) r[k].guards.population = [];
      const msg = validateRubric(r).join("\n");
      expect(msg).toMatch(/census\.files\.audited feeds two dimensions/);
    });
    test("points that rise down the band list", () => {
      const r = clone();
      r["readiness-audit"].dimensions[1].items[1].bands.splice(2, 0, { when: ">= 2", pts: 2 });
      expect(validateRubric(r).join("\n")).toMatch(/points rise down the band list/);
    });
    test("thresholds that run the wrong way for the declared direction", () => {
      const r = clone();
      r["readiness-audit"].dimensions[1].items[1].direction = "lower";
      expect(validateRubric(r).join("\n")).toMatch(/thresholds must rise/);
    });
    test("a band list without a closing else", () => {
      const r = clone();
      r["readiness-audit"].dimensions[1].items[2].bands.pop();
      expect(validateRubric(r).join("\n")).toMatch(/last band must be "else"/);
    });
    test("a shared measure that drifted from its twin, and a shared gate list that did", () => {
      const r = clone();
      r["drift-report"].drift_control.measure.ratio.scale = 10;
      expect(validateRubric(r).join("\n")).toMatch(/differs from drift-report:drift_control/);
      const g = clone();
      g["drift-report"].drift_control.requires = [];
      expect(validateRubric(g).join("\n")).toMatch(/requires differ from drift-report:drift_control/);
    });
    test("a gate or a derived value that differs between two owners that both define it", () => {
      const r = clone();
      r["drift-report"].gates.styling.when = ">= 2";
      expect(validateRubric(r).join("\n")).toMatch(/gates "styling" differs between/);
      const d = clone();
      d["drift-report"].derived.dirty_colour_files = { min: ["colour.scanner.files_with_colour_hits", "colour.scanner.colour_hits"] };
      expect(validateRubric(d).join("\n")).toMatch(/derived "dirty_colour_files" differs between/);
    });
    test("blocks with different guards or a different validity sentence", () => {
      const r = clone();
      r["drift-report"].guards.exemption_cap = 0.9;
      expect(validateRubric(r).join("\n")).toMatch(/must carry the same guards/);
      const v = clone();
      v["drift-report"].validity = "a different sentence";
      expect(validateRubric(v).join("\n")).toMatch(/same validity sentence/);
    });
    test("a reference to a derived value or a gate that is not defined", () => {
      const r = clone();
      r["readiness-audit"].dimensions[4].items[0].measure.ratio.num = ["@nothing"];
      expect(validateRubric(r).join("\n")).toMatch(/@nothing is not derived/);
      const g = clone();
      g["readiness-audit"].dimensions[2].items[0].requires = [{ gate: "nope" }];
      expect(validateRubric(g).join("\n")).toMatch(/gate "nope" is not defined/);
    });
    test("an item that still rounds before banding (rubric-language/1)", () => {
      const r = clone();
      r["readiness-audit"].dimensions[4].items[0].round = true;
      expect(validateRubric(r).join("\n")).toMatch(/round is gone in rubric-language\/2/);
    });
    test("two report lines with one id (one would silently replace the other)", () => {
      const r = clone();
      r["drift-report"].lines[0].id = r["design-audit"].lines[0].id;
      expect(validateRubric(r)).toEqual(["two report lines share an id"]);
    });
    test("a block written in another language, or scoring another counters major", () => {
      const a = clone();
      a["design-audit"].language = "rubric-language/1";
      expect(validateRubric(a).join("\n")).toMatch(/design-audit: written in rubric-language\/1/);
      const b = clone();
      b["drift-report"].counters = { schema: "systemix.audit-counters/1", major: 2 };
      expect(validateRubric(b).join("\n")).toMatch(/drift-report: scores a different counters schema or major/);
    });
    test("a band condition nobody can read is reported, not thrown", () => {
      const r = clone();
      r["readiness-audit"].dimensions[1].items[1].bands[1].when = "about 3";
      expect(validateRubric(r).join("\n")).toMatch(/codified_rules\.rule_count: rubric: cannot read the condition "about 3"/);
    });
    test("an unknown counter id", () => {
      const r = clone();
      r["readiness-audit"].dimensions[1].items[1].measure = { counter: "guardrails.structure.rules_bulletz" };
      expect(validateRubric(r, { knownIds }).join("\n")).toMatch(/unknown counter id/);
    });
  });
});

// ------------------------------------------------------------------------------------------------ every item and every band edge

const R = (value) => ({ value, unit: "ratio" });
const ABSENT = undefined;
const adr = (h, lines) => ({ "decisions.adr.headings": h, "decisions.files.lines": lines });
const dmd = (h2, lines) => ({ "decisions.design_md.h2": h2, "decisions.design_md.lines": lines });
const guard = (bullets, bytes) => ({ "guardrails.structure.rule_bullets": bullets, "guardrails.file.bytes": bytes });
// font sizes: arbitrary, named, and how many of the named ones the theme maps (text-sm is mapped, text-lg is not)
const fs_ = (arb, named, mapped) => ({
  "typography.arbitrary_size.matches": arb,
  "typography.named_size.matches": { value: named, detail: { byClass: { "text-sm": mapped, "text-lg": named - mapped } } },
  "tokens.theme.maps_font_size": { value: 1, detail: { names: ["--text-sm"] } },
});
const names = (n) => Array.from({ length: n }, (_, i) => `--x-${i}`);
// type tokens: unconsumed font-size, declared font-size, unconsumed text, declared text, names the theme maps
const typeTok = (fu, fd, tu, td, n) => ({
  "tokens.font_size.unconsumed": { value: fu, detail: { declared: fd } }, "tokens.text.unconsumed": { value: tu, detail: { declared: td } },
  "tokens.theme.maps_font_size": { value: n, detail: { names: names(n) } },
});
const spaceTok = (u, d, n) => ({ "tokens.space.unconsumed": { value: u, detail: { declared: d } }, "tokens.theme.maps_space": { value: n, detail: { names: names(n) } } });
const dirty = (files, audited, literalHits = files) => ({ "colour.scanner.files_with_colour_hits": files, "colour.scanner.colour_hits": literalHits, "colour.scanner.files_audited": audited });
const leg = (lines, headings = 3) => ({ "legibility.claude_md.lines": lines, "legibility.claude_md.headings": headings });
const defs = (b, ba, c, i) => ({ "primitives.button.definitions.total": b, "primitives.badge.definitions.total": ba, "primitives.card.definitions.total": c, "primitives.input.definitions.total": i });
const NO_STYLING = { "census.files.audited": aud(0, {}), "colour.scanner.files_audited": 0 };
const NO_TAILWIND = { "tokens.theme.present": false };

const TABLES = {
  // [counters, points, band that matched (its `when`) or the status when no band was reached]
  "captured_rationale.adr_corpus": [
    [adr(10, 40), 2, ">= 10"], [adr(9, 36), 1, ">= 3"], [adr(3, 12), 1, ">= 3"], [adr(2, 8), 0.5, ">= 1"], [adr(1, 4), 0.5, ">= 1"], [adr(0, 0), 0, "else"],
    [adr(10, 39), 0, "gated"], // 3.9 lines per heading: headings without bodies earn nothing
    [{ ...adr(10, 40), "decisions.adr.headings": ABSENT }, 0, "missing"],
  ],
  "captured_rationale.design_md_sections": [
    [dmd(5, 20), 2, ">= 5"], [dmd(4, 16), 1.5, ">= 3"], [dmd(3, 12), 1.5, ">= 3"], [dmd(2, 8), 1, ">= 1"], [dmd(1, 4), 1, ">= 1"], [dmd(0, 0), 0, "else"],
    [dmd(5, 19), 0, "gated"], // 3.8 lines per section
  ],
  "captured_rationale.token_record_coverage": [
    [{ "docs.coverage.token_records_per_custom_property": R(0.5) }, 1, ">= 0.5"], [{ "docs.coverage.token_records_per_custom_property": R(0.4999) }, 0.5, ">= 0.1"],
    [{ "docs.coverage.token_records_per_custom_property": R(0.1) }, 0.5, ">= 0.1"], [{ "docs.coverage.token_records_per_custom_property": R(0.0999) }, 0, "else"],
    [{ "docs.coverage.token_records_per_custom_property": R(null) }, 0, "na"],
  ],
  "captured_rationale.adr_recency": [
    [{ "decisions.adr.headings": 1, "decisions.adr.newest_age_days": 90 }, 2, "<= 90"], [{ "decisions.adr.headings": 1, "decisions.adr.newest_age_days": 91 }, 1, "<= 180"],
    [{ "decisions.adr.headings": 1, "decisions.adr.newest_age_days": 180 }, 1, "<= 180"], [{ "decisions.adr.headings": 1, "decisions.adr.newest_age_days": 181 }, 0.5, "<= 365"],
    [{ "decisions.adr.headings": 1, "decisions.adr.newest_age_days": 365 }, 0.5, "<= 365"], [{ "decisions.adr.headings": 1, "decisions.adr.newest_age_days": 366 }, 0, "else"],
    [{ "decisions.adr.headings": 1, "decisions.adr.newest_age_days": 0 }, 2, "<= 90"], // committed the same day: fresh
    [{ "decisions.adr.headings": 0, "decisions.adr.newest_age_days": 0 }, 0, "gated"], // zero days old means nothing without a record
    [{ "decisions.adr.headings": 1, "decisions.adr.newest_age_days": -1 }, 0, "gated"], // a date after HEAD earns no freshness
    [{ "decisions.adr.headings": 1, "decisions.adr.newest_age_days": -30000 }, 0, "gated"],
    [{ "decisions.adr.headings": 1, "decisions.adr.newest_age_days": null }, 0, "na"],
  ],
  "captured_rationale.token_record_currency": [
    [{ "docs.token_records.matches": 9, "docs.token_records.keyed": 10 }, 1, ">= 0.9"], [{ "docs.token_records.matches": 8, "docs.token_records.keyed": 10 }, 0.5, ">= 0.5"],
    [{ "docs.token_records.matches": 5, "docs.token_records.keyed": 10 }, 0.5, ">= 0.5"], [{ "docs.token_records.matches": 4, "docs.token_records.keyed": 10 }, 0, "else"],
    [{ "docs.token_records.matches": 89, "docs.token_records.keyed": 100 }, 0.5, ">= 0.5"], [{ "docs.token_records.matches": 49, "docs.token_records.keyed": 100 }, 0, "else"], // one hundredth under each edge
    [{ "docs.token_records.matches": 0, "docs.token_records.keyed": 0 }, 0, "zero"],
  ],
  "captured_rationale.design_md_currency": [
    [{ "decisions.design_md.colors_equal_light": 9, "decisions.design_md.colors_equal_dark": 0, "decisions.design_md.front_matter_colors": 10 }, 1, ">= 0.9"],
    [{ "decisions.design_md.colors_equal_light": 0, "decisions.design_md.colors_equal_dark": 9, "decisions.design_md.front_matter_colors": 10 }, 1, ">= 0.9"],
    // best of the two themes (5/10), not their sum (9/10)
    [{ "decisions.design_md.colors_equal_light": 4, "decisions.design_md.colors_equal_dark": 5, "decisions.design_md.front_matter_colors": 10 }, 0.5, ">= 0.5"],
    [{ "decisions.design_md.colors_equal_light": 4, "decisions.design_md.colors_equal_dark": 4, "decisions.design_md.front_matter_colors": 10 }, 0, "else"],
    [{ "decisions.design_md.colors_equal_light": 89, "decisions.design_md.colors_equal_dark": 0, "decisions.design_md.front_matter_colors": 100 }, 0.5, ">= 0.5"],
    [{ "decisions.design_md.colors_equal_light": 0, "decisions.design_md.colors_equal_dark": 49, "decisions.design_md.front_matter_colors": 100 }, 0, "else"],
    [{ "decisions.design_md.colors_equal_light": 0, "decisions.design_md.colors_equal_dark": 0, "decisions.design_md.front_matter_colors": 0 }, 0, "zero"],
  ],
  "captured_rationale.no_contradictions": [
    [{ "decisions.adr.headings": 0, "decisions.design_md.h2": 0, "docs.oklch.docs_claim_without_declaration": false, "decisions.design_md.generator_outputs_missing": 0 }, 0, "gated"],
    [{ "decisions.adr.headings": 1, "decisions.design_md.h2": 0, "docs.oklch.docs_claim_without_declaration": false, "decisions.design_md.generator_outputs_missing": 0 }, 1, "== 0"],
    [{ "decisions.adr.headings": 0, "decisions.design_md.h2": 1, "docs.oklch.docs_claim_without_declaration": true, "decisions.design_md.generator_outputs_missing": 0 }, 0.5, "<= 1"],
    [{ "decisions.adr.headings": 1, "decisions.design_md.h2": 0, "docs.oklch.docs_claim_without_declaration": false, "decisions.design_md.generator_outputs_missing": 1 }, 0.5, "<= 1"],
    [{ "decisions.adr.headings": 1, "decisions.design_md.h2": 0, "docs.oklch.docs_claim_without_declaration": true, "decisions.design_md.generator_outputs_missing": 1 }, 0, "else"],
  ],

  "codified_rules.guardrails_file": [
    [{ "guardrails.file.lines": 20 }, 2, ">= 20"], [{ "guardrails.file.lines": 19 }, 1, ">= 8"], [{ "guardrails.file.lines": 8 }, 1, ">= 8"],
    [{ "guardrails.file.lines": 7 }, 0, "else"], [{ "guardrails.file.lines": 1 }, 0, "else"], // a file holding only "x"
  ],
  "codified_rules.rule_count": [
    [guard(8, 240), 2, ">= 8"], [guard(7, 210), 1, ">= 3"], [guard(3, 90), 1, ">= 3"], [guard(2, 60), 0.5, ">= 1"], [guard(1, 30), 0.5, ">= 1"], [guard(0, 0), 0, "else"],
    [guard(8, 239), 0, "gated"], // 29.9 bytes per rule: one-word bullets are not rules
    [guard(11, 33), 0, "gated"], // eleven bullets of three bytes each
  ],
  "codified_rules.starred_rules": [[{ "guardrails.structure.starred_rules": 1 }, 0.5, ">= 1"], [{ "guardrails.structure.starred_rules": 0 }, 0, "else"]],
  "codified_rules.type_size_rule": [[{ "guardrails.rules.type_size": true }, 1, "true"], [{ "guardrails.rules.type_size": false }, 0, "else"]],
  "codified_rules.spacing_scale_rule": [[{ "guardrails.rules.spacing_scale": true }, 1, "true"], [{ "guardrails.rules.spacing_scale": false }, 0, "else"]],
  "codified_rules.sections": [
    [{ "guardrails.structure.h2_sections": 3 }, 1, ">= 3"], [{ "guardrails.structure.h2_sections": 2 }, 0.5, ">= 1"],
    [{ "guardrails.structure.h2_sections": 1 }, 0.5, ">= 1"], [{ "guardrails.structure.h2_sections": 0 }, 0, "else"],
  ],
  "codified_rules.contrast_checked": [
    [{ "guardrails.contrast.pairs": 0, "guardrails.contrast.pairs_below_4_5": 0 }, 0, "gated"], // nothing to check is not a pass
    [{ "guardrails.contrast.pairs": 1, "guardrails.contrast.pairs_below_4_5": 0 }, 1.5, "== 0"],
    [{ "guardrails.contrast.pairs": 2, "guardrails.contrast.pairs_below_4_5": 1 }, 0, "else"],
  ],
  "codified_rules.tokens_css": [[{ "docs.spine.tokens_css": true }, 1, "true"], [{ "docs.spine.tokens_css": false }, 0, "else"]],

  "token_discipline.token_source": [
    [{ "tokens.source.found": true }, 1, "true"], [{ "tokens.source.found": false }, 0, "else"],
    [{ "tokens.source.found": true, ...NO_STYLING }, 0, "gated"], // no styling code, nothing to be disciplined about
    [{ "tokens.source.found": true, ...NO_STYLING, "typography.named_size.matches": 1 }, 1, "true"], // one font-size utility is styling code
    [{ "tokens.source.found": true, ...NO_STYLING, "census.files.audited": aud(1, { ".css": 1 }) }, 1, "true"], // so is one css file
  ],
  "token_discipline.palette_classes": [
    [{ "colour.palette_class.matches": 0, "colour.palette_class.extra_matches": 0, "census.files.audited": aud(10) }, 2, "== 0"],
    [{ "colour.palette_class.matches": 1, "colour.palette_class.extra_matches": 0, "census.files.audited": aud(20) }, 1, "<= 0.05"], // 1/20 = 0.05
    [{ "colour.palette_class.matches": 0, "colour.palette_class.extra_matches": 1, "census.files.audited": aud(20) }, 1, "<= 0.05"], // extra matches count too
    [{ "colour.palette_class.matches": 1, "colour.palette_class.extra_matches": 0, "census.files.audited": aud(19) }, 0, "else"], // 1/19 = 0.0526
    [{ ...NO_TAILWIND }, 0, "gated"], // no Tailwind classes anywhere: 0 hits is no evidence
    [{ "census.files.audited": aud(0, {}), "colour.scanner.colour_hits": 5 }, 0, "zero"], // hits but no audited file: an inconsistent report is not rated
  ],
  "token_discipline.font_size_off_token": [
    [fs_(1, 19, 19), 3, "<= 0.05"], [fs_(2, 18, 18), 2, "<= 0.15"], [fs_(3, 17, 17), 2, "<= 0.15"], [fs_(4, 16, 16), 1, "<= 0.35"], [fs_(7, 13, 13), 1, "<= 0.35"], [fs_(8, 12, 12), 0, "else"],
    [fs_(6, 94, 94), 2, "<= 0.15"], [fs_(16, 84, 84), 1, "<= 0.35"], [fs_(36, 64, 64), 0, "else"], // one hundredth over each edge
    [fs_(0, 100, 95), 3, "<= 0.05"], // 5 of 100 named sizes are not mapped
    [fs_(0, 20, 0), 0, "else"], // twenty named sizes the theme does not map are all off-token
    [fs_(0, 20, 10), 0, "else"], // half of them: 0.5
    [fs_(0, 0, 0), 3, "<= 0.05"], // no font-size utilities in a repo with styling code: nothing to conform
    [{ ...fs_(0, 0, 0), ...NO_TAILWIND }, 0, "gated"],
    // a declared exemption is applied when the counter carries the split (the exemption covers 1 of 10 audited files, within the cap) ...
    [{ ...fs_(100, 19, 19), "typography.arbitrary_size.matches": { value: 100, detail: { exempt: { excludingExemptFiles: 1 } } }, "typography.exempt.files": { value: 1, detail: { files: ["src/m.tsx"] } } }, 3, "<= 0.05"],
    // ... through the counter of its own when there is one ...
    [{ ...fs_(100, 19, 19), "typography.arbitrary_size.matches_excluding_exempt": 1, "typography.exempt.files": { value: 1, detail: { files: ["src/m.tsx"] } } }, 3, "<= 0.05"],
    // ... the plain value is used when it does not (100/(100+19) = 0.84) ...
    [{ ...fs_(100, 19, 19), "typography.arbitrary_size.matches": { value: 100, detail: {} } }, 0, "else"],
    // ... and when the exemption covers more than 10 percent of the audited files it is ignored: 5 of 10
    [{ ...fs_(100, 19, 19), "typography.arbitrary_size.matches": { value: 100, detail: { exempt: { excludingExemptFiles: 1 } } }, "typography.exempt.files": { value: 5, detail: { files: [] } } }, 0, "else"],
  ],
  "token_discipline.type_scale_wired": [
    [typeTok(0, 10, 0, 0, 0), 1, "<= 0.2"], [typeTok(2, 10, 0, 0, 0), 1, "<= 0.2"], [typeTok(3, 10, 0, 0, 0), 0.5, "<= 0.6"], [typeTok(6, 10, 0, 0, 0), 0.5, "<= 0.6"], [typeTok(7, 10, 0, 0, 0), 0, "else"],
    [typeTok(8, 9, 0, 0, 0), 0, "else"], // nine declared, one has a consumer: 8 of 9 are unwired
    [typeTok(0, 0, 9, 9, 9), 1, "<= 0.2"], // a --text-* scale mapped in @theme, nine names
    [typeTok(0, 0, 9, 9, 5), 0.5, "<= 0.6"], // five of nine mapped: 4/9
    [typeTok(0, 0, 0, 0, 2), 1, "<= 0.2"], // mapped names with no declaration of their own: wired
    [typeTok(0, 0, 0, 0, 0), 0, "zero"], // no type tokens at all: not rated
    [{ ...typeTok(0, 10, 0, 0, 0), ...NO_STYLING }, 0, "gated"],
  ],
  "token_discipline.spacing_literals": [
    [{ "scale.spacing_arbitrary.length_literal_matches": 2, "census.files.audited": aud(100) }, 1, "<= 0.02"],
    [{ "scale.spacing_arbitrary.length_literal_matches": 3, "census.files.audited": aud(100) }, 0.5, "<= 0.1"],
    [{ "scale.spacing_arbitrary.length_literal_matches": 10, "census.files.audited": aud(100) }, 0.5, "<= 0.1"],
    [{ "scale.spacing_arbitrary.length_literal_matches": 11, "census.files.audited": aud(100) }, 0, "else"],
    [{ "scale.spacing_arbitrary.length_literal_matches": { value: 50, detail: { exempt: { excludingExemptFiles: 2 } } }, "census.files.audited": aud(100) }, 1, "<= 0.02"],
    [{ "scale.spacing_arbitrary.length_literal_matches": 0, ...NO_TAILWIND }, 0, "gated"],
    [{ "census.files.audited": aud(0, {}), "colour.scanner.colour_hits": 5 }, 0, "zero"],
  ],
  "token_discipline.spacing_scale_wired": [
    [spaceTok(0, 10, 0), 1, "<= 0.2"], [spaceTok(2, 10, 0), 1, "<= 0.2"], [spaceTok(3, 10, 0), 0.5, "<= 0.6"], [spaceTok(6, 10, 0), 0.5, "<= 0.6"], [spaceTok(7, 10, 0), 0, "else"],
    [spaceTok(0, 0, 1), 1, "<= 0.2"], // Tailwind's --spacing base in @theme and no --space-* family: wired
    [spaceTok(0, 0, 0), 0, "zero"],
  ],
  "token_discipline.radius_share": [
    [{ "scale.radius.named_classes": 19, "scale.radius.var_uses": 0, "scale.radius.hardcoded_uses": 1 }, 1, "<= 0.05"], // 1/20
    [{ "scale.radius.named_classes": 93, "scale.radius.var_uses": 1, "scale.radius.hardcoded_uses": 6 }, 0.5, "<= 0.2"], // 6/100
    [{ "scale.radius.named_classes": 80, "scale.radius.var_uses": 0, "scale.radius.hardcoded_uses": 20 }, 0.5, "<= 0.2"], // 20/100
    [{ "scale.radius.named_classes": 79, "scale.radius.var_uses": 0, "scale.radius.hardcoded_uses": 21 }, 0, "else"], // 21/100
    [{ "scale.radius.named_classes": 0, "scale.radius.var_uses": 0, "scale.radius.hardcoded_uses": 0 }, 1, "<= 0.05"], // no radius utilities: nothing to conform
    [{ "scale.radius.named_classes": 0, ...NO_STYLING }, 0, "gated"],
    [{ "tokens.theme.present": false }, 0, "gated"], // plain css: the radius counters read Tailwind classes and inline styles, so an empty count says nothing
  ],

  // canonical-reuse rows: pooled over the four primitives; button [ui, local, raw], badge [ui, local], card [ui, local], input [ui, local, raw]
  "component_consistency.canonical_reuse": [
    [prim({ button: [19, 0, 1] }), 5, ">= 95"], // 95
    [prim({ button: [189, 0, 11] }), 4, ">= 85"], // 94.5 is banded as 94.5, not as a rounded 95
    [prim({ button: [472, 0, 28] }), 4, ">= 85"], // 94.4
    [prim({ button: [17, 0, 3] }), 4, ">= 85"], // 85
    [prim({ button: [169, 0, 31] }), 3, ">= 70"], // 84.5
    [prim({ button: [84, 0, 16] }), 3, ">= 70"], // 84
    [prim({ button: [7, 0, 3] }), 3, ">= 70"], // 70
    [prim({ button: [69, 0, 31] }), 2, ">= 50"], // 69
    [prim({ button: [5, 0, 5] }), 2, ">= 50"], // 50
    [prim({ button: [49, 0, 51] }), 1, ">= 30"], // 49
    [prim({ button: [3, 0, 7] }), 1, ">= 30"], // 30
    [prim({ button: [29, 0, 71] }), 0, "else"], // 29
    [prim({}), 0, "zero"], // nothing to rate
    [prim({ button: [3, 0, 1] }), 0, "zero"], // 4 tags: too few to rate (5 are needed)
    [prim({ button: [5, 0, 0] }), 5, ">= 95"], // 5 tags are enough
    [prim({ button: [9, 0, 0], badge: [0, 1] }), 4, ">= 85"], // pooled by tag: 9 of 10, not the mean of 100 and 0
    [prim({ button: [8, 0, 0], input: [4, 0, 4] }), 3, ">= 70"], // 12 of 16; Input counts its raw <input> tags
    [prim({ button: [10, 0, 0], badge: [1, 3] }), 3, ">= 70"], // 11 of 14: a Badge copy defined in the file counts against it
    // a tag that renders a package, or the only definition of its name in the project, is canonical
    [primCounters({ button: { pkg: 10 } }), 5, ">= 95"],
    [primCounters({ button: { other: 10, defs: 1 } }), 5, ">= 95"],
    // a name defined in three files: the tags that render another file's definition are not canonical
    [primCounters({ button: { other: 10, defs: 3 } }), 0, "else"],
  ],
  "component_consistency.identical_definitions": [
    [{ "primitives.definitions.identical_groups": 0 }, 1, "== 0"], [{ "primitives.definitions.identical_groups": 1 }, 0.5, "<= 2"],
    [{ "primitives.definitions.identical_groups": 2 }, 0.5, "<= 2"], [{ "primitives.definitions.identical_groups": 3 }, 0, "else"],
    [{ "census.files.audited": aud(10, { ".ts": 10 }), "primitives.definitions.identical_groups": 0 }, 0, "gated"], // no markup file: nothing was compared
    [{ "census.files.audited": aud(1), "primitives.definitions.identical_groups": 0 }, 1, "== 0"], // one markup file is enough
  ],
  "component_consistency.single_definitions": [
    [defs(1, 1, 1, 1), 1, "<= 1"], [defs(1, 2, 1, 1), 0.5, "<= 2"], [defs(2, 2, 2, 2), 0.5, "<= 2"], [defs(1, 3, 1, 1), 0, "else"],
    [defs(4, 0, 0, 0), 0, "else"], // one primitive defined four times is not hidden by the others being absent
    [defs(1, 0, 0, 0), 1, "<= 1"], // one primitive defined once is enough to compare
    [defs(0, 0, 0, 0), 0, "gated"], // none defined: nothing to duplicate
    [{ ...defs(1, 1, 1, 1), "census.files.audited": aud(10, { ".ts": 10 }) }, 0, "gated"],
  ],
  "component_consistency.dead_components": [
    [{ "reachability.components.other.no_importer": 1, "reachability.components.other.total": 20 }, 3, "<= 0.05"],
    [{ "reachability.components.other.no_importer": 3, "reachability.components.other.total": 20 }, 2, "<= 0.15"],
    [{ "reachability.components.other.no_importer": 6, "reachability.components.other.total": 20 }, 1, "<= 0.3"],
    [{ "reachability.components.other.no_importer": 7, "reachability.components.other.total": 20 }, 0, "else"],
    [{ "reachability.components.other.no_importer": 6, "reachability.components.other.total": 100 }, 2, "<= 0.15"], // 0.06
    [{ "reachability.components.other.no_importer": 16, "reachability.components.other.total": 100 }, 1, "<= 0.3"], // 0.16
    [{ "reachability.components.other.no_importer": 31, "reachability.components.other.total": 100 }, 0, "else"], // 0.31
    [{ "reachability.components.other.no_importer": 0, "reachability.components.other.total": 0, "reachability.components.ui.total": 1 }, 0, "zero"], // only a ui kit: no component outside it is seen, so nothing is rated (absence earns nothing)
    [{ "reachability.components.other.no_importer": 0, "reachability.components.other.total": 0, "reachability.components.ui.total": 0 }, 0, "gated"], // no components folder
  ],

  "drift_control.drift_control_score": [
    // [dirty files, audited files] -> (audited - dirty) * 100 / audited, banded on the exact value
    [dirty(2, 100), 5, ">= 98"], [dirty(3, 100), 4, ">= 95"], [dirty(5, 100), 4, ">= 95"], [dirty(6, 100), 3, ">= 90"], [dirty(10, 100), 3, ">= 90"],
    [dirty(11, 100), 2, ">= 80"], [dirty(20, 100), 2, ">= 80"], [dirty(21, 100), 1, ">= 60"], [dirty(40, 100), 1, ">= 60"], [dirty(41, 100), 0, "else"],
    [dirty(10, 193), 3, ">= 90"], // 94.82 is banded as 94.82, which is below 95
    [dirty(11, 200), 3, ">= 90"], // 94.5
    [dirty(12, 200), 3, ">= 90"], // 94.0
    [dirty(150, 100), 0, "else"], // clamped at 0, never negative
    [dirty(0, 0), 0, "zero"],
    [{ ...dirty(20, 2000), ...{ "census.files.audited": aud(2000) } }, 3, ">= 98"], // 99 percent, but 20 dirty files: the top two bands are closed
    [{ ...dirty(19, 2000), ...{ "census.files.audited": aud(2000) } }, 5, ">= 98"],
    [{ ...dirty(10, 100, 10), "colour.rgb_fn.outside_token_source": { value: 10, detail: { withVarArgument: 10 } } }, 5, ">= 98"], // ten files whose only colours are rgb(var(--x))
    [{ ...dirty(10, 100, 10), "colour.hsl_fn.outside_token_source": { value: 6, detail: { withVarArgument: 6 } } }, 4, ">= 95"], // 4 literal hits: at most 4 dirty files, 96
    [{ ...NO_STYLING }, 0, "gated"],
  ],
  "drift_control.script_exists": [
    [{ "habit.scripts.drift_files": 1, "habit.npm_scripts.drift": 0 }, 1, ">= 1"], [{ "habit.scripts.drift_files": 0, "habit.npm_scripts.drift": 1 }, 1, ">= 1"],
    [{ "habit.scripts.drift_files": 0, "habit.npm_scripts.drift": 0 }, 0, "else"],
  ],
  "drift_control.history_recurring": [
    [{ "habit.snapshots.distinct_days": 2 }, 1, ">= 2"], [{ "habit.snapshots.distinct_days": 1 }, 0.5, ">= 1"], [{ "habit.snapshots.distinct_days": 0 }, 0, "else"],
  ],
  "drift_control.ci_wired": [[{ "habit.workflows.drift_noncomment_lines": 1 }, 1, ">= 1"], [{ "habit.workflows.drift_noncomment_lines": 0 }, 0, "else"]],
  "drift_control.recent_snapshot": [
    [{ "habit.snapshots.count": 0, "habit.snapshots.last_age_days": null }, 0, "gated"],
    [{ "habit.snapshots.count": 1, "habit.snapshots.last_age_days": 30 }, 1, "<= 30"], [{ "habit.snapshots.count": 1, "habit.snapshots.last_age_days": 31 }, 0.5, "<= 90"],
    [{ "habit.snapshots.count": 1, "habit.snapshots.last_age_days": 90 }, 0.5, "<= 90"], [{ "habit.snapshots.count": 1, "habit.snapshots.last_age_days": 91 }, 0, "else"],
    [{ "habit.snapshots.count": 1, "habit.snapshots.last_age_days": 0 }, 1, "<= 30"],
    [{ "habit.snapshots.count": 1, "habit.snapshots.last_age_days": -1 }, 0, "gated"], // an uncommitted snapshot is dated after HEAD
    [{ "habit.snapshots.count": 1, "habit.snapshots.last_age_days": -5 }, 0, "gated"],
    [{ "habit.snapshots.count": 1, "habit.snapshots.last_age_days": null }, 0, "na"],
  ],
  "drift_control.can_fail_build": [[{ "habit.drift_script.exits_nonzero": true }, 1, "true"], [{ "habit.drift_script.exits_nonzero": false }, 0, "else"]],

  "agent_legibility.instruction_file": [
    [{ "legibility.instructions.present": 1, ...leg(10) }, 2, ">= 1"], [{ "legibility.instructions.present": 4, ...leg(10) }, 2, ">= 1"], [{ "legibility.instructions.present": 0, ...leg(10) }, 0, "else"],
    [{ "legibility.instructions.present": 1, ...leg(9) }, 0, "gated"], // under 10 lines
    [{ "legibility.instructions.present": 1, ...leg(30, 1) }, 0, "gated"], // thirty lines and one heading: newlines, not a document
    [{ "legibility.instructions.present": 1, ...leg(0, 0) }, 0, "gated"], // an empty CLAUDE.md
  ],
  "agent_legibility.substance": [
    [leg(30), 1.5, ">= 30"], [{ "legibility.claude_md.lines": 20, "legibility.agents_md.lines": 10, "legibility.claude_md.headings": 2 }, 1.5, ">= 30"], // summed across files
    [leg(29), 1, ">= 15"], [leg(15), 1, ">= 15"], [leg(14), 0.5, ">= 10"], [{ "legibility.cursor_rules.lines": 10, "legibility.cursor_rules.headings": 2 }, 0.5, ">= 10"], [leg(9), 0, "else"],
    [leg(30, 1), 0, "gated"], // one heading
  ],
  "agent_legibility.guardrails_pointer": [
    [{ "legibility.guardrails.files_mentioning": 1, ...leg(10) }, 0.5, ">= 1"], [{ "legibility.guardrails.files_mentioning": 0, ...leg(10) }, 0, "else"],
    [{ "legibility.guardrails.files_mentioning": 1, ...leg(9) }, 0, "gated"], // "We have no guardrails." is one line
  ],
  "agent_legibility.pointers_resolve": [
    [{ "legibility.path_refs.resolved": 19, "legibility.path_refs.distinct": 20 }, 2, ">= 0.95"], [{ "legibility.path_refs.resolved": 18, "legibility.path_refs.distinct": 20 }, 1, ">= 0.8"],
    [{ "legibility.path_refs.resolved": 16, "legibility.path_refs.distinct": 20 }, 1, ">= 0.8"], [{ "legibility.path_refs.resolved": 15, "legibility.path_refs.distinct": 20 }, 0, "else"],
    [{ "legibility.path_refs.resolved": 94, "legibility.path_refs.distinct": 100 }, 1, ">= 0.8"], [{ "legibility.path_refs.resolved": 79, "legibility.path_refs.distinct": 100 }, 0, "else"],
    [{ "legibility.path_refs.resolved": 5, "legibility.path_refs.distinct": 5 }, 2, ">= 0.95"],
    [{ "legibility.path_refs.resolved": 4, "legibility.path_refs.distinct": 4 }, 0, "zero"], // 4 pointers: too few to rate
    [{ "legibility.path_refs.resolved": 0, "legibility.path_refs.distinct": 0 }, 0, "zero"],
  ],
  "agent_legibility.no_machine_paths": [
    [{ ...leg(10), "legibility.machine_paths.matches": 0 }, 1, "== 0"], [{ ...leg(10), "legibility.machine_paths.matches": 1 }, 0.5, "<= 1"], [{ ...leg(10), "legibility.machine_paths.matches": 2 }, 0, "else"],
    [{ ...leg(9), "legibility.machine_paths.matches": 0 }, 0, "gated"], // no real file, no credit for having no bad paths in it
  ],
  "agent_legibility.fresh_status": [
    [{ "legibility.freshness.status_heading_age_days": 60 }, 1, "<= 60"], [{ "legibility.freshness.status_heading_age_days": 61 }, 0.5, "<= 120"],
    [{ "legibility.freshness.status_heading_age_days": 120 }, 0.5, "<= 120"], [{ "legibility.freshness.status_heading_age_days": 121 }, 0, "else"],
    [{ "legibility.freshness.status_heading_age_days": 0 }, 1, "<= 60"],
    [{ "legibility.freshness.status_heading_age_days": -1 }, 0, "gated"], // a planned date is not freshness
    [{ "legibility.freshness.status_heading_age_days": -400 }, 0, "gated"],
    [{ "legibility.freshness.status_heading_age_days": null }, 0, "na"],
  ],
  "agent_legibility.skills_installed": [
    [{ "legibility.skills.named_installed": 4, "legibility.skills.named_with_skill_md_in_repo": 5 }, 2, ">= 0.8"], [{ "legibility.skills.named_installed": 2, "legibility.skills.named_with_skill_md_in_repo": 5 }, 1, ">= 0.4"],
    [{ "legibility.skills.named_installed": 1, "legibility.skills.named_with_skill_md_in_repo": 5 }, 0, "else"], [{ "legibility.skills.named_installed": 79, "legibility.skills.named_with_skill_md_in_repo": 100 }, 1, ">= 0.4"],
    [{ "legibility.skills.named_installed": 39, "legibility.skills.named_with_skill_md_in_repo": 100 }, 0, "else"],
    [{ "legibility.skills.named_installed": 3, "legibility.skills.named_with_skill_md_in_repo": 3 }, 2, ">= 0.8"],
    [{ "legibility.skills.named_installed": 2, "legibility.skills.named_with_skill_md_in_repo": 2 }, 0, "zero"], // 2 named skills: too few to rate
    [{ "legibility.skills.named_installed": 0, "legibility.skills.named_with_skill_md_in_repo": 0 }, 0, "zero"],
  ],
};

describe("every item, every band edge", () => {
  const keys = ra.dimensions.flatMap((d) => d.items.map((i) => `${d.key}.${i.id}`));

  test("the tables cover exactly the rubric's items", () => {
    expect(Object.keys(TABLES).sort()).toEqual([...keys].sort());
  });

  test("each item's rows reach every one of its bands", () => {
    for (const dim of ra.dimensions) {
      for (const item of dim.items) {
        const reached = new Set(TABLES[`${dim.key}.${item.id}`].map((r) => r[2]));
        for (const b of item.bands) expect([`${dim.key}.${item.id}`, reached.has(b.when)]).toEqual([`${dim.key}.${item.id}`, true]);
      }
    }
  });

  for (const key of Object.keys(TABLES)) {
    const [dimKey, itemId] = key.split(".");
    test(key, () => {
      TABLES[key].forEach(([map, points, label], i) => {
        const row = itemRow(dimKey, itemId, map);
        expect({ row: i, points: row.points, label: row.status === "scored" ? row.band : row.status }).toEqual({ row: i, points, label });
      });
    });
  }

  test("a band that awards 0 or a state that could not be rated always says why", () => {
    for (const key of Object.keys(TABLES)) {
      const [dimKey, itemId] = key.split(".");
      for (const [map, , label] of TABLES[key]) {
        const row = itemRow(dimKey, itemId, map);
        if (row.status !== "scored") expect(typeof row.note).toBe("string");
        if (label === "missing") expect(row.missing.length).toBeGreaterThan(0);
      }
    }
  });

  test("a gate that fails says which ones: negative ages say the date is after HEAD", () => {
    expect(itemRow("captured_rationale", "adr_recency", { "decisions.adr.headings": 1, "decisions.adr.newest_age_days": -3 }).note).toMatch(/after the HEAD commit date/);
    expect(itemRow("drift_control", "recent_snapshot", { "habit.snapshots.count": 1, "habit.snapshots.last_age_days": -3 }).note).toMatch(/after the HEAD commit date/);
    expect(itemRow("agent_legibility", "fresh_status", { "legibility.freshness.status_heading_age_days": -3 }).note).toMatch(/after the HEAD commit date/);
  });
});

// ------------------------------------------------------------------------------------------------ the expression language

describe("the expression language", () => {
  const item = (measure, bands, extra = {}) => ({ id: "t", max: 1, direction: "higher", measure, bands: bands || [{ when: ">= 1", pts: 1 }, { when: "else", pts: 0 }], ...extra });
  const ev = (map, it, block = {}) => evalItem(makeCtx(mk(map), {}, block), it);

  test("band operators include or exclude their threshold exactly", () => {
    const mkBands = (when) => item({ counter: "a" }, [{ when, pts: 1 }, { when: "else", pts: 0 }]);
    const at = (when, v) => ev({ a: v }, mkBands(when)).points;
    expect([at(">= 5", 5), at(">= 5", 4.99), at("> 5", 5), at("> 5", 5.01), at("<= 5", 5), at("<= 5", 5.01), at("< 5", 5), at("< 5", 4.99), at("== 5", 5), at("== 5", 5.01)]).toEqual([1, 0, 0, 1, 1, 0, 0, 1, 1, 0]);
  });

  test("comparisons tolerate float noise: 0.1 + 0.2 is 0.3, 0.85 is reached by 17/20", () => {
    expect(ev({ a: 0.1, b: 0.2 }, item({ sum: ["a", "b"] }, [{ when: "== 0.3", pts: 1 }, { when: "else", pts: 0 }])).points).toBe(1);
    expect(ev({ a: 17, b: 20 }, item({ ratio: { num: ["a"], den: ["b"], zero: null } }, [{ when: ">= 0.85", pts: 1 }, { when: "else", pts: 0 }])).points).toBe(1);
  });

  test("an unreadable condition is an error, not a silent zero", () => {
    expect(() => ev({ a: 1 }, item({ counter: "a" }, [{ when: "at least 1", pts: 1 }, { when: "else", pts: 0 }]))).toThrow(/cannot read the condition/);
  });

  test("a|b takes the first alternative that yields a number; a zero is a number, null and absent are not", () => {
    const it = item({ counter: "a|b" }, [{ when: ">= 1", pts: 1 }, { when: "else", pts: 0 }]);
    expect(ev({ b: 1 }, it).points).toBe(1); // a absent
    expect(ev({ a: null, b: 1 }, it).points).toBe(1); // a null
    expect(ev({ a: 0, b: 1 }, it).points).toBe(0); // a is 0: used
  });

  test("id#path reads a number from detail; id! prefers the exemption split and falls back to the value", () => {
    const withDetail = { value: 9, detail: { exempt: { excludingExemptFiles: 4 }, x: { y: 2 } } };
    expect(ev({ a: withDetail }, item({ counter: "a#x.y" }, [{ when: "== 2", pts: 1 }, { when: "else", pts: 0 }])).points).toBe(1);
    expect(ev({ a: withDetail }, item({ counter: "a!" }, [{ when: "== 4", pts: 1 }, { when: "else", pts: 0 }])).points).toBe(1);
    expect(ev({ a: { value: 9, detail: {} } }, item({ counter: "a!" }, [{ when: "== 9", pts: 1 }, { when: "else", pts: 0 }])).points).toBe(1);
    expect(ev({ a: withDetail, a_excluding_exempt: 3 }, item({ counter: "a!" }, [{ when: "== 3", pts: 1 }, { when: "else", pts: 0 }])).points).toBe(1); // the counter of its own wins
  });

  test("a ratio with a numeric zero result uses it; with null the item awards 0 and says why", () => {
    const base = { num: ["a"], den: ["b"] };
    expect(ev({ a: 0, b: 0 }, item({ ratio: { ...base, zero: 1 } })).points).toBe(1);
    const row = ev({ a: 0, b: 0 }, item({ ratio: { ...base, zero: null, zero_note: "nothing to rate" } }));
    expect([row.points, row.status, row.note]).toEqual([0, "zero", "nothing to rate"]);
  });

  test("ratio min_den: a denominator under the minimum is treated like a zero one, with its own sentence", () => {
    const m = { ratio: { num: ["a"], den: ["b"], min_den: 5, zero: null, zero_note: "none", min_den_note: "too few" } };
    expect(ev({ a: 4, b: 4 }, item(m))).toMatchObject({ points: 0, status: "zero", note: "too few" });
    expect(ev({ a: 5, b: 5 }, item(m)).points).toBe(1);
    expect(ev({ a: 0, b: 0 }, item(m)).note).toBe("none");
  });

  test("ratio: one_minus, scale and clamp", () => {
    const r = (extra) => ev({ n: 3, d: 8 }, item({ ratio: { num: ["n"], den: ["d"], zero: null, ...extra } }, [{ when: ">= 0", pts: 1 }, { when: "else", pts: 0 }]));
    expect(r({}).value).toBe(0.375);
    expect(r({ one_minus: true }).value).toBe(0.625);
    expect(r({ one_minus: true, scale: 100 }).value).toBe(62.5);
    expect(ev({ n: 50, d: 8 }, item({ ratio: { num: ["n"], den: ["d"], zero: null, one_minus: true, scale: 100, clamp: [0, 100] } }, [{ when: ">= 0", pts: 1 }, { when: "else", pts: 0 }])).value).toBe(0);
  });

  test("num_if zeroes the numerator but keeps the denominator", () => {
    const m = (gate) => ({ ratio: { num: ["n"], num_if: { sum_of: ["g"], when: ">= 1" }, den: ["d"], zero: null, ...gate } });
    expect(ev({ n: 4, d: 8, g: 1 }, item(m({}))).value).toBe(0.5);
    expect(ev({ n: 4, d: 8, g: 0 }, item(m({}))).value).toBe(0);
  });

  test("num_op max takes the larger numerator term, not the sum", () => {
    expect(ev({ a: 4, b: 5, d: 10 }, item({ ratio: { num: ["a", "b"], num_op: "max", den: ["d"], zero: null } })).value).toBe(0.5);
  });

  test("mean_ratio averages the parts that have a denominator and leaves out the others; a part can be gated", () => {
    const mean = { mean_ratio: { parts: [{ id: "p", num: ["a"], den: ["b"], zero: null }, { id: "q", num: ["c"], den: ["d"], zero: null }], zero: null, zero_note: "none rated" } };
    expect(ev({ a: 1, b: 1, c: 0, d: 4 }, item(mean)).value).toBe(0.5); // (1 + 0) / 2
    expect(ev({ a: 1, b: 1, c: 0, d: 0 }, item(mean)).value).toBe(1); // q left out
    const row = ev({ a: 0, b: 0, c: 0, d: 0 }, item(mean));
    expect([row.points, row.status, row.note]).toEqual([0, "zero", "none rated"]);
    const gated = { mean_ratio: { parts: [{ id: "p", num: ["a"], den: ["b"], zero: null }, { id: "q", requires: [{ sum_of: ["g"], when: ">= 1" }], num: ["c"], den: ["d"], zero: null }], zero: null } };
    expect(ev({ a: 1, b: 1, c: 0, d: 4, g: 0 }, item(gated)).value).toBe(1); // q is gated, so it is left out
    expect(ev({ a: 1, b: 1, c: 0, d: 4, g: 1 }, item(gated)).value).toBe(0.5);
  });

  test("expressions: sum, sub (floored at 0), min, max, if, detail_count, detail_sum", () => {
    const val = (expr, map) => ev(map, item(expr, [{ when: ">= 0", pts: 1 }, { when: "else", pts: 0 }])).value;
    expect(val({ sum: ["a", 2, { max: ["b", "c"] }] }, { a: 1, b: 4, c: 9 })).toBe(12);
    expect(val({ sub: ["a", "b", "c"] }, { a: 10, b: 3, c: 2 })).toBe(5);
    expect(val({ sub: ["a", "b"] }, { a: 1, b: 3 })).toBe(0);
    expect(val({ min: ["a", { sum: ["b", "c"] }] }, { a: 5, b: 1, c: 2 })).toBe(3);
    expect(val({ if: { sum_of: ["g"], when: "<= 1" }, then: "a", else: 7 }, { g: 1, a: 5 })).toBe(5);
    expect(val({ if: { sum_of: ["g"], when: "<= 1" }, then: "a", else: 7 }, { g: 2, a: 5 })).toBe(7);
    expect(val({ detail_count: { counter: "x", path: "names" } }, { x: { value: 1, detail: { names: ["a", "b", "c"] } } })).toBe(3);
    expect(val({ detail_count: { counter: "x", path: "names" } }, { x: { value: 1, detail: { names: { a: 1, b: 2 } } } })).toBe(2);
    expect(val({ detail_sum: { counter: "x", path: "byExt", keys: [".tsx", ".css", ".none"] } }, { x: { value: 1, detail: { byExt: { ".tsx": 4, ".css": 1, ".ts": 99 } } } })).toBe(5);
    expect(ev({ a: 1 }, item({ sum: ["a", "b"] })).status).toBe("missing");
  });

  test("mapped: the named classes whose very name the theme maps, by prefix", () => {
    const mapped = { mapped: { counter: "n", path: "byClass", names: "t", class_prefix: "text-", name_prefixes: ["--text-", "--font-size-"] } };
    const map = (names) => ({ n: { value: 9, detail: { byClass: { "text-sm": 5, "text-lg": 3, "text-xl": 1, "bg-red": 7, "font-sm": 7 } } }, t: { value: names.length, detail: { names } } });
    const val = (names) => ev(map(names), item(mapped, [{ when: ">= 0", pts: 1 }, { when: "else", pts: 0 }])).value;
    expect(val([])).toBe(0);
    expect(val(["--text-sm"])).toBe(5);
    expect(val(["--text-sm", "--font-size-lg"])).toBe(8); // either spelling of the name maps it
    expect(val(["--text-xs"])).toBe(0); // an unrelated mapping credits nothing
    expect(val(["--text-sm", "--text-lg", "--text-xl", "--color-red"])).toBe(9); // only classes with the text- prefix are named sizes
    expect(ev({ n: 1, t: { value: 0, detail: { names: [] } } }, item(mapped)).status).toBe("na"); // no byClass: not computable
  });

  test("@derived values and { gate } references resolve against the block, and an unknown one is an error", () => {
    const block = { derived: { half: { sub: ["a", 4] }, twice: { sum: ["@half", "@half"] } }, gates: { big: { sum_of: ["@twice"], when: ">= 10", note: "too small" } } };
    const it = item({ counter: "@twice" }, [{ when: ">= 10", pts: 1 }, { when: "else", pts: 0 }], { requires: [{ gate: "big" }] });
    expect(ev({ a: 9 }, it, block)).toMatchObject({ points: 1, value: 10 });
    expect(ev({ a: 8 }, it, block)).toMatchObject({ points: 0, status: "gated", note: "too small" });
    expect(() => ev({ a: 1 }, item({ counter: "@nope" }), block)).toThrow(/unknown derived value @nope/);
    expect(() => ev({ a: 1 }, item({ counter: "a" }, null, { requires: [{ gate: "nope" }] }), block)).toThrow(/unknown gate "nope"/);
    expect(() => ev({ a: 1 }, item({ counter: "@loop" }), { derived: { loop: { sum: ["@loop"] } } })).toThrow(/nested too deep/);
  });

  test("gates: a measure gate, a sum_of gate, an absent counter (missing) and a null one (na)", () => {
    const measureGate = { measure: { ratio: { num: ["a"], den: ["b"], zero: 9 } }, when: ">= 2" };
    const it = item({ counter: "x" }, null, { requires: [measureGate] });
    expect(ev({ x: 1, a: 4, b: 2 }, it).points).toBe(1);
    expect(ev({ x: 1, a: 1, b: 2 }, it).status).toBe("gated");
    expect(ev({ x: 1, a: 0, b: 0 }, it).points).toBe(1); // zero: 9 passes
    expect(ev({ x: 1, a: 4 }, it).status).toBe("missing");
    const unrated = item({ counter: "x" }, null, { requires: [{ measure: { ratio: { num: ["a"], den: ["b"], zero: null } }, when: "<= 5" }] });
    expect(ev({ x: 1, a: 0, b: 0 }, unrated).status).toBe("gated"); // a ratio with nothing to divide by is not a value that is "<= 5"
    const nullGate = item({ counter: "x" }, null, { requires: [{ sum_of: ["g"], when: ">= 0" }] });
    expect(ev({ x: 1, g: null }, nullGate).status).toBe("na");
  });

  test("ceilings cap an item's points when their gate holds, and say so", () => {
    const it = item({ counter: "a" }, [{ when: ">= 1", pts: 5 }, { when: "else", pts: 0 }], { max: 5, ceilings: [{ if: { sum_of: ["c"], when: ">= 20" }, max_points: 3, text: "too many" }] });
    expect(ev({ a: 1, c: 19 }, it).points).toBe(5);
    expect(ev({ a: 1, c: 20 }, it)).toMatchObject({ points: 3, ceiling: { from: 5, to: 3, text: "too many" } });
    expect(ev({ a: 0, c: 20 }, it).points).toBe(0);
  });

  test("an absent counter awards 0 and is named; a null counter is 'not computable', not 'missing'", () => {
    const row = ev({ a: 1 }, item({ sum: ["a", "b"] }));
    expect([row.points, row.status, row.missing]).toEqual([0, "missing", ["b"]]);
    const nul = ev({ a: 1, b: null }, item({ sum: ["a", "b"] }));
    expect([nul.points, nul.status, nul.missing]).toEqual([0, "na", []]);
  });

  test("a requires gate that fails awards 0 and quotes what it found; every input carries the tag it is quoted by", () => {
    const it = { ...item({ counter: "a" }), requires: [{ sum_of: ["g", "h"], when: ">= 2" }] };
    const row = ev({ a: 5, g: 1, h: 0 }, it);
    expect([row.points, row.status]).toEqual([0, "gated"]);
    expect(row.note).toMatch(/needs g \+ h >= 2; found g=1, h=0/);
    const ok = ev({ a: 5, g: 1, h: 1 }, it);
    expect(ok.points).toBe(1);
    expect(ok.inputs).toEqual([{ spec: "a", id: "a", tag: "a", value: 5 }]);
    expect(ev({ a: { value: 1, detail: { x: { y: 2 } } } }, item({ counter: "a#x.y" })).inputs[0].tag).toBe("a#x.y");
  });

  test("a duplicate counter id is an error: the last copy must not win", () => {
    const rep = mk({ a: 1 });
    rep.counters.push({ id: "a", unit: "number", value: 0 });
    expect(() => makeCtx(rep)).toThrow(/counter id a appears twice/);
    expect(() => evaluate(rep, rubric)).toThrow(/appears twice/);
  });

  test("collectSpecs and specIds read every term, including the exemption shorthand and derived references", () => {
    const specs = collectSpecs(findItem("token_discipline", "radius_share"));
    expect(specs.has("scale.radius.named_classes!")).toBe(true);
    expect(specIds("scale.radius.named_classes!")).toEqual(["scale.radius.named_classes"]);
    expect(specIds("a#x.y|b")).toEqual(["a", "b"]);
    expect(specIds("@dirty_colour_files")).toEqual([]);
    expect(leafSpecs(ra, findItem("drift_control", "drift_control_score")).has("colour.scanner.files_with_colour_hits")).toBe(true);
    expect(leafSpecs(ra, findItem("drift_control", "drift_control_score")).has("colour.rgb_fn.outside_token_source#withVarArgument")).toBe(true);
  });
});

// ------------------------------------------------------------------------------------------------ rounding

describe("rounding: half-up, once, at the end; bands read exact values", () => {
  test("roundHalfUp", () => {
    expect([0.5, 1.5, 2.5, 62.5, 4.4999999999, 4.49, 0, 10].map(roundHalfUp)).toEqual([1, 2, 3, 63, 5, 4, 0, 10]);
  });

  test("a dimension's items are added first and rounded once: 0.5 + 0.5 + 0.5 = 1.5 -> 2 (rounding each item would give 3)", () => {
    const r = run(uiMap({ "guardrails.structure.rule_bullets": 1, "guardrails.file.bytes": 30, "guardrails.structure.h2_sections": 1, "docs.spine.tokens_css": false, "guardrails.structure.starred_rules": 1 }));
    const d = r.dimensions.codified_rules;
    expect([d.points, d.satisfaction]).toEqual([1.5, 2]); // rule_count 0.5 + starred 0.5 + sections 0.5
  });

  test("points ending in .5 round up", () => {
    const mid = (extra) => run(uiMap({ "guardrails.file.lines": 20, "guardrails.file.bytes": 240, "guardrails.structure.rule_bullets": 8, "guardrails.structure.h2_sections": 1, ...extra })).dimensions.codified_rules;
    expect([mid({}).points, mid({}).satisfaction]).toEqual([4.5, 5]); // 2 + 2 + 0.5
    expect([mid({ "guardrails.structure.rule_bullets": 3, "guardrails.file.bytes": 90 }).points, mid({ "guardrails.structure.rule_bullets": 3, "guardrails.file.bytes": 90 }).satisfaction]).toEqual([3.5, 4]); // 2 + 1 + 0.5
  });

  test("satisfaction is clamped to 1..10: 0 points -> 1, 0.5 points -> 1, 10 points -> 10", () => {
    expect(run(uiMap()).dimensions.codified_rules.satisfaction).toBe(1);
    expect(run(uiMap({ "guardrails.structure.starred_rules": 1 })).dimensions.codified_rules.satisfaction).toBe(1); // 0.5 rounds to 1
    expect(run(idealMap()).dimensions.codified_rules.satisfaction).toBe(10);
  });

  test("an item is banded on its exact value: 94.82 earns the >= 90 band, not the >= 95 band a rounded 95 would", () => {
    const r = run(uiMap({ ...UI(193), ...dirty(10, 193) }));
    expect(itemOf(r, "drift_control", "drift_control_score")).toMatchObject({ points: 3, band: ">= 90" });
    expect(r.driftControl.exact).toBeCloseTo(94.8187, 4);
    expect(r.driftControl.value).toBe(95); // the published score is rounded once, at the end; no band reads it
  });

  test("a published sub-score is rounded once from exact values: density 62.5 prints 63", () => {
    const r = run(uiMap({ ...UI(8), "colour.scanner.files_with_px_only_hits": 3 }));
    expect([r.subScores.density.exact, r.subScores.density.value]).toEqual([62.5, 63]);
  });

  test("health is the mean of the exact sub-scores, not of the printed ones", () => {
    // tokens: colour only (no Tailwind), 51 dirty files of 200 -> 74.5; density: 75 px-only files of 200 -> 62.5; components: 1 canonical of 5 tags -> 20
    const r = run(uiMap({
      ...UI(200), "tokens.theme.present": false, "tokens.source.found": true,
      "colour.scanner.files_with_colour_hits": 51, "colour.scanner.colour_hits": 51, "colour.scanner.files_with_px_only_hits": 75,
      ...primCounters({ button: { ui: 1, raw: 4 } }),
    }));
    expect(r.subScores.tokens.exact).toBe(74.5); // spacing and type are not rated without Tailwind, radius has nothing to rate
    expect([r.subScores.tokens.value, r.subScores.density.value, r.subScores.components.value]).toEqual([75, 63, 20]);
    expect(r.subScores.health.exact).toBeCloseTo((74.5 + 62.5 + 20) / 3, 10);
    expect(r.subScores.health.value).toBe(52); // 157 / 3 = 52.33; rounding the three first would give 158 / 3 = 52.67 -> 53
  });

  test("health is the mean of the sub-scores that could be rated, and null when none could", () => {
    const noComponents = run(uiMap({ ...UI(100), "tokens.source.found": true }));
    expect(noComponents.subScores.components).toMatchObject({ defined: false, value: null });
    expect(noComponents.subScores.health.ratedFrom).toEqual(["tokens", "density"]);
    const none = run(emptyMap());
    expect(none.subScores.health).toMatchObject({ value: null, defined: false });
    expect(none.subScores.tokens).toMatchObject({ value: null, defined: false });
  });
});

// ------------------------------------------------------------------------------------------------ opportunity, ranking, ties

describe("opportunity, overall, ranking, ties and the named dimension", () => {
  // six one-item dimensions in the real order with the real importance; counter s.<key> is the dimension's points
  const synth = () => {
    const steps = [];
    for (let v = 10; v >= 0.5; v -= 0.5) steps.push({ when: `>= ${v}`, pts: v });
    steps.push({ when: "else", pts: 0 });
    return {
      rubric_version: "v1",
      "readiness-audit": {
        owner: "readiness-audit", rubric_version: "v1", order: ra.order, importance: ra.importance, satisfaction: ra.satisfaction, tie: ra.tie, named_underserved: ra.named_underserved,
        dimensions: ra.order.map((key) => ({ key, label: key, items: [{ id: "s", max: 10, direction: "higher", measure: { counter: `s.${key}` }, bands: steps }] })),
      },
    };
  };
  const sat = (m) => evaluate(mk(Object.fromEntries(Object.entries(m).map(([k, v]) => [`s.${k}`, v]))), synth());
  const allAt = (v) => Object.fromEntries(ra.order.map((k) => [k, v]));
  const order = (r) => r.ranking.map((x) => x.key);

  test("opportunity = importance + max(importance - satisfaction, 0): a satisfaction above importance adds nothing", () => {
    const r = sat({ captured_rationale: 10, codified_rules: 9, token_discipline: 8, component_consistency: 1, drift_control: 7, agent_legibility: 6 });
    const opp = Object.fromEntries(Object.entries(r.dimensions).map(([k, d]) => [k, d.opportunity]));
    expect(opp).toEqual({ captured_rationale: 9, codified_rules: 9, token_discipline: 8, component_consistency: 15, drift_control: 7, agent_legibility: 6 });
  });

  test("opportunity at the extremes: satisfaction 1 -> 2 * importance - 1; satisfaction 10 -> importance", () => {
    const low = sat(allAt(1)).dimensions;
    expect(Object.values(low).map((d) => d.opportunity)).toEqual([17, 17, 15, 15, 13, 11]);
    const high = sat(allAt(10)).dimensions;
    expect(Object.values(high).map((d) => d.opportunity)).toEqual([9, 9, 8, 8, 7, 6]);
  });

  test("points are rounded half-up to satisfaction and clamped: 6.5 -> 7, 6 -> 6, 4.5 -> 5, 0.5 -> 1, 0 -> 1", () => {
    const r = sat({ captured_rationale: 6.5, codified_rules: 6, token_discipline: 4.5, component_consistency: 0.5, drift_control: 0, agent_legibility: 10 });
    expect(Object.values(r.dimensions).map((d) => d.satisfaction)).toEqual([7, 6, 5, 1, 1, 10]);
  });

  test("overall = mean(satisfaction) * 10, rounded once: sums 33, 34, 35 -> 55, 57, 58", () => {
    expect(sat({ captured_rationale: 6, codified_rules: 6, token_discipline: 6, component_consistency: 5, drift_control: 5, agent_legibility: 5 }).overall).toMatchObject({ sumSatisfaction: 33, exact: 55, value: 55 });
    const o34 = sat({ captured_rationale: 6, codified_rules: 6, token_discipline: 6, component_consistency: 6, drift_control: 5, agent_legibility: 5 }).overall;
    expect([o34.sumSatisfaction, o34.value]).toEqual([34, 57]); // 56.67
    expect(sat({ captured_rationale: 6, codified_rules: 6, token_discipline: 6, component_consistency: 6, drift_control: 6, agent_legibility: 5 }).overall.value).toBe(58); // 58.33
    expect(sat(allAt(10)).overall.value).toBe(100);
    expect(sat(allAt(0)).overall.value).toBe(10); // the floor: six satisfactions of 1
  });

  test("one satisfaction point moves the overall by 10 / 6 = 1.67", () => {
    expect(sat(allAt(5)).overall.perSatisfactionPoint).toBeCloseTo(1.6667, 4);
  });

  test("only dimensions below their importance are ranked; a dimension at or above it is listed as satisfied and is never tied", () => {
    // importance 9, 9, 8, 8, 7, 6; satisfaction 10, 9, 8, 8, 7, 6 are all at their importance
    const none = sat({ captured_rationale: 10, codified_rules: 9, token_discipline: 8, component_consistency: 8, drift_control: 7, agent_legibility: 6 });
    expect(none.ranking).toEqual([]);
    expect(none.tied).toEqual([]);
    expect(none.mostUnderserved).toBeNull();
    expect(none.noneUnderserved).toBe(true);
    expect(none.satisfied).toEqual(ra.order);
    // the one deficient dimension is the only one ranked, whatever the others score
    const one = sat({ captured_rationale: 10, codified_rules: 10, token_discipline: 10, component_consistency: 10, drift_control: 10, agent_legibility: 4 });
    expect(order(one)).toEqual(["agent_legibility"]);
    expect(one.mostUnderserved).toBe("agent_legibility");
    expect(one.tied).toEqual(["agent_legibility"]);
    expect(one.satisfied).toEqual(["captured_rationale", "codified_rules", "token_discipline", "component_consistency", "drift_control"]);
    expect(sat(allAt(10)).noneUnderserved).toBe(true);
  });

  test("ties break by importance, then the fixed dimension order", () => {
    // equal opportunity 11: component_consistency (imp 8, sat 5) and codified_rules (imp 9, sat 7): importance decides
    const byImp = sat({ captured_rationale: 10, codified_rules: 7, token_discipline: 10, component_consistency: 5, drift_control: 10, agent_legibility: 10 });
    expect(order(byImp)).toEqual(["codified_rules", "component_consistency"]);
    expect(byImp.ranking[1].decidedBy).toBe("importance");
    // everything at 6: all but agent_legibility (6 is not below 6) are ranked, in the rubric's fixed order within equal importance
    const flat = sat(allAt(6));
    expect(order(flat)).toEqual(["captured_rationale", "codified_rules", "token_discipline", "component_consistency", "drift_control"]);
    expect(flat.ranking.slice(1).map((x) => x.decidedBy)).toEqual(["order", "opportunity", "order", "opportunity"]);
    expect(flat.satisfied).toEqual(["agent_legibility"]);
  });

  test("the tied set is every ranked dimension within 1 opportunity point of the top", () => {
    // opportunities: cr 11, cor 10, the rest satisfied -> top 11 ties with 10
    const r = sat({ captured_rationale: 7, codified_rules: 8, token_discipline: 10, component_consistency: 10, drift_control: 10, agent_legibility: 10 });
    expect(r.ranking.map((x) => x.opportunity)).toEqual([11, 10]);
    expect(r.tied).toEqual(["captured_rationale", "codified_rules"]);
  });

  test("a single most-underserved dimension is named only when the gap to the next is >= 2 (or it is the only one)", () => {
    const gap = (cr, cor) => {
      const r = sat({ captured_rationale: cr, codified_rules: cor, token_discipline: 10, component_consistency: 10, drift_control: 10, agent_legibility: 10 });
      return { gap: r.gapToNext, named: r.mostUnderserved, tied: r.tied };
    };
    expect(gap(3, 8)).toEqual({ gap: 5, named: "captured_rationale", tied: ["captured_rationale"] }); // 15 vs 10
    expect(gap(6, 8)).toEqual({ gap: 2, named: "captured_rationale", tied: ["captured_rationale"] }); // 12 vs 10: exactly 2 names it
    expect(gap(7, 8)).toEqual({ gap: 1, named: null, tied: ["captured_rationale", "codified_rules"] }); // 11 vs 10: within 1
    expect(gap(8, 8)).toEqual({ gap: 0, named: null, tied: ["captured_rationale", "codified_rules"] });
    expect(gap(3, 9)).toEqual({ gap: null, named: "captured_rationale", tied: ["captured_rationale"] }); // codified_rules is satisfied: the only ranked one
  });
});

// ------------------------------------------------------------------------------------------------ whole reports

describe("whole reports", () => {
  test("an empty repo has no styling code: scores are withheld, not 10", () => {
    const r = pub(emptyMap());
    expect(r.scored).toBe(false);
    expect(r.withheld.reasons.join(" ")).toMatch(/no styling code in the audited folders/);
    expect(r.overall).toBeNull();
    for (const k of ["dimensions", "subScores", "setupClass", "ranking", "tied", "mostUnderserved", "severity", "driftControl"]) expect([k, r[k]]).toEqual([k, null]);
    expect(r.header.audited).toBe(10);
  });

  test("an empty repo, diagnosed anyway: every item has a defined award, nothing crashes, the floor is 10", () => {
    const r = all(emptyMap());
    expect(r.scored).toBe(false);
    for (const d of Object.values(r.dimensions)) {
      expect([d.key, d.points, d.satisfaction]).toEqual([d.key, 0, 1]);
      for (const it of d.items) expect([`${d.key}.${it.id}`, it.points]).toEqual([`${d.key}.${it.id}`, 0]);
    }
    expect(r.overall).toMatchObject({ value: 10, sumSatisfaction: 6 });
    expect(r.subScores.tokens).toMatchObject({ value: null, defined: false });
    expect(r.subScores.health.value).toBeNull();
    expect(r.driftControl).toMatchObject({ value: null, status: "gated" });
    expect(r.missing).toEqual([]);
  });

  test("an empty repo: gated, zero-denominator and null items say what was missing", () => {
    const r = all(emptyMap());
    const get = (d, i) => itemOf(r, d, i);
    expect(get("captured_rationale", "adr_recency").status).toBe("gated");
    expect(get("captured_rationale", "token_record_coverage").status).toBe("na");
    expect(get("captured_rationale", "token_record_currency")).toMatchObject({ status: "zero", note: "no token record carries a token name and a value: currency not rated" });
    expect(get("codified_rules", "contrast_checked").status).toBe("gated");
    expect(get("token_discipline", "palette_classes").status).toBe("gated");
    expect(get("component_consistency", "identical_definitions").status).toBe("gated");
    expect(get("drift_control", "drift_control_score").status).toBe("gated");
    expect(get("agent_legibility", "no_machine_paths").status).toBe("gated");
    expect(get("agent_legibility", "fresh_status").status).toBe("na");
  });

  test("an ideal repo: every dimension earns 10, overall 100, nothing is underserved", () => {
    const r = pub(idealMap());
    expect(r.scored).toBe(true);
    for (const d of Object.values(r.dimensions)) expect([d.key, d.points, d.satisfaction, d.opportunity, d.capped]).toEqual([d.key, 10, 10, d.importance, []]);
    expect(r.overall.value).toBe(100);
    expect(r.ranking).toEqual([]);
    expect(r.noneUnderserved).toBe(true);
    expect(r.mostUnderserved).toBeNull();
    expect(r.subScores).toMatchObject({ tokens: { value: 100 }, density: { value: 100 }, components: { value: 100 }, health: { value: 100 } });
    expect(r.setupClass.class).toBe("mature");
    expect(r.driftControl.value).toBe(100);
    expect(r.flags).toEqual([]);
  });

  test("a hand-worked middling repo", () => {
    // captured_rationale: adr 5 -> 1, h2 3 -> 1.5, coverage 0.2 -> 0.5, age 150 -> 1, records 6/10 -> 0.5, DESIGN.md 6/10 -> 0.5, contradictions 1 -> 0.5 = 5.5 -> 6
    // codified_rules: lines 15 -> 1, bullets 5 (40 bytes each) -> 1, starred 0.5, type 0, spacing 1, h2 2 -> 0.5, contrast 1.5, tokens.css 1 = 6.5 -> 7
    // token_discipline: source 1, palette 1/100 -> 1, (10 arbitrary + 4 unmapped named) / 50 = 0.28 -> 1, type wiring (2 - 1) / 10 = 0.1 -> 1,
    //   spacing 2/100 = 0.02 -> 1, space wiring 5/10 = 0.5 -> 0.5, radius 5/50 = 0.1 -> 0.5 = 6 -> 6
    // component_consistency: pooled 20 canonical of 31 tags = 64.5 -> 2; identical 1 -> 0.5; most-defined primitive Button x2 -> 0.5; dead 4/20 = 0.2 -> 1 = 4 -> 4
    // drift_control: 5 dirty of 100 -> 95 -> 4; script 1; days 1 -> 0.5; ci 0; age 60 -> 0.5; exit 0 = 6 -> 6
    // agent_legibility: present 2, lines 20 -> 1, mention 0.5, pointers 17/20 = 0.85 -> 1, machine paths 1 -> 0.5, age 90 -> 0.5, skills 3/5 = 0.6 -> 1 = 6.5 -> 7
    const r = pub(midMap());
    expect(Object.fromEntries(Object.entries(r.dimensions).map(([k, d]) => [k, [d.points, d.satisfaction]]))).toEqual({
      captured_rationale: [5.5, 6], codified_rules: [6.5, 7], token_discipline: [6, 6], component_consistency: [4, 4], drift_control: [6, 6], agent_legibility: [6.5, 7],
    });
    expect(r.overall).toMatchObject({ sumSatisfaction: 36, value: 60 });
    // agent_legibility (7 against importance 6) is satisfied and not ranked; 12 beats 12 on importance (9 before 8)
    expect(r.ranking.map((x) => [x.key, x.opportunity])).toEqual([
      ["captured_rationale", 12], ["component_consistency", 12], ["codified_rules", 11], ["token_discipline", 10], ["drift_control", 8],
    ]);
    expect(r.satisfied).toEqual(["agent_legibility"]);
    expect(r.tied).toEqual(["captured_rationale", "component_consistency", "codified_rules"]);
    expect(r.mostUnderserved).toBeNull();
  });

  test("a missing counter withholds every score and names the counter", () => {
    const map = idealMap();
    delete map["legibility.guardrails.files_mentioning"];
    const r = evaluate(mk(map), rubric);
    expect(r.scored).toBe(false);
    expect(r.overall).toBeNull();
    expect(r.compat.ok).toBe(false);
    expect(r.compat.notes.join(" ")).toMatch(/1 counters the rubric reads are absent.*legibility\.guardrails\.files_mentioning/);
    expect(r.missing).toEqual([{ where: "agent_legibility.guardrails_pointer", counter: "legibility.guardrails.files_mentioning" }]);
    // the item level still says what it would have been, for a person debugging
    const d = evaluateAll(mk(map), rubric);
    const item = itemOf(d, "agent_legibility", "guardrails_pointer");
    expect([item.points, item.status, item.missing]).toEqual([0, "missing", ["legibility.guardrails.files_mentioning"]]);
  });

  test("a missing counter in a sub-score leaves it undefined, never invented, and withholds the report", () => {
    const map = idealMap();
    delete map["colour.scanner.files_audited"];
    const r = evaluateAll(mk(map), rubric);
    expect(r.scored).toBe(false);
    expect(r.subScores.tokens.axes.colour.status).toBe("missing");
    expect(r.missing.map((m) => m.counter)).toEqual(expect.arrayContaining(["colour.scanner.files_audited"]));
  });

  test("the same report gives the same result twice, and neither the report nor the rubric is touched", () => {
    const report = deepFreeze(mk(midMap()));
    const frozen = deepFreeze(JSON.parse(JSON.stringify(rubric)));
    const a = evaluate(report, frozen);
    const b = evaluate(report, frozen);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test("the header quotes the report's own identity words and what it covers", () => {
    const r = pub(idealMap());
    expect(r.header).toMatchObject({
      countersVersion: "1.0.0", schema: "systemix.audit-counters/1", commit: "0123456789ab", commitDate: "2026-10-13T22:26:41+00:00",
      tokenSource: { path: "src/app/globals.css", via: "doc:design/DESIGN.md" }, dirs: ["src"], audited: 10,
      missingDirs: [], rejectedDirs: [], skippedDirs: [], slice: null, groupsSkipped: [], warningsTotal: 0,
      coverage: { ok: true, censusFiles: 100, sourceLikeFiles: 100, share: 1, floor: 0.8, notSeen: 0 },
      exemption: { files: 0, audited: 100, share: 0, cap: 0.1, applied: true },
    });
    expect(r.rubricVersion).toBe("v1");
    expect(r.validity).toMatch(/calibrated to nothing yet/);
    expect(Object.keys(r.limits).sort()).toEqual(["design-audit", "drift-report", "readiness-audit"]);
  });

  test("a report from another counters major, or another schema, is flagged and not scored", () => {
    const major2 = evaluate({ ...mk(idealMap()), countersVersion: "2.0.0" }, rubric);
    expect(major2.compat.ok).toBe(false);
    expect(major2.compat.notes.join(" ")).toMatch(/major 2/);
    expect(major2.scored).toBe(false);
    expect(major2.overall).toBeNull();
    const other = evaluate({ ...mk(idealMap()), schema: "something/9" }, rubric);
    expect(other.compat.ok).toBe(false);
    expect(other.scored).toBe(false);
    expect(evaluate(mk(idealMap()), rubric).compat).toEqual({ ok: true, notes: [] });
  });

  test("something that is not a counters report is an error", () => {
    expect(() => evaluate({}, rubric)).toThrow(/not a counters report/);
  });
});

// ------------------------------------------------------------------------------------------------ no counters, no score

describe("a score is published only for a whole report of a repo that has something to score", () => {
  const withdrawn = (r) => {
    expect(r.scored).toBe(false);
    expect(r.overall).toBeNull();
    expect(r.dimensions).toBeNull();
    expect(r.compat.ok === false || r.withheld.reasons.length > 0).toBe(true);
    return r.withheld.reasons.join(" | ");
  };

  test("a slice of counters (--ids, --brief, or fewer counters than the report has) prints no overall", () => {
    const base = idealMap();
    expect(withdrawn(pub(base, rubric, { slice: { ids: ["colour.scanner"], brief: false, definitions: true, perFile: true, counters: 6, of: 351 } }))).toMatch(/slice \(6 of 351 counters, ids colour\.scanner\)/);
    expect(withdrawn(pub(base, rubric, { slice: { ids: [], brief: true, definitions: false, perFile: false, counters: 354, of: 354 } }))).toMatch(/slice \(brief, 354 of 354 counters\)/);
    expect(withdrawn(pub(base, rubric, { slice: { ids: [], brief: false, definitions: true, perFile: true, counters: 300, of: 354 } }))).toMatch(/300 of 354/);
    expect(withdrawn(pub(base, rubric, { slice: "weird" }))).toMatch(/cannot be read/);
    // a slice that drops only per-file rows or definitions keeps every value, so it is scored; its severity says it is incomplete
    const kept = pub(base, rubric, { slice: { ids: [], brief: false, definitions: false, perFile: false, counters: 354, of: 354 } });
    expect(kept.scored).toBe(true);
    expect(kept.header.slice).toMatchObject({ perFile: false });
  });

  test("a report that skipped counter groups prints no overall", () => {
    expect(withdrawn(pub(idealMap(), rubric, { groups: { run: ["census", "tokens"], skipped: ["colour", "habit"] } }))).toMatch(/counter groups were skipped: colour, habit/);
  });

  test("a folder that was asked for and not found, or refused, prints no overall and is echoed in the header", () => {
    const missing = pub(idealMap(), rubric, { scope: { ...mk().scope, dirs: [], missingDirs: ["lib"] } });
    expect(withdrawn(missing)).toMatch(/audited folders not found: lib/);
    expect(missing.header.missingDirs).toEqual(["lib"]);
    const refused = pub(idealMap(), rubric, { scope: { ...mk().scope, rejectedDirs: ["../x"] } });
    expect(withdrawn(refused)).toMatch(/refused: \.\.\/x/);
  });

  test("a repo with no styling code (a backend, a docs folder) prints no overall and says so", () => {
    const backend = { ...emptyMap(), "census.files.audited": aud(12, { ".ts": 12 }), "census.files.total": 12, "census.files.any_type": { value: 12, detail: { byExt: { ".ts": 12 } } }, "guardrails.file.lines": 30 };
    const r = pub(backend);
    expect(withdrawn(r)).toMatch(/no styling code in the audited folders/);
    expect(r.withheld.evidence.ok).toBe(false);
    // one markup file is styling code; so is one styling counter
    expect(pub({ ...backend, "census.files.audited": aud(12, { ".ts": 11, ".tsx": 1 }) }).scored).toBe(true);
    expect(pub({ ...backend, "typography.named_size.matches": 1 }).scored).toBe(true);
  });

  test("source hidden in vendor, generated or dot folders (the audit saw 1 of 41 source files) prints no overall", () => {
    const hidden = { ...idealMap(), "census.files.audited": aud(1, { ".ts": 1 }), "census.files.total": 1, "census.files.any_type": { value: 41, detail: { byExt: { ".ts": 1, ".tsx": 40 } } } };
    const r = pub(hidden);
    expect(withdrawn(r)).toMatch(/saw 1 of 41 source-looking files.*2\.4 percent, floor 80 percent.*40 sit in skipped/);
    expect(r.header.coverage).toMatchObject({ ok: false, censusFiles: 1, sourceLikeFiles: 41, notSeen: 40 });
    // json and svg files are not source; 80 of 100 source files is the floor, and it is inclusive
    const cover = (seen) => ({ ...idealMap(), "census.files.total": seen, "census.files.any_type": { value: 150, detail: { byExt: { ".tsx": 80, ".ts": 20, ".json": 30, ".svg": 20 } } } });
    expect(pub(cover(80)).header.coverage).toMatchObject({ ok: true, share: 0.8, sourceLikeFiles: 100, notSeen: 20 });
    expect(pub(cover(80)).scored).toBe(true);
    expect(pub(cover(79)).scored).toBe(false);
    // styling files the counters cannot read (scss) count as source that was not seen
    expect(pub({ ...idealMap(), "census.files.any_type": { value: 100, detail: { byExt: { ".tsx": 100, ".scss": 100 } } } }).scored).toBe(false);
  });

  test("a census total that is not a number means the coverage cannot be known: no overall", () => {
    const map = idealMap();
    map["census.files.total"] = null;
    expect(withdrawn(pub(map))).toMatch(/audit coverage cannot be computed/);
  });

  test("folders skipped by name are echoed and flagged", () => {
    const r = pub(idealMap(), rubric, { scope: { ...mk().scope, skippedDirs: ["src/vendor"] } });
    expect(r.scored).toBe(true);
    expect(r.flags).toEqual(expect.arrayContaining([expect.objectContaining({ id: "skipped_dirs", text: expect.stringContaining("src/vendor") })]));
    expect(r.header.skippedDirs).toEqual(["src/vendor"]);
  });

  test("warnings of the counters report are echoed (the first 20) with their total", () => {
    const warnings = Array.from({ length: 25 }, (_, i) => `warning ${i}`);
    const r = pub(idealMap(), rubric, { warnings });
    expect(r.header.warnings).toHaveLength(20);
    expect(r.header.warningsTotal).toBe(25);
  });

  test("a report whose per-file rows do not add up to a counter's value was edited: it prints no overall", () => {
    const map = idealMap();
    map["colour.hex_scanner.not_token"] = { value: 5, unit: "match", perFile: [{ file: "src/a.tsx", count: 2 }, { file: "src/b.tsx", count: 2 }] };
    const r = pub(map);
    expect(withdrawn(r)).toMatch(/not the counters' own output.*colour\.hex_scanner\.not_token \(rows add to 4, value 5\)/);
    const files = idealMap();
    files["colour.palette_class.files"] = { value: 3, unit: "file", perFile: [{ file: "src/a.tsx", count: 7 }] };
    expect(withdrawn(pub(files))).toMatch(/colour\.palette_class\.files/);
    // rows cut at 200 are accounted for by perFileOmitted and are not checked
    const cut = idealMap();
    cut["colour.hex_scanner.not_token"] = { value: 10, unit: "match", perFile: [{ file: "src/a.tsx", count: 3 }], perFileOmitted: { files: 2, count: 7 } };
    expect(pub(cut).scored).toBe(true);
  });

  test("the integrity check is per unit, as the skills word it: match and line counters add their counts, a file counter counts its rows, other units are not checked", () => {
    const extra = (id, counter) => ({ ...idealMap(), [id]: counter });
    const rows = (...counts) => counts.map((count, i) => ({ file: `src/f${i}.tsx`, count }));
    // match and line: the counts add up to the value
    expect(pub(extra("colour.hex_scanner.not_token", { value: 4, unit: "match", perFile: rows(3, 1) })).scored).toBe(true);
    expect(pub(extra("colour.hex_scanner.not_token", { value: 5, unit: "match", perFile: rows(3, 1) })).scored).toBe(false);
    expect(pub(extra("typography.arbitrary_size.lines", { value: 5, unit: "line", perFile: rows(3, 1) })).scored).toBe(false);
    // file: one row per file, and a row's count is a hit count (7 and 9 hits in 2 files is a value of 2, not of 16)
    expect(pub(extra("colour.palette_class.files", { value: 2, unit: "file", perFile: rows(7, 9) })).scored).toBe(true);
    expect(pub(extra("colour.palette_class.files", { value: 3, unit: "file", perFile: rows(7, 9) })).scored).toBe(false);
    // distinct and number counters are not checked: identical_groups is 1 group held by 2 files
    expect(pub(extra("primitives.definitions.identical_groups", { value: 1, unit: "distinct", perFile: rows(1, 1) })).scored).toBe(true);
    expect(pub(extra("legibility.claude_md.headings", { value: 11, unit: "number", perFile: rows(1) })).scored).toBe(true);
    // a counter that cut its rows (perFileTotal or perFileOmitted) is not checked either
    expect(pub(extra("colour.hex_scanner.not_token", { value: 10, unit: "match", perFile: rows(3), perFileTotal: 3 })).scored).toBe(true);
  });

  test("source-looking files are the ten listed extensions only; with none of them the coverage is not withheld (S = 0)", () => {
    const svgOnly = { ...idealMap(), "census.files.any_type": { value: 3, detail: { byExt: { ".svg": 2, ".ico": 1 } } } };
    const r = pub(svgOnly);
    expect(r.header.coverage).toMatchObject({ ok: true, share: null, sourceLikeFiles: 0, notSeen: 0 });
    expect(r.scored).toBe(true);
  });

  test("a counter whose value cannot be a counter value (NaN, an object, a missing id) prints no overall", () => {
    const nan = mk(idealMap());
    nan.counters.find((c) => c.id === "colour.scanner.files_audited").value = NaN;
    expect(withdrawn(evaluate(nan, rubric))).toMatch(/not a finite number, a boolean, a string or null \(first: colour\.scanner\.files_audited\)/);
    const obj = mk(idealMap());
    obj.counters.find((c) => c.id === "habit.snapshots.count").value = { x: 1 };
    expect(evaluate(obj, rubric).scored).toBe(false);
    const nameless = mk(idealMap());
    nameless.counters.push({ unit: "number", value: 1 }, null);
    expect(evaluate(nameless, rubric).scored).toBe(false);
  });

  test("every score of a withheld report is null; the counters it was missing are named", () => {
    const r = pub(emptyMap(), rubric, { slice: { ids: ["x"], brief: false, counters: 1, of: 354 } });
    for (const k of ["overall", "dimensions", "subScores", "setupClass", "severity", "lines", "driftControl", "driftClasses", "scannerTally", "ranking", "satisfied", "tied", "mostUnderserved", "gapToNext", "noneUnderserved", "nearThreshold"]) expect([k, r[k]]).toEqual([k, null]);
  });
});

// ------------------------------------------------------------------------------------------------ stubs, padding and other ways to move a score without improving the repo

describe("stub files, empty files and padding do not earn the documentation items", () => {
  const dim = (map, key) => run(uiMap(map)).dimensions[key];

  test("a guardrails file holding only \"x\" earns nothing", () => {
    expect(dim({ "guardrails.file.lines": 1, "guardrails.file.bytes": 2 }, "codified_rules").points).toBe(0);
  });

  test("twelve lines of one-word bullets, three headings, a star and the right words earn the shape items but not the rule count", () => {
    const stub = { "guardrails.file.lines": 12, "guardrails.file.bytes": 80, "guardrails.structure.rule_bullets": 11, "guardrails.structure.h2_sections": 3, "guardrails.structure.starred_rules": 1, "guardrails.rules.type_size": true, "guardrails.rules.spacing_scale": true };
    const d = dim(stub, "codified_rules");
    expect(itemOf({ dimensions: { codified_rules: d } }, "codified_rules", "rule_count")).toMatchObject({ points: 0, status: "gated" });
    expect(d.points).toBe(1 + 0.5 + 1 + 1 + 1); // file 1, starred, type, spacing, sections: 4.5, not the 8 of the rubric before gates
  });

  test("an empty CLAUDE.md, thirty newlines, and a one-line file earn no instruction credit", () => {
    expect(dim({ "legibility.instructions.present": 1, ...leg(0, 0) }, "agent_legibility").points).toBe(0);
    expect(dim({ "legibility.instructions.present": 1, ...leg(30, 0) }, "agent_legibility").points).toBe(0);
    const one = dim({ "legibility.instructions.present": 1, ...leg(1, 0), "legibility.guardrails.files_mentioning": 1 }, "agent_legibility");
    expect(one.points).toBe(0); // "We have no guardrails." mentions the word and earns nothing
  });

  test("ten ADR headings with no body, five empty DESIGN.md sections, and forged future dates earn nothing", () => {
    const d = dim({ ...adr(10, 10), ...dmd(5, 5), "decisions.adr.newest_age_days": -4000 }, "captured_rationale");
    expect(d.points).toBe(1); // no_contradictions: 0 contradictions with a record to check
    expect(itemOf({ dimensions: { captured_rationale: d } }, "captured_rationale", "adr_recency").status).toBe("gated");
  });

  test("a guardrails pointer is worth 0.5 even in a real file, because a mention is not an instruction", () => {
    const d = dim({ "legibility.instructions.present": 1, ...leg(30), "legibility.guardrails.files_mentioning": 1 }, "agent_legibility");
    expect(itemOf({ dimensions: { agent_legibility: d } }, "agent_legibility", "guardrails_pointer").points).toBe(0.5);
  });

  test("deleting skill names so that the ratio shrinks under 3 does not raise the score; deleting path pointers under 5 does not either", () => {
    const before = itemRow("agent_legibility", "skills_installed", { "legibility.skills.named_installed": 1, "legibility.skills.named_with_skill_md_in_repo": 11 });
    const after = itemRow("agent_legibility", "skills_installed", { "legibility.skills.named_installed": 1, "legibility.skills.named_with_skill_md_in_repo": 1 });
    expect([before.points, after.points]).toEqual([0, 0]);
    const ptr = (resolved, distinct) => itemRow("agent_legibility", "pointers_resolve", { "legibility.path_refs.resolved": resolved, "legibility.path_refs.distinct": distinct }).points;
    expect([ptr(15, 18), ptr(2, 4)]).toEqual([1, 0]); // fixing a broken pointer is rewarded; shrinking the list below 5 is not
  });

  describe("the docs_need_code cap", () => {
    const stubDocs = {
      ...adr(10, 40), ...dmd(5, 20), "decisions.adr.newest_age_days": 10, "docs.token_records.matches": 3, "docs.token_records.keyed": 3,
      "guardrails.file.lines": 20, "guardrails.file.bytes": 600, "guardrails.structure.rule_bullets": 8, "guardrails.structure.starred_rules": 1, "guardrails.rules.type_size": true,
      "guardrails.rules.spacing_scale": true, "guardrails.structure.h2_sections": 3, "guardrails.contrast.pairs": 1, "docs.spine.tokens_css": true,
    };
    test("documents are credited above 6 of 10 only when the code follows them", () => {
      const dirty100 = run(uiMap({ ...stubDocs, ...dirty(10, 10) }));
      for (const key of ["captured_rationale", "codified_rules"]) {
        expect(dirty100.dimensions[key].satisfaction).toBe(6);
        expect(dirty100.dimensions[key].capped).toEqual([expect.objectContaining({ id: "docs_need_code", to: 6 })]);
        expect(dirty100.dimensions[key].points).toBe(6);
      }
      expect(dirty100.flags.map((f) => f.id)).toEqual(expect.arrayContaining(["capped_captured_rationale", "capped_codified_rules"]));
      const clean = run(uiMap({ ...stubDocs, ...dirty(0, 10) }));
      expect(clean.dimensions.codified_rules.points).toBeGreaterThan(6);
      expect(clean.dimensions.codified_rules.capped).toEqual([]);
    });
    test("the cap edge is 60 percent of audited files free of raw colour literals, inclusive", () => {
      const at = (d) => run(uiMap({ ...stubDocs, ...dirty(d, 100) })).dimensions.codified_rules;
      expect(at(40).capped).toEqual([]); // 60 percent
      expect(at(41).capped).toHaveLength(1); // 59 percent
      expect(at(41).points).toBe(6);
    });
    test("the cap touches only the two documentation dimensions and never raises a score", () => {
      const r = run(uiMap({ ...dirty(10, 10) }));
      expect(r.dimensions.token_discipline.capped).toEqual([]);
      expect(r.dimensions.codified_rules.capped).toEqual([]); // 0 points are not lifted to 6
    });
  });
});

describe("padding the population does not make a dirty repo mature", () => {
  test("forty dirty files among two thousand are 98 percent clean but cap drift control at 3 points and are not mature", () => {
    const map = uiMap({ ...UI(2000), ...dirty(40, 2000), "tokens.source.found": true, "habit.scripts.drift_files": 1 });
    const r = run(map);
    expect(r.driftControl.exact).toBeCloseTo(98, 5);
    expect(itemOf(r, "drift_control", "drift_control_score")).toMatchObject({ points: 3, ceiling: { from: 5, to: 3 } });
    expect(r.setupClass.class).toBe("partial"); // colour 98, spacing 100, but 40 dirty files
    expect(r.flags.map((f) => f.id)).toContain("many_dirty_files");
    const small = run(uiMap({ ...UI(2000), ...dirty(19, 2000), "tokens.source.found": true }));
    expect(small.setupClass.class).toBe("mature");
    expect(small.flags.map((f) => f.id)).not.toContain("many_dirty_files");
    expect(run(uiMap({ ...UI(2000), ...dirty(20, 2000) })).flags.map((f) => f.id)).toContain("many_dirty_files"); // 20 files is the edge, inclusive
  });

  test("padding with files that hold nothing is not credited in the tables (no more files is better rule in the monotonicity claim)", () => {
    // 40 dirty of 40 -> 0; 40 dirty of 240 -> 83.3: the share does rise with padding, so the file count is printed beside it
    const a = run(uiMap({ ...UI(40), ...dirty(40, 40) }));
    const b = run(uiMap({ ...UI(240), ...dirty(40, 240) }));
    expect(a.driftControl).toMatchObject({ dirtyFiles: 40, auditedFiles: 40 });
    expect(b.driftControl).toMatchObject({ dirtyFiles: 40, auditedFiles: 240 });
    expect(b.driftControl.exact).toBeGreaterThan(a.driftControl.exact);
  });
});

describe("colour calls with a var() argument are token references", () => {
  const tokenised = (extra = {}) => uiMap({ ...UI(10), "tokens.source.found": true, ...dirty(10, 10, 20), "colour.hsl_fn.outside_token_source": { value: 10, detail: { withVarArgument: 10 } }, "colour.rgb_fn.outside_token_source": { value: 10, detail: { withVarArgument: 10 } }, ...extra });
  test("a repo whose only colours are hsl(var(--x)) and rgb(var(--x) / 0.5) has no dirty files, drift control 100, and is not fresh", () => {
    const r = run(tokenised());
    expect(r.driftControl).toMatchObject({ value: 100, dirtyFiles: 0, auditedFiles: 10 });
    expect(r.subScores.tokens.axes.colour.value).toBe(100);
    expect(r.setupClass.class).toBe("mature");
    expect(r.lines.var_colour_hit_share.value).toBe(100);
    expect(r.lines.colour_hits_var_based.value).toBe(20);
    expect(r.lines.colour_hits_literal.value).toBe(0);
    expect(r.flags.map((f) => f.id)).toContain("var_colour_calls");
  });
  test("with literal hits too, the dirty-file count is the upper bound min(files with hits, literal hits)", () => {
    // 10 files with hits, 25 hits, 20 of them var-based: 5 literal hits, so at most 5 dirty files
    const r = run(tokenised({ "colour.scanner.colour_hits": 25 }));
    expect(r.driftControl).toMatchObject({ dirtyFiles: 5 });
    expect(r.driftControl.exact).toBe(50);
    expect(r.lines.dirty_colour_files_bound.value).toBe(5);
  });
});

describe("a file with both a raw colour and a palette class is counted once in the colour axis", () => {
  const axis = (hits, palette, audited = 10) => run(uiMap({ ...UI(audited), "tokens.source.found": true, ...dirty(hits, audited), "colour.palette_class.files": palette })).subScores.tokens.axes.colour.value;
  test("the larger of the two file counts, not their sum", () => {
    expect(axis(3, 3)).toBe(70); // the same three files: 7 of 10 clean, not 4 of 10
    expect(axis(5, 5)).toBe(50);
    expect(axis(3, 5)).toBe(50);
    expect(axis(0, 0)).toBe(100);
  });
  test("the other bound is printed: if no file held both, the axis would read lower", () => {
    const r = run(uiMap({ ...UI(10), "tokens.source.found": true, ...dirty(3, 10), "colour.palette_class.files": 3 }));
    expect(r.lines.colour_axis_if_no_file_holds_both.value).toBe(40);
    expect(r.subScores.tokens.axes.colour.value).toBe(70);
  });
  test("the setup class follows the union bound: 3 + 3 files of 10 is partial", () => {
    const cls = (palette) => run(uiMap({ ...UI(10), "tokens.source.found": true, ...dirty(3, 10), "colour.palette_class.files": palette })).setupClass.class;
    expect(cls(3)).toBe("partial"); // colour 70
    expect(run(uiMap({ ...UI(100), "tokens.source.found": true, ...dirty(5, 100), "colour.palette_class.files": 5 })).setupClass.class).toBe("mature"); // colour 95, spacing 100
  });
});

describe("declared exemptions are capped and shown", () => {
  test("an exemption covering 40 of 41 audited files is ignored, and so no violation disappears from the score", () => {
    const base = { ...UI(41), ...fs_(80, 0, 0), "tokens.source.found": true };
    const exempt = (files, excluding) => uiMap({
      ...base, "typography.arbitrary_size.matches": { value: 80, detail: { exempt: { excludingExemptFiles: excluding } } }, "typography.exempt.files": { value: files, detail: { files: Array.from({ length: files }, (_, i) => `src/f${i}.tsx`) } },
    });
    const none = run(exempt(0, 80));
    const huge = run(exempt(40, 0));
    expect(itemOf(huge, "token_discipline", "font_size_off_token").points).toBe(itemOf(none, "token_discipline", "font_size_off_token").points);
    expect(itemOf(huge, "token_discipline", "font_size_off_token").points).toBe(0);
    expect(huge.header.exemption).toMatchObject({ files: 40, audited: 41, applied: false, cap: 0.1 });
    expect(huge.flags.map((f) => f.id)).toContain("exemption_ignored");
    // one file of 41 is within the cap and is applied, and the item says so
    const one = run(exempt(1, 0));
    expect(itemOf(one, "token_discipline", "font_size_off_token")).toMatchObject({ points: 3, exemption: { applied: true, files: 1, audited: 41 } });
    expect(one.flags.map((f) => f.id)).toContain("exemption_applied");
  });
  test("a test file renamed *.test.* leaves every share: as many test files as audited files is flagged", () => {
    const flag = (tests) => run(uiMap({ ...UI(10), "census.files.tests": tests })).flags.map((f) => f.id);
    expect(flag(9)).not.toContain("tests_outnumber_audited");
    expect(flag(10)).toContain("tests_outnumber_audited");
  });

  test("the cap is inclusive: 4 of 40 files is 10 percent and applies; 5 of 40 does not", () => {
    const at = (files) => run(uiMap({ ...UI(40), "typography.exempt.files": { value: files, detail: { files: [] } } })).header.exemption.applied;
    expect([at(4), at(5)]).toEqual([true, false]);
  });
  test("a token source that holds ordinary rules (more than 2 raw colours or px per declaration) is flagged, not scored", () => {
    const r = run(uiMap({ ...UI(10), "tokens.declarations.total": 5, "colour.token_source.colour_hits": 205, "colour.token_source.px_hits": 300 }));
    expect(r.flags.map((f) => f.id)).toEqual(expect.arrayContaining(["token_source_holds_rules", "token_source_holds_px"]));
    expect(r.lines.token_source_colour_hits_per_declaration.value).toBe(41);
    const fine = run(uiMap({ ...UI(10), "tokens.declarations.total": 279, "colour.token_source.colour_hits": 139, "colour.token_source.px_hits": 92 }));
    expect(fine.flags.map((f) => f.id)).not.toContain("token_source_holds_rules");
    // the edge is 2 per declaration, exclusive
    const per = (hits) => run(uiMap({ ...UI(10), "tokens.declarations.total": 100, "colour.token_source.colour_hits": hits, "colour.token_source.px_hits": hits })).flags.map((f) => f.id);
    expect(per(200)).not.toEqual(expect.arrayContaining(["token_source_holds_rules"]));
    expect(per(201)).toEqual(expect.arrayContaining(["token_source_holds_rules", "token_source_holds_px"]));
    expect(per(200)).not.toEqual(expect.arrayContaining(["token_source_holds_px"]));
  });
});

describe("a repo is not penalised for how it names its design system, nor rewarded for what it lacks", () => {
  test("a design system that is not under components/ui is canonical when it is the only definition, or a package", () => {
    const reuse = (o) => run(uiMap({ ...primCounters(o) })).subScores.components.value;
    expect(reuse({ button: { ui: 30, defs: 1, raw: 1 } })).toBe(97); // 30 of 31
    expect(reuse({ button: { other: 30, defs: 1, raw: 1 } })).toBe(97); // src/design/button.tsx, the only Button
    expect(reuse({ button: { pkg: 30, raw: 1 } })).toBe(97); // imported from a package
    expect(reuse({ button: { other: 30, defs: 2, raw: 1 } })).toBe(0); // two Buttons: neither is the canonical one
  });

  test("one canonical Card tag among fifty raw buttons moves components by 2 points, not by 50", () => {
    const k0 = run(uiMap({ ...primCounters({ button: { ui: 0, raw: 50, defs: 1 } }) }));
    const k1 = run(uiMap({ ...primCounters({ button: { ui: 0, raw: 50, defs: 1 }, card: { ui: 1, defs: 1 } }) }));
    expect(k0.subScores.components.value).toBe(0);
    expect(k1.subScores.components.value).toBe(2); // 1 of 51
    expect(itemOf(k0, "component_consistency", "canonical_reuse").points).toBe(itemOf(k1, "component_consistency", "canonical_reuse").points);
  });

  test("fewer than 5 tags are not rated, and the near-threshold list says one more tag would rate them", () => {
    const r = run(uiMap({ ...primCounters({ button: { ui: 4, defs: 1 } }) }));
    expect(r.subScores.components).toMatchObject({ defined: false, value: null });
    const near = r.nearThreshold.find((n) => n.scope === "component_consistency" && n.item === "canonical_reuse");
    expect(near).toMatchObject({ unrated: true, status: "zero" });
    expect(near.edges.some((e) => e.to === 5)).toBe(true);
  });

  test("a repo with no Tailwind vocabulary is not rated on palette, spacing or font-size items, and the spacing and type axes are left out", () => {
    const css = uiMap({ ...UI(40), "tokens.theme.present": false, "tokens.source.found": true, ...dirty(39, 40, 1200), "colour.scanner.files_with_px_only_hits": 1 });
    const r = run(css);
    for (const id of ["palette_classes", "font_size_off_token", "spacing_literals"]) expect([id, itemOf(r, "token_discipline", id).status]).toEqual([id, "gated"]);
    expect(r.subScores.tokens.axes.spacing.status).toBe("gated");
    expect(r.subScores.tokens.axes.type.status).toBe("gated");
    expect(r.subScores.tokens.exact).toBeLessThan(5); // the colour axis alone: 1 clean file of 40 is 2.5, radius has nothing to rate
    expect(r.flags.map((f) => f.id)).toContain("no_tailwind_vocabulary");
  });

  test("full token adoption earns the full points: only mapped names, no arbitrary sizes, no radius utilities", () => {
    const p1 = run(uiMap({
      ...UI(30), "tokens.source.found": true, ...fs_(0, 30, 30), "tokens.theme.maps_font_size": { value: 1, detail: { names: ["--text-sm"] } },
      "tokens.text.unconsumed": { value: 0, detail: { declared: 1 } }, "tokens.space.unconsumed": { value: 0, detail: { declared: 1 } }, "tokens.theme.maps_space": { value: 1, detail: { names: ["--spacing"] } },
    }));
    expect(p1.dimensions.token_discipline.points).toBe(10);
    // a default class the theme does not map is off-token in both families
    const p2 = run(uiMap({
      ...UI(31), "tokens.source.found": true, ...fs_(0, 1, 0), "tokens.theme.maps_font_size": { value: 1, detail: { names: ["--text-sm"] } },
      "tokens.text.unconsumed": { value: 0, detail: { declared: 1 } }, "tokens.space.unconsumed": { value: 0, detail: { declared: 1 } }, "tokens.theme.maps_space": { value: 1, detail: { names: ["--spacing"] } },
    }));
    expect(itemOf(p2, "token_discipline", "font_size_off_token").points).toBe(0);
    expect(p2.subScores.tokens.axes.type.value).toBe(0);
  });

  test("one unrelated @theme line does not turn the type axis from 0 to 100", () => {
    const q = (names) => run(uiMap({ ...UI(30), "tokens.source.found": true, ...fs_(0, 1, 0), "tokens.theme.maps_font_size": { value: names.length, detail: { names } } })).subScores.tokens.axes.type.value;
    expect(q([])).toBe(0);
    expect(q(["--text-xs"])).toBe(0); // text-sm is the one class used, and it is not mapped
    expect(q(["--text-sm"])).toBe(0 + 0); // fs_(0, 1, 0) used text-lg only
    const used = (names) => run(uiMap({ ...UI(30), "tokens.source.found": true, ...fs_(0, 2, 1), "tokens.theme.maps_font_size": { value: names.length, detail: { names } } })).subScores.tokens.axes.type.value;
    expect(used(["--text-sm"])).toBe(50); // one of two named sizes is mapped
  });

  test("wiring is the share of declared tokens left unwired, not the existence of one consumer", () => {
    const wired = (u, d) => itemRow("token_discipline", "type_scale_wired", typeTok(u, d, 0, 0, 0)).points;
    expect([wired(9, 9), wired(8, 9), wired(0, 9)]).toEqual([0, 0, 1]); // one consumer among nine tokens earns nothing
  });

  test("a primitive defined four times is not hidden by the three that are not defined", () => {
    expect(itemRow("component_consistency", "single_definitions", defs(4, 0, 0, 0)).points).toBe(0);
    expect(itemRow("component_consistency", "single_definitions", defs(1, 0, 0, 0)).points).toBe(1);
  });

  test("tests, declaration files and a single file that exports a constant are not a design system", () => {
    const one = { ...emptyMap(), "census.files.audited": aud(1, { ".ts": 1 }), "census.files.total": 1, "census.files.any_type": { value: 1, detail: { byExt: { ".ts": 1 } } } };
    expect(pub(one).scored).toBe(false);
    expect(all(one).dimensions.component_consistency.points).toBe(0);
  });
});

// ------------------------------------------------------------------------------------------------ design-audit

describe("design-audit sub-scores, severity and setup class", () => {
  test("tokens is the mean of the axes that can be rated; each axis is stated with its numerator and denominator", () => {
    // colour: 10 files with literals, the same 10 with a palette class: 190 / 200 = 95; spacing: 1 - 5/100 = 95; type: 10 named, none mapped, 30 arbitrary = 0; radius: 40 / 50 = 80
    const r = run(uiMap({
      ...UI(100), "tokens.source.found": true, "colour.scanner.files_audited": 200, ...dirty(10, 200), "colour.palette_class.files": 10,
      "scale.spacing_arbitrary.length_literal_matches": 5,
      ...fs_(30, 10, 0), "tokens.theme.maps_font_size": { value: 0, detail: { names: [] } },
      "scale.radius.named_classes": 35, "scale.radius.var_uses": 5, "scale.radius.hardcoded_uses": 10,
    }));
    const ax = r.subScores.tokens.axes;
    expect([ax.colour.value, ax.spacing.value, ax.type.value, ax.radius.value]).toEqual([95, 95, 0, 80]);
    expect(r.subScores.tokens.exact).toBe(67.5);
    expect(r.subScores.tokens.value).toBe(68); // 67.5 -> 68
    expect(r.lines.type_default_scale.value).toBe(25); // 10 of 40 font-size utilities are Tailwind named sizes: shown, not credited
  });

  test("no token source: nothing can conform, tokens scores 0 (not unrated), and the class is fresh", () => {
    const r = run(uiMap({ ...UI(10), "tokens.source.found": false }));
    expect(r.subScores.tokens).toMatchObject({ value: 0, defined: true, status: "floor" });
    expect(r.subScores.tokens.note).toMatch(/no token source resolved/);
    expect(r.setupClass).toMatchObject({ class: "fresh", reason: "no token source resolved" });
    expect(r.setupClass.recommend).toMatch(/^scaffold a fresh/);
  });

  test("the type axis credits a named size only when the theme maps that very name", () => {
    const type = (names, classes) => run(uiMap({
      ...UI(30), "tokens.source.found": true, "typography.arbitrary_size.matches": 10,
      "typography.named_size.matches": { value: 30, detail: { byClass: classes } }, "tokens.theme.maps_font_size": { value: names.length, detail: { names } },
    })).subScores.tokens.axes.type;
    const used = { "text-sm": 20, "text-lg": 10 };
    expect(type([], used)).toMatchObject({ value: 0 });
    expect(type(["--text-sm"], used)).toMatchObject({ value: 50 }); // 20 of 40
    expect(type(["--font-size-sm"], used)).toMatchObject({ value: 50 }); // either spelling
    expect(type(["--text-sm", "--text-lg"], used)).toMatchObject({ value: 75 });
    expect(type(["--text-xs"], used)).toMatchObject({ value: 0 }); // an unrelated name maps nothing that is used
  });

  test("the spacing and type axes are not rated without a Tailwind vocabulary; the rest still are", () => {
    const r = run(uiMap({ ...UI(10), "tokens.theme.present": false, "tokens.source.found": true, ...dirty(2, 10) }));
    expect(r.subScores.tokens.axes.spacing).toMatchObject({ value: null, status: "gated" });
    expect(r.subScores.tokens.axes.colour.value).toBe(80);
    expect(r.subScores.tokens.exact).toBe(80);
  });

  test("declared exemptions are applied to spacing when the counters carry the split and the exemption is within the cap", () => {
    const r = run(uiMap({
      ...UI(100), "tokens.source.found": true, "typography.exempt.files": { value: 1, detail: { files: ["src/m.tsx"] } },
      "scale.spacing_arbitrary.length_literal_matches": { value: 30, detail: { exempt: { excludingExemptFiles: 10 } } },
    }));
    expect(r.subScores.tokens.axes.spacing.value).toBe(90); // 1 - 10/100, not 70
  });

  test("an axis with a zero denominator is left out of the mean, with its reason", () => {
    const r = run(uiMap({ ...UI(100), "tokens.theme.present": false, "tokens.source.found": true, ...dirty(20, 100) }));
    expect(r.subScores.tokens.exact).toBe(80);
    expect(r.subScores.tokens.axes.radius).toMatchObject({ value: null, status: "zero", note: "no radius utilities found: radius axis not rated" });
  });

  test("density counts files whose hits are raw px values and no colour, so a colour-only file moves the colour axis alone", () => {
    const r = run(uiMap({ ...UI(193), "colour.scanner.files_with_px_only_hits": 58 }));
    expect([r.subScores.density.exact, r.subScores.density.value]).toEqual([(135 * 100) / 193, 70]);
    const colourOnly = run(uiMap({ ...UI(193), "tokens.source.found": true, ...dirty(1, 193), "colour.scanner.files_with_hits": 1 }));
    expect(colourOnly.subScores.density.value).toBe(100);
    expect(colourOnly.subScores.tokens.axes.colour.value).toBeLessThan(100);
  });

  test("components is the tag-weighted canonical reuse over Button, Badge, Card, Input", () => {
    const r = run(uiMap({ ...prim({ button: [22, 0, 25], badge: [3, 8], card: [1, 0], input: [7, 0, 1] }) }));
    expect(r.subScores.components.fraction).toEqual({ num: 33, den: 67 }); // 22 + 3 + 1 + 7 of 47 + 11 + 1 + 8
    expect(r.subScores.components.exact).toBeCloseTo((33 / 67) * 100, 9);
    expect(r.subScores.components.value).toBe(49);
  });

  test("the design-audit components sub-score and the readiness canonical_reuse item are one measure", () => {
    const r = run(uiMap({ ...prim({ button: [22, 0, 25], badge: [3, 8], card: [1, 0], input: [7, 0, 1] }) }));
    const item = itemOf(r, "component_consistency", "canonical_reuse");
    expect(item.exact).toBeCloseTo(r.subScores.components.exact, 12);
    expect(item.value).toBeCloseTo(r.subScores.components.exact, 12);
  });

  test("the drift-report drift_control and the readiness drift_control_score item are one measure", () => {
    const r = run(uiMap({ ...UI(193), ...dirty(10, 193) }));
    const item = itemOf(r, "drift_control", "drift_control_score");
    expect([r.driftControl.value, item.value === r.driftControl.exact, r.driftControl.dirtyFiles, r.driftControl.auditedFiles]).toEqual([95, true, 10, 193]);
    expect(r.driftControl.exact).toBeCloseTo((183 * 100) / 193, 9);
  });

  describe("setup class", () => {
    // colour axis = audited files without a raw colour (the larger of the literal-file and palette-file counts); spacing axis = 1 - literal values / census audited
    const cls = (colourDirty, spacingLiterals, found = true, palette = 0) => run(uiMap({
      ...UI(100), "tokens.source.found": found, ...dirty(colourDirty, 100), "colour.palette_class.files": palette, "scale.spacing_arbitrary.length_literal_matches": spacingLiterals,
    })).setupClass;

    test("fresh: no resolvable token source, or colour below 60; the recommendation depends on which", () => {
      expect(cls(0, 0, false)).toMatchObject({ class: "fresh", reason: "no token source resolved" }); // perfect numbers, no token source
      expect(cls(41, 0)).toMatchObject({ class: "fresh", reason: "colour conformance below 60" }); // 59
      expect(cls(40, 0).class).toBe("partial"); // 60 is not below 60
      expect(cls(41, 0).recommend).toMatch(/do not scaffold a second token file/);
      expect(cls(0, 0, false).recommend).toMatch(/^scaffold a fresh/);
    });
    test("mature needs colour AND spacing at 90 or more (inclusive), on exact values", () => {
      expect(cls(10, 10).class).toBe("mature"); // 90 and 90
      expect(cls(11, 10).class).toBe("partial"); // colour 89
      expect(cls(10, 11).class).toBe("partial"); // spacing 89
      expect(cls(0, 41).class).toBe("partial"); // spacing 59 with colour 100: not fresh, not mature
    });
    test("the axis is not rounded before the thresholds: 89.5 is below 90", () => {
      const r = run(uiMap({ ...UI(200), "tokens.source.found": true, ...dirty(21, 200), "census.files.audited": aud(100) }));
      expect(r.setupClass.values.colour).toBe(89.5);
      expect(r.setupClass.class).toBe("partial");
    });
    test("mature also needs fewer than 20 files with raw colour literals", () => {
      const big = (d) => run(uiMap({ ...UI(2000), "tokens.source.found": true, ...dirty(d, 2000) })).setupClass.class;
      expect([big(19), big(20)]).toEqual(["mature", "partial"]);
    });
    test("an axis that cannot be rated counts as failing; the numbers that triggered the class are returned", () => {
      const noTailwind = run(uiMap({ ...UI(10), "tokens.theme.present": false, "tokens.source.found": true }));
      expect(noTailwind.setupClass.values.spacing).toBe(-1);
      expect(noTailwind.setupClass.class).toBe("partial"); // colour 100, but spacing could not be rated: no evidence for mature
      expect(cls(10, 10).triggered).toEqual([{ value: "colour", when: ">= 90" }, { value: "spacing", when: ">= 90" }, { value: "dirty_colour_files", when: "< 20" }]);
      expect(cls(10, 10).recommend).toMatch(/^existing/);
    });
  });

  describe("severity", () => {
    const sev = (map) => run(uiMap(map)).severity;
    const hits = (value, perFile, extra = {}) => ({ value, perFile, ...extra });

    test("critical = equals a token, warning = no matching token, info = the path rules (N = 1: one use is enough)", () => {
      const s = sev({
        "colour.hex_scanner.equals_token": hits(5, [{ file: "src/a.tsx", count: 3 }, { file: "src/components/ui/button.tsx", count: 2 }]),
        "colour.hex_scanner.not_token": hits(6, [{ file: "src/lib/brands.ts", count: 4 }, { file: "src/b.tsx", count: 1 }, { file: "src/c.tsx", count: 1 }]),
        "colour.rgb_fn.outside_token_source": hits(1, [{ file: "src/components/brand-nodes.tsx", count: 1 }]),
        "typography.arbitrary_size.equals_token": hits(2, [{ file: "src/d.tsx", count: 2 }]),
        "typography.arbitrary_size.not_token": hits(3, [{ file: "src/figma-logo.tsx", count: 1 }, { file: "src/e.tsx", count: 2 }]),
      });
      expect(s).toMatchObject({ critical: 3 + 2, warning: 1 + 1 + 2, info: 2 + 4 + 1 + 1, exempt: 0, complete: true, n: 1 });
      expect(s.infoByRule).toEqual({ vendored_ui: 2, brand_data: 5, official_logo: 1 });
      expect(s.families).toEqual({
        colour: { critical: 3, warning: 2, info: 7, exempt: 0 },
        type: { critical: 2, warning: 2, info: 1, exempt: 0 },
      });
    });
    test("Info is decided by whole path words, case-insensitively: logo, brand and ui kits, not substrings", () => {
      expect(["src/components/Logo.tsx", "src/components/logo.tsx", "src/lib/Brand.ts", "src/lib/BrandCard.tsx", "src/lib/brand-card.tsx", "src/lib/brands.ts", "src/figma-logo.tsx"].map((f) => pathWords(f).some((w) => ["logo", "brand", "brands"].includes(w)))).toEqual(Array(7).fill(true));
      expect(["src/components/logout-button.tsx", "src/lib/analogous.ts", "src/lib/brandish.ts", "src/lib/unbranded.ts"].map((f) => pathWords(f).some((w) => ["logo", "logos", "brand", "brands"].includes(w)))).toEqual(Array(4).fill(false));
      expect(pathWords("src/BrandCard.tsx")).toEqual(["src", "brand", "card", "tsx"]);
      const s = sev({ "colour.hex_scanner.not_token": hits(6, [{ file: "src/components/Logo.tsx", count: 1 }, { file: "src/components/LogoutButton.tsx", count: 2 }, { file: "src/lib/analogous.ts", count: 3 }]) });
      expect(s).toMatchObject({ info: 1, warning: 5 });
      expect(sev({ "colour.hex_scanner.not_token": hits(1, [{ file: "src/Components/UI/x.tsx", count: 1 }]) }).info).toBe(1); // components/ui in any case
    });
    test("files the guardrails declare exempt are counted apart and are not critical or warning", () => {
      const s = sev({
        "typography.exempt.files": { value: 1, detail: { files: ["src/m.tsx"] } },
        "colour.hex_scanner.not_token": hits(5, [{ file: "src/m.tsx", count: 4 }, { file: "src/x.tsx", count: 1 }]),
      });
      expect(s).toMatchObject({ critical: 0, warning: 1, info: 0, exempt: 4 });
    });
    test("an exemption over the cap is not applied to severity either", () => {
      const s = sev({
        "typography.exempt.files": { value: 5, detail: { files: ["src/m.tsx"] } },
        "colour.hex_scanner.not_token": hits(5, [{ file: "src/m.tsx", count: 4 }, { file: "src/x.tsx", count: 1 }]),
      });
      expect(s).toMatchObject({ warning: 5, exempt: 0 });
    });
    test("rows cut from perFile are classed as the counter's own severity and the count is flagged incomplete", () => {
      const s = sev({ "colour.hex_scanner.equals_token": hits(10, [{ file: "src/components/ui/a.tsx", count: 3 }], { perFileOmitted: { files: 2, count: 7 } }) });
      expect(s).toMatchObject({ critical: 7, info: 3, complete: false });
      expect(s.incompleteBecause[0]).toMatch(/cut its perFile rows at 200/);
    });
    test("a counter with hits and no perFile rows (a --no-per-file report) makes severity incomplete, not 'info 0, exempt 0, complete'", () => {
      const s = sev({ "colour.hex_scanner.equals_token": 9 });
      expect(s).toMatchObject({ critical: 9, info: 0, exempt: 0, complete: false });
      expect(s.incompleteBecause[0]).toMatch(/carries no perFile rows/);
    });
    test("a perFile row without a numeric count is incomplete and never turns a total into NaN", () => {
      const s = sev({ "colour.hex_scanner.equals_token": hits(4, [{ file: "src/a.tsx", count: 2 }, { file: "src/b.tsx" }, { file: "src/c.tsx", count: "3" }]) });
      expect(s.complete).toBe(false);
      expect(Number.isFinite(s.critical)).toBe(true);
      expect(s.critical).toBe(4); // two rows are skipped, so the 2 hits they hold stay critical
    });
    test("the severity classes add up to the scanner's own total, and the report says when they do not", () => {
      const ok = sev({
        "colour.scanner.colour_hits": 10, "colour.hex_scanner.outside_token_source": 6, "colour.rgb_fn.outside_token_source": 3, "colour.oklch_fn.outside_token_source": 1,
        "typography.arbitrary_size.matches": 5, "typography.arbitrary_size.equals_token": 3, "typography.arbitrary_size.not_token": 2,
      });
      expect(ok.checks).toEqual([
        { total: "colour.scanner.colour_hits", value: 10, sum: 10, ok: true },
        { total: "typography.arbitrary_size.matches", value: 5, sum: 5, ok: true },
      ]);
      const off = sev({ "colour.scanner.colour_hits": 10, "colour.hex_scanner.outside_token_source": 6, "colour.rgb_fn.outside_token_source": 3, "colour.oklch_fn.outside_token_source": 0 });
      expect(off.checks[0]).toEqual({ total: "colour.scanner.colour_hits", value: 10, sum: 9, ok: false });
    });
  });
});

// ------------------------------------------------------------------------------------------------ drift-report

describe("drift-report: declared rules versus unruled drift", () => {
  const classes = (map) => Object.fromEntries(run(uiMap(map)).driftClasses.map((c) => [c.id, c]));

  test("colour hits are regex hits against a guardrails file that has rules (a proxy: no rule is identified) when such a file exists, else unruled", () => {
    expect(classes({ "guardrails.file.exists": true, "guardrails.structure.rule_bullets": 3 }).colour_literals).toMatchObject({ kind: "regex hits against a guardrails file that has rules", declared: true, proxy: true });
    expect(classes({ "guardrails.file.exists": true, "guardrails.structure.rule_bullets": 3 }).palette_classes).toMatchObject({ kind: "regex hits against a guardrails file that has rules", proxy: true });
    expect(classes({ "guardrails.file.exists": true, "guardrails.structure.rule_bullets": 0 }).colour_literals.kind).toBe("unruled drift");
    expect(classes({ "guardrails.file.exists": false, "guardrails.structure.rule_bullets": 3 }).colour_literals.kind).toBe("unruled drift");
  });
  test("type sizes and spacing are declared only when a rule bullet mentions them", () => {
    const on = classes({ "guardrails.rules.type_size": true, "guardrails.rules.spacing_scale": true });
    const off = classes({ "guardrails.rules.type_size": false, "guardrails.rules.spacing_scale": false });
    expect([on.type_sizes.declared, on.spacing_literals.declared, off.type_sizes.declared, off.spacing_literals.declared]).toEqual([true, true, false, false]);
    expect([on.type_sizes.kind, on.type_sizes.proxy, off.type_sizes.kind]).toEqual(["violations of a declared rule", false, "unruled drift"]); // a text match on a rule bullet is not a proxy
  });
  test("radius has no guardrails counter, so it is always reported as unruled", () => {
    expect(classes({ "guardrails.file.exists": true, "guardrails.structure.rule_bullets": 9 }).radius_literals).toMatchObject({ declared: false, kind: "unruled drift" });
  });
  test("each class names the one place its hits feed; only colour literals feed drift control", () => {
    const c = classes({});
    expect(Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v.feeds]))).toEqual({
      colour_literals: "drift_control", palette_classes: "token_discipline.palette_classes", type_sizes: "token_discipline.font_size_off_token",
      spacing_literals: "token_discipline.spacing_literals", radius_literals: "token_discipline.radius_share",
    });
  });
  test("hits and files are quoted with the exemption split applied", () => {
    const c = classes({
      "colour.scanner.colour_hits": 114, "colour.scanner.files_with_colour_hits": 10,
      "typography.exempt.files": { value: 1, detail: { files: ["src/m.tsx"] } },
      "typography.arbitrary_size.matches": { value: 265, detail: { exempt: { excludingExemptFiles: 247 } } },
      "typography.arbitrary_size.files": { value: 39, detail: { exempt: { excludingExemptFiles: 38 } } },
    });
    expect([c.colour_literals.hits, c.colour_literals.files, c.type_sizes.hits, c.type_sizes.files]).toEqual([114, 10, 247, 38]);
  });
  test("the token-source share, the mockup split and the var() split are reported separately, never folded into the score", () => {
    const r = run(uiMap({
      "colour.token_source.colour_hits": 139, "colour.token_source.colour_share": R(0.5494), "colour.token_source.px_hits": 92, "colour.token_source.px_share": R(0.2396),
      "colour.scanner.colour_hits": { value: 114, detail: { mockups: { inMockupFiles: 1, excludingMockupFiles: 113 } } }, "habit.drift_script.exclusions_not_named_in_guardrails": 6,
      "tokens.declarations.total": 279,
    }));
    expect(Object.fromEntries(Object.entries(r.lines).filter(([k]) => /token_source|mockup|undocumented|var_based|literal/.test(k)).map(([k, v]) => [k, v.value]))).toEqual({
      token_source_colour_hits: 139, token_source_colour_share: 0.5494, token_source_px_hits: 92, token_source_px_share: 0.2396, token_source_colour_hits_per_declaration: 139 / 279,
      colour_hits_in_mockup_files: 1, colour_hits_excluding_mockup_files: 113, colour_hits_var_based: 0, colour_hits_literal: 114, undocumented_exemptions: 6,
    });
    expect(r.scannerTally).toEqual({
      "colour.scanner.colour_hits": 114, "colour.scanner.px_hits": 0, "colour.scanner.files_with_hits": 0, "colour.scanner.files_audited": 10,
    });
    expect(r.lines.colour_hits_unreachable_share).toBeDefined(); // the design-audit share and the drift-report count are two lines, not one
  });
});

// ------------------------------------------------------------------------------------------------ near-threshold

describe("near-threshold: awards that flip when one counter moves by one unit", () => {
  const near = (map, scope, item) => run(map).nearThreshold.find((n) => n.scope === scope && n.item === item);
  const edgesOf = (n) => (n ? n.edges.map((e) => `${e.counter} ${e.delta > 0 ? "+1" : "-1"}: ${e.from} -> ${e.to}`).sort() : null);

  test("drift control at 98: one more dirty file or one fewer audited file drops it to 4; the other moves do not cross", () => {
    const n = near({ ...idealMap(), ...dirty(2, 100, 5) }, "drift_control", "drift_control_score");
    expect(n.value).toBeCloseTo(98, 9);
    // one more dirty file is the derived value (the two raw counters move together); 99 audited files make 97.98
    expect(edgesOf(n)).toEqual(["@dirty_colour_files +1: 5 -> 4", "colour.scanner.files_audited -1: 5 -> 4", "colour.scanner.files_with_colour_hits +1: 5 -> 4"]);
  });

  test("drift control at 100 is two steps from the edge: not listed", () => {
    expect(near(idealMap(), "drift_control", "drift_control_score")).toBeUndefined();
  });

  test("a count at the edge of '>= 1' lists the step that flips it, in both directions when both flip", () => {
    expect(edgesOf(near({ ...idealMap(), "habit.snapshots.distinct_days": 1 }, "drift_control", "history_recurring"))).toEqual([
      "habit.snapshots.distinct_days -1: 0.5 -> 0", "habit.snapshots.distinct_days +1: 0.5 -> 1",
    ].sort());
    expect(edgesOf(near({ ...idealMap(), "habit.workflows.drift_noncomment_lines": 0 }, "drift_control", "ci_wired"))).toEqual(["habit.workflows.drift_noncomment_lines +1: 0 -> 1"]);
  });

  test("a count cannot step below 0: at 0 matches only the '+1' move is listed (-1 would otherwise read as '== 0' failing)", () => {
    const n = near({ ...idealMap(), ...leg(10), "legibility.machine_paths.matches": 0 }, "agent_legibility", "no_machine_paths");
    // the lines gate closes at 9; matches +1 leaves '== 0' (1 -> 0.5); matches -1 is not a move
    expect(edgesOf(n)).toEqual(["legibility.claude_md.lines -1: 1 -> 0", "legibility.machine_paths.matches +1: 1 -> 0.5"]);
  });

  test("booleans are never stepped: a true flag sits at its edge by nature and is not listed", () => {
    expect(near(idealMap(), "codified_rules", "tokens_css")).toBeUndefined();
    expect(near(idealMap(), "drift_control", "can_fail_build")).toBeUndefined();
  });

  test("a boolean that enters a sum is never stepped, its numeric partner is", () => {
    const n = near({ ...idealMap(), "docs.oklch.docs_claim_without_declaration": true, "decisions.design_md.generator_outputs_missing": 1 }, "captured_rationale", "no_contradictions");
    // sum 2 -> 0 points; one fewer missing output leaves 1 -> 0.5; flipping the boolean would give the same, and is not tried
    expect(edgesOf(n)).toEqual(["decisions.design_md.generator_outputs_missing -1: 0 -> 0.5"]);
  });

  test("a ratio counter steps by one numerator unit", () => {
    const n = near({ ...idealMap(), "docs.coverage.token_records_per_custom_property": ratioCounter(5, 10) }, "captured_rationale", "token_record_coverage");
    expect(edgesOf(n)).toEqual(["docs.coverage.token_records_per_custom_property -1: 1 -> 0.5"]); // 4/10 = 0.4; 6/10 stays in the top band
  });

  test("a gate at its edge is listed: one snapshot is all that lets the age count", () => {
    const n = near({ ...idealMap(), "habit.snapshots.count": 1, "habit.snapshots.last_age_days": 10 }, "drift_control", "recent_snapshot");
    expect(edgesOf(n)).toEqual(["habit.snapshots.count -1: 1 -> 0"]);
  });

  test("the exemption shorthand steps the counter that was actually read", () => {
    const n = near({ ...idealMap(), "scale.spacing_arbitrary.length_literal_matches": { value: 2, detail: { exempt: { excludingExemptFiles: 2 } } } }, "token_discipline", "spacing_literals");
    // 3/100 leaves the <= 0.02 band; so does 2/99 (one file fewer)
    expect(edgesOf(n)).toEqual(["census.files.audited -1: 1 -> 0.5", "scale.spacing_arbitrary.length_literal_matches +1: 1 -> 0.5"]);
  });

  test("a dimension whose points end in .5 sits on a rounding edge", () => {
    const r = run(uiMap({ "guardrails.file.lines": 20, "guardrails.file.bytes": 240, "guardrails.structure.rule_bullets": 8, "guardrails.structure.h2_sections": 1 })); // 2 + 2 + 0.5
    const n = r.nearThreshold.find((x) => x.scope === "codified_rules" && x.item === "(rounding)");
    expect(n).toMatchObject({ value: 4.5 });
    expect(n.edges[0]).toMatchObject({ from: 5, to: 4 });
  });

  test("the setup class lists the step that would change it", () => {
    // colour 90 (10 dirty of 100), spacing 100: one more dirty file, or one fewer audited file, makes colour 89 -> partial
    // (a file with a literal holds one literal here, so one more file with hits alone does not move min(files, literals))
    const r = run(uiMap({ ...UI(100), "tokens.source.found": true, ...dirty(10, 100) }));
    const n = r.nearThreshold.find((x) => x.owner === "design-audit");
    expect(n.scope).toBe("setup_class");
    expect(edgesOf(n)).toEqual(["@dirty_colour_files +1: mature -> partial", "colour.scanner.files_audited -1: mature -> partial"]);
    const spread = run(uiMap({ ...UI(100), "tokens.source.found": true, ...dirty(10, 100, 30) }));
    expect(edgesOf(spread.nearThreshold.find((x) => x.owner === "design-audit"))).toEqual(["@dirty_colour_files +1: mature -> partial", "colour.scanner.files_audited -1: mature -> partial", "colour.scanner.files_with_colour_hits +1: mature -> partial"]);
  });

  test("an item that could not be rated is listed as unrated when one unit would rate it", () => {
    // no ADR heading yet, but a dated one: one more heading opens the gate and the item would earn 2 points
    const r = run(uiMap({ ...UI(100), "tokens.source.found": true, "decisions.adr.headings": 0, "decisions.adr.newest_age_days": 10 }));
    const n = r.nearThreshold.find((x) => x.scope === "captured_rationale" && x.item === "adr_recency");
    expect(n).toMatchObject({ unrated: true, status: "gated" });
    expect(n.edges).toEqual([expect.objectContaining({ counter: "decisions.adr.headings", delta: 1, from: 0, to: 2 })]);
  });

  test("a cap that one unit would lift or apply is listed", () => {
    const r = run({ ...idealMap(), ...dirty(40, 100) }); // 60 percent clean: exactly at the cap edge
    const n = r.nearThreshold.find((x) => x.scope === "codified_rules" && x.item === "(cap)");
    expect(n).toBeDefined();
    expect(edgesOf(n)).toEqual(["@dirty_colour_files +1: 10 -> 6", "colour.scanner.files_audited -1: 10 -> 6"]);
  });
});

// ------------------------------------------------------------------------------------------------ monotonicity

describe("monotonicity: making a counter worse never raises a score", () => {
  const flat = (r) => [
    ...Object.values(r.dimensions).flatMap((d) => d.items.map((i) => [`${d.key}.${i.id}`, i.points])),
    ...Object.values(r.dimensions).map((d) => [`${d.key}.points`, d.points]),
    ...Object.values(r.dimensions).map((d) => [`${d.key}.satisfaction`, d.satisfaction]),
    ["overall", r.overall.value],
  ];
  const valueOf = (c) => (c !== null && typeof c === "object" ? c.value : c);

  // The claim: every counter has a direction in which moving it raises no item, no dimension and not the overall. It is a
  // weak claim on purpose. A counter that is a numerator in one item and a denominator or a gate in another (a population
  // denominator, a tag count) cannot be monotone both ways, and the population is not claimed to be monotone at all: adding
  // files that hold nothing raises every share, which is why the dirty-file count is printed beside each share and capped.
  for (const [name, base] of [["ideal", idealMap], ["middling", midMap]]) {
    test(`from the ${name} report, every counter has a direction in which moving it by 1, 2, 3, 10 or 1000 raises nothing`, () => {
      const before = Object.fromEntries(flat(lean(base())));
      const violators = [];
      let tested = 0;
      for (const id of allRubricIds()) {
        const cur = valueOf(base()[id]);
        if (typeof cur !== "number" && typeof cur !== "boolean") continue;
        tested++;
        const raises = (sign) => {
          for (const k of [1, 2, 3, 10, 1000]) {
            const map = base();
            const next = typeof cur === "boolean" ? (sign > 0 ? true : false) : sign > 0 ? cur + k : Math.max(0, cur - k);
            map[id] = map[id] !== null && typeof map[id] === "object" && "value" in map[id] ? { ...map[id], value: next } : next;
            if (typeof cur === "boolean" && next === cur && k > 1) continue;
            const after = Object.fromEntries(flat(lean(map)));
            const key = Object.keys(after).find((x) => after[x] > before[x] + 1e-9);
            if (key) return `${key} ${before[key]} -> ${after[key]} (${sign > 0 ? "+" : "-"}${k})`;
          }
          return null;
        };
        const up = raises(1);
        const down = raises(-1);
        if (up && down) violators.push(`${id}: up raises ${up}; down raises ${down}`);
      }
      expect(violators).toEqual([]);
      expect(tested).toBeGreaterThan(120);
    });
  }

  test("counters with two roles move the right way where it is unambiguous (more canonical tags is better; more raw or local tags is worse)", () => {
    const score = (m) => run(uiMap({ ...m })).dimensions.component_consistency.items.find((i) => i.id === "canonical_reuse").exact;
    const base = prim({ button: [10, 2, 8], badge: [5, 5], card: [3, 1], input: [4, 0, 2] });
    const b = score(base);
    expect(score({ ...base, ...prim({ button: [20, 2, 8], badge: [5, 5], card: [3, 1], input: [4, 0, 2] }) })).toBeGreaterThan(b);
    expect(score({ ...base, "primitives.button.raw.outside_ui": 9 })).toBeLessThan(b);
    expect(score({ ...base, "primitives.badge.resolved.to_local_definition": 6 })).toBeLessThan(b);
    expect(score({ ...base, "primitives.input.raw.outside_ui": 3 })).toBeLessThan(b);
    const radius = (n, v, h) => run(uiMap({ "scale.radius.named_classes": n, "scale.radius.var_uses": v, "scale.radius.hardcoded_uses": h })).dimensions.token_discipline.items.find((i) => i.id === "radius_share").exact;
    expect(radius(10, 0, 1)).toBeLessThan(radius(5, 0, 1)); // more conforming radii, smaller hard-coded share
    expect(radius(10, 0, 2)).toBeGreaterThan(radius(10, 0, 1));
  });

  test("worse code never raises the readiness score: one more dirty file, one more palette class, one more arbitrary size", () => {
    const b = run(idealMap()).overall.value;
    expect(run({ ...idealMap(), ...dirty(5, 100) }).overall.value).toBeLessThanOrEqual(b);
    expect(run({ ...idealMap(), "colour.palette_class.matches": 5 }).overall.value).toBeLessThanOrEqual(b);
    expect(run({ ...idealMap(), "typography.arbitrary_size.matches": 50 }).overall.value).toBeLessThanOrEqual(b);
    expect(run({ ...idealMap(), "scale.radius.hardcoded_uses": 50 }).overall.value).toBeLessThanOrEqual(b);
  });
});

// ------------------------------------------------------------------------------------------------ loading the rubric from the skills

describe("loadRubric reads the owner blocks out of the rubric.json files", () => {
  const dirs = [];
  afterAll(() => dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

  // `mutate[owner]` returns the text of that owner's rubric.json instead of the real block
  function writeSkills(mutate = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sx-rubric-"));
    dirs.push(dir);
    for (const { owner, file } of RUBRIC_FILES) {
      const abs = path.join(dir, file);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, mutate[owner] ? mutate[owner]() : `${JSON.stringify(rubric[owner], null, 1)}\n`);
    }
    return dir;
  }
  const json = (obj) => `${JSON.stringify(obj, null, 1)}\n`;

  test("the three files are readiness-audit, design-audit and drift-report, each a rubric.json next to its SKILL.md", () => {
    expect(RUBRIC_FILES.map((f) => [f.owner, f.file])).toEqual([
      ["readiness-audit", path.join("readiness-audit", "rubric.json")],
      ["design-audit", path.join("design-audit", "rubric.json")],
      ["drift-report", path.join("drift-report", "rubric.json")],
    ]);
  });

  test("files written to three skill folders load back as the same rubric and score the same", () => {
    const loaded = loadRubric(writeSkills());
    expect(loaded["design-audit"]).toEqual(rubric["design-audit"]);
    expect(loaded["drift-report"]).toEqual(rubric["drift-report"]);
    expect(loaded["readiness-audit"]).toEqual(rubric["readiness-audit"]);
    expect(loaded.rubric_version).toBe("v1");
    expect(JSON.stringify(evaluate(mk(midMap()), loaded))).toBe(JSON.stringify(evaluate(mk(midMap()), rubric)));
  });

  test("a missing file is reported as NO_RUBRIC and names the path", () => {
    const dir = writeSkills();
    fs.rmSync(path.join(dir, "design-audit", "rubric.json"));
    expect(() => loadRubric(dir)).toThrow(expect.objectContaining({ code: "NO_RUBRIC", message: expect.stringContaining(path.join("design-audit", "rubric.json")) }));
  });

  test("a file that exists but is broken fails loudly", () => {
    const bad = (text) => writeSkills({ "drift-report": () => text });
    expect(() => loadRubric(bad("{ not json }"))).toThrow(/not valid JSON/);
    expect(() => loadRubric(bad(""))).toThrow(/not valid JSON/);
    expect(() => loadRubric(bad(json({ ...rubric["drift-report"], owner: "design-audit" })))).toThrow(/expected "drift-report"/);
  });

  test("a block in another language (the previous one included), or scoring another counters major, is refused", () => {
    const lang = writeSkills({ "design-audit": () => json({ ...rubric["design-audit"], language: "rubric-language/1" }) });
    expect(() => loadRubric(lang)).toThrow(/written in rubric-language\/1, this evaluator reads rubric-language\/2/);
    const major = writeSkills({ "drift-report": () => json({ ...rubric["drift-report"], counters: { schema: "systemix.audit-counters/1", major: 2 } }) });
    expect(() => loadRubric(major)).toThrow(/disagree on which counters/);
  });

  test("loadRubric takes the counters schema and major from the blocks themselves", () => {
    expect(loadRubric(writeSkills()).counters).toEqual({ schema: "systemix.audit-counters/1", major: 1 });
    expect(LANGUAGE).toBe("rubric-language/2");
  });

  test("the skills must agree on the rubric version", () => {
    const dir = writeSkills({ "drift-report": () => json({ ...rubric["drift-report"], rubric_version: "v2" }) });
    expect(() => loadRubric(dir)).toThrow(/rubric_version differs/);
  });

  test("the real skills load and validate", () => {
    expect(validateRubric(loadRubric(SKILLS_DIR))).toEqual([]);
  });
});

// ------------------------------------------------------------------------------------------------ against the real counters

describe("against a real counters report", () => {
  // These run the counters over tiny temp repos: they prove that every counter id and every detail field the rubric
  // reads exists in a real report, and that the derived values mean what the rubric says.
  const { runCounters } = require("../../../src/lib/counters");
  const repos = [];
  afterAll(() => repos.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));
  function repo(files) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sx-rubric-real-"));
    repos.push(root);
    for (const [rel, body] of Object.entries(files)) {
      const abs = path.join(root, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, body);
    }
    return root;
  }
  const score = (root, dirs = ["src"]) => evaluateAll(runCounters(root, { dirs }), rubric);

  const TOKENS = ":root { --primary: #112233; --font-size-sm: 14px; --space-2: 8px; }\n@theme {\n  --text-sm: 14px;\n  --text-lg: 18px;\n  --spacing: 0.25rem;\n}\n";
  const BUTTON = 'export function Button(props: { children: unknown }) {\n  return <button className="rounded-md bg-primary text-sm p-4">{props.children as never}</button>;\n}\n';
  const PAGE = [
    'import { Button } from "../components/ui/button";',
    "export default function Page() {",
    "  return (",
    '    <main style={{ background: "hsl(var(--primary))", border: "1px solid rgb(var(--primary) / 0.5)" }} className="text-sm text-lg text-xl rounded-md p-4">',
    "      <Button>a</Button><Button>b</Button><Button>c</Button><Button>d</Button><Button>e</Button>",
    "    </main>",
    "  );",
    "}",
    "",
  ].join("\n");

  test("a tiny Tailwind repo is scored from a real report, with no counter missing", () => {
    const r = score(repo({ "design/tokens.css": TOKENS, "src/components/ui/button.tsx": BUTTON, "src/app/page.tsx": PAGE }));
    expect(r.missing).toEqual([]);
    expect(r.scored).toBe(true);
    expect(r.compat).toEqual({ ok: true, notes: [] });
    expect(r.header.coverage).toMatchObject({ ok: true, share: 1 });
  });

  test("hsl(var(--x)) and rgb(var(--x) / 0.5) are token references: drift control 100, the class is mature, the var() share is printed", () => {
    const r = score(repo({ "design/tokens.css": TOKENS, "src/components/ui/button.tsx": BUTTON, "src/app/page.tsx": PAGE }));
    expect(r.driftControl).toMatchObject({ value: 100, dirtyFiles: 0, auditedFiles: 2 });
    expect(r.lines.colour_hits_var_based.value).toBe(2);
    expect(r.lines.colour_hits_literal.value).toBe(0);
    expect(r.setupClass.class).toBe("mature");
    expect(r.flags.map((f) => f.id)).toContain("var_colour_calls");
  });

  test("named sizes the theme maps are on-token: text-sm x2 and text-lg x1 are mapped, text-xl is not (3 of 4)", () => {
    const r = score(repo({ "design/tokens.css": TOKENS, "src/components/ui/button.tsx": BUTTON, "src/app/page.tsx": PAGE }));
    expect(r.subScores.tokens.axes.type.value).toBe(75);
    expect(r.lines.named_sizes_mapped_share.value).toBe(75);
    expect(itemOf(r, "token_discipline", "font_size_off_token").exact).toBe(0.25); // 1 unmapped of 4 font-size utilities
  });

  test("Button x5 from components/ui is 100 percent canonical reuse (5 tags are enough to rate)", () => {
    const r = score(repo({ "design/tokens.css": TOKENS, "src/components/ui/button.tsx": BUTTON, "src/app/page.tsx": PAGE }));
    expect(r.subScores.components).toMatchObject({ value: 100, fraction: { num: 5, den: 5 } });
  });

  test("a design system outside components/ui is canonical when it is the only definition of the name", () => {
    const r = score(repo({ "design/tokens.css": TOKENS, "src/design/button.tsx": BUTTON, "src/app/page.tsx": PAGE.replace("../components/ui/button", "../design/button") }));
    expect(r.subScores.components).toMatchObject({ value: 83, fraction: { num: 5, den: 6 } }); // the raw <button> inside the Button file now counts: it is outside components/ui
  });

  test("source hidden in a dot folder is not scored: the audit saw 1 of 11 source-looking files", () => {
    const files = { "design/tokens.css": TOKENS, "src/app/page.tsx": PAGE };
    for (let i = 0; i < 10; i++) files[`src/.legacy/f${i}.tsx`] = 'export const X = () => <div style={{ color: "#ff0000" }} className="text-[13px]" />;\n';
    const root = repo(files);
    const r = evaluate(runCounters(root, { dirs: ["src"] }), rubric);
    expect(r.scored).toBe(false);
    expect(r.withheld.reasons.join(" ")).toMatch(/saw 1 of 11 source-looking files/);
    expect(r.overall).toBeNull();
  });

  test("a folder with no styling code is not scored", () => {
    const r = evaluate(runCounters(repo({ "src/index.ts": "export const a = 1;\n" }), { dirs: ["src"] }), rubric);
    expect(r.scored).toBe(false);
    expect(r.withheld.reasons.join(" ")).toMatch(/no styling code/);
  });

  test("a folder that does not exist is not scored and is named", () => {
    const r = evaluate(runCounters(repo({ "src/app/page.tsx": PAGE }), { dirs: ["lib"] }), rubric);
    expect(r.scored).toBe(false);
    expect(r.header.missingDirs).toEqual(["lib"]);
  });

  test("a sliced real report is not scored", () => {
    const full = runCounters(repo({ "design/tokens.css": TOKENS, "src/app/page.tsx": PAGE }), { dirs: ["src"] });
    const sliced = { ...full, counters: full.counters.filter((c) => c.group === "colour"), slice: { ids: ["colour"], brief: false, definitions: true, perFile: true, counters: 29, of: full.counters.length } };
    expect(evaluate(sliced, rubric).scored).toBe(false);
    const groups = runCounters(repo({ "src/app/page.tsx": PAGE }), { dirs: ["src"], groups: ["colour", "census"] });
    expect(evaluate(groups, rubric).withheld.reasons.join(" ")).toMatch(/counter groups were skipped/);
  });

  test("a stub documentation set on a dirty codebase scores below the same code with real documents (the cap and the gates at work)", () => {
    const dirtyFiles = {};
    for (let i = 0; i < 12; i++) dirtyFiles[`src/c${i}.tsx`] = 'export const C = () => <div style={{ color: "#ff0000", padding: "7px" }} className="text-[13px] bg-blue-500" />;\n';
    const stub = repo({
      ...dirtyFiles, "design/tokens.css": TOKENS, "design/guardrails.mdx": "x\n", "CLAUDE.md": "\n".repeat(30),
      "design/decisions/adr.md": Array.from({ length: 11 }, (_, i) => `## ADR-${i + 1}`).join("\n") + "\n",
    });
    const r = score(stub);
    expect(r.scored).toBe(true);
    expect(itemOf(r, "codified_rules", "guardrails_file").points).toBe(0);
    expect(itemOf(r, "captured_rationale", "adr_corpus").status).toBe("gated");
    expect(itemOf(r, "agent_legibility", "instruction_file").status).toBe("gated");
    expect(r.dimensions.drift_control.items[0].points).toBe(0);
    expect(r.overall.value).toBeLessThan(30);
  });
});
