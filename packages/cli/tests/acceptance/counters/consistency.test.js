/**
 * consistency.test.js — what must hold across ALL counter groups, run over one
 * small repo that makes most of them report something (fixture.js) and over an
 * empty one. Each group's own test file proves its numbers; this file proves the
 * groups agree on how a report is shaped:
 *
 *   - every group of GROUPS is a module of that name, runs, and says something
 *   - ids are unique, dotted lowercase, and start with their group
 *   - units mean one thing: a "file" counter counts files, a "match" counter's
 *     per-file rows add up to its value, a ratio is numerator ÷ denominator
 *   - perFile is present wherever a value is a sum over files
 *   - one fact has one name (the few deliberate overlaps agree with each other)
 *   - a module reads the repo only through ctx, and uses no clock, locale or randomness; groups
 *     share helpers only through the shared modules, never by importing each other
 *   - every published regex compiles with its published flags
 *   - the same tree gives the same bytes, wherever it lives
 *   - the README documents every counter, with its unit
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { removeRepo, run, get, val, makeRepo } = require("./helpers");
const { makeRichRepo, copyTree } = require("./fixture");
const { GROUPS, COUNTERS_VERSION, SCHEMA } = require("../../../src/lib/counters");
const { validateReport, round4 } = require("../../../src/lib/counters/counter");
const { scanProject } = require("../../../src/commands/drift");

const COUNTERS_DIR = path.join(__dirname, "..", "..", "..", "src", "lib", "counters");
// not groups: the report shape, the context, and the modules several groups share (groups never import one another)
const SHARED = ["css.js", "exemptions.js", "graph.js", "markdown.js", "tags.js", "util.js"];
const INFRA = new Set(["counter.js", "context.js", "index.js", "summary.js", ...SHARED]);

// Counters whose file set IS the audited population (or a census slice): listing up to 200 of its files in every
// report would repeat the census, so they carry no perFile. Everything else that sums over files does.
const POPULATION = new Set([
  "census.files.total",
  "census.files.audited",
  "census.files.any_type",
  "census.audited.outside_components_ui",
  "reachability.graph.files_parsed",
  "reachability.components.ui.total",
  "reachability.components.other.total",
]);

describe("counter groups agree on how a report is shaped", () => {
  const roots = [];
  const track = (root) => { roots.push(root); return root; };
  afterAll(() => roots.forEach(removeRepo));

  const richRoot = track(makeRichRepo());
  const rich = run(richRoot, { dirs: ["src"] });
  const empty = run(track(makeRepo({})), {});
  const reports = { rich, empty };

  describe("the groups", () => {
    test("GROUPS is exactly the set of module files, and each module names itself after its file", () => {
      const files = fs.readdirSync(COUNTERS_DIR).filter((f) => f.endsWith(".js") && !INFRA.has(f)).map((f) => f.slice(0, -3)).sort();
      expect([...GROUPS].sort()).toEqual(files);
      for (const g of GROUPS) {
        const mod = require(path.join(COUNTERS_DIR, g));
        expect(mod.group).toBe(g);
        expect(typeof mod.run).toBe("function");
      }
    });

    test.each(Object.keys(reports))("%s: every group ran, none was left out, and each produced counters", (name) => {
      const report = reports[name];
      expect(report.groups.run).toEqual(GROUPS);
      expect(report.groups.skipped).toEqual([]);
      for (const g of GROUPS) expect(report.counters.filter((c) => c.group === g).length).toBeGreaterThan(0);
    });

    test("the same ids come out whatever the repo holds (a group does not drop counters when its input is absent), bar the exemption variants", () => {
      const ids = (r) => r.counters.map((c) => c.id);
      const conditional = ids(rich).filter((id) => !ids(empty).includes(id));
      expect(conditional.every((id) => id.endsWith("_excluding_exempt"))).toBe(true);
      expect(ids(empty).every((id) => ids(rich).includes(id))).toBe(true);
    });

    test("the report header names the schema and counters version", () => {
      expect(rich.schema).toBe(SCHEMA);
      expect(rich.countersVersion).toBe(COUNTERS_VERSION);
      expect(COUNTERS_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe.each(Object.keys(reports))("ids and units: %s", (name) => {
    const report = reports[name];

    test("the report validates; ids are unique, dotted lowercase and start with their group", () => {
      expect(validateReport(report)).toEqual([]);
      const ids = report.counters.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const c of report.counters) {
        expect(c.id).toMatch(/^[a-z0-9]+(?:\.[a-z0-9_]+){1,4}$/);
        expect(c.id.split(".")[0]).toBe(c.group);
        expect(GROUPS).toContain(c.group);
      }
    });

    test("every counter says what it counted: a summary, a file set, and a regex or an explicit null", () => {
      for (const c of report.counters) {
        expect(c.definition.summary.trim().length).toBeGreaterThan(10);
        expect(c.definition.fileSet.trim().length).toBeGreaterThan(2);
        expect(c.definition.regex === null || typeof c.definition.regex === "string").toBe(true);
      }
    });

    test("a counter of a regex unit (match, line) names its regex or regexes, except where it counts a structure", () => {
      const noRegex = report.counters
        .filter((c) => (c.unit === "match" || c.unit === "line") && c.definition.regex === null && !c.definition.regexes)
        .map((c) => c.id);
      // these count things a regex does not define: graph edges, parsed tags, resolver results, or css declarations (lib/css-parse.js is a statement parser)
      const allowed = /^(reachability\.graph\.references\.|reachability\.colour_hits\.|primitives\..*\.(resolved|canonical)|scale\.|typography\.css_apply|tokens\.(declarations\.|(font_size|space|text)\.declarations))|\.lines$/;
      expect(noRegex.filter((id) => !allowed.test(id))).toEqual([]);
    });

    test("every published regex compiles with its published flags; a counter with several patterns has regex null and lists each one", () => {
      const problems = [];
      const compiles = (rx, flags) => { try { new RegExp(rx, flags); return true; } catch { return false; } };
      for (const c of report.counters) {
        const d = c.definition;
        if (d.regexes) {
          if (d.regex !== null || d.flags !== null) problems.push(`${c.id}: regexes with a regex`);
          if (d.regexes.length < 2) problems.push(`${c.id}: a list of one`);
          for (const r of d.regexes) if (typeof r.label !== "string" || !r.label || typeof r.regex !== "string" || typeof r.flags !== "string" || !compiles(r.regex, r.flags)) problems.push(`${c.id}: bad entry ${r.label}`);
        } else if (d.regex === null) {
          if (d.flags !== null) problems.push(`${c.id}: flags without a regex`);
        } else if (typeof d.flags !== "string" || !compiles(d.regex, d.flags)) {
          problems.push(`${c.id}: ${d.regex} / ${d.flags}`);
        }
      }
      expect(problems).toEqual([]);
    });

    test("no published regex is several patterns glued with ' | ' or ' ;; ' (that is not one pasteable regex)", () => {
      const glued = report.counters.flatMap((c) => [c.definition.regex, ...(c.definition.regexes ?? []).map((r) => r.regex)])
        .filter((rx) => typeof rx === "string" && /\) \| \\b|\) \| \(\?|;; /.test(rx));
      expect(glued).toEqual([]);
    });

    test("ratios are numerator ÷ denominator to 4 dp; a zero denominator is null, never 0", () => {
      const ratios = report.counters.filter((c) => c.unit === "ratio");
      expect(ratios.length).toBeGreaterThan(5);
      for (const c of ratios) {
        const { numerator, denominator } = c.detail;
        if (denominator === 0) expect([c.id, c.value]).toEqual([c.id, null]);
        else expect([c.id, c.value]).toEqual([c.id, round4(numerator / denominator)]);
        if (c.value === null) expect([c.id, (c.notes ?? []).length > 0]).toEqual([c.id, true]); // a null says why
      }
    });

    test("booleans are booleans (an unknown answer is false with a note), dates are ISO strings, nothing is NaN", () => {
      for (const c of report.counters) {
        if (c.unit === "boolean") expect(typeof c.value).toBe("boolean");
        if (c.unit === "date" && c.value !== null) expect(c.value).toMatch(/^\d{4}-\d{2}-\d{2}(?:T[\d:.]+(?:Z|[+-]\d{2}:\d{2}))?$/);
        if (typeof c.value === "number") expect(Number.isFinite(c.value)).toBe(true);
      }
    });
  });

  describe("perFile is the proof of every number that sums over files", () => {
    test.each(Object.keys(reports))("%s: a match, line or file counter with a value has perFile (population counters excepted)", (name) => {
      const missing = reports[name].counters
        .filter((c) => ["match", "line", "file"].includes(c.unit) && c.value > 0 && !c.perFile && !POPULATION.has(c.id))
        .map((c) => c.id);
      expect(missing).toEqual([]);
    });

    test.each(Object.keys(reports))("%s: the rows add up — match/line to the value, file to one row per file", (name) => {
      const problems = [];
      for (const c of reports[name].counters) {
        if (!c.perFile) continue;
        const total = c.perFileTotal ?? c.perFile.length;
        if (c.unit === "file" && total !== c.value) problems.push(`${c.id}: ${c.value} files, ${total} rows`);
        if (c.unit === "match" || c.unit === "line") {
          const sum = c.perFile.reduce((a, r) => a + r.count, 0) + (c.perFileOmitted ? c.perFileOmitted.count : 0);
          if (sum !== c.value) problems.push(`${c.id}: value ${c.value}, rows (and what was omitted) add up to ${sum}`);
        }
        if (new Set(c.perFile.map((r) => r.file)).size !== c.perFile.length) problems.push(`${c.id}: a file appears twice`);
        if (c.perFile.some((r) => !Number.isFinite(r.count) || r.count < 0 || r.file.startsWith("/") || r.file.includes("\\"))) problems.push(`${c.id}: a row is malformed`);
      }
      expect(problems).toEqual([]);
    });

    test("population counters are the ones whose file set is the census itself", () => {
      for (const id of POPULATION) expect(rich.counters.some((c) => c.id === id)).toBe(true);
      expect(val(rich, "census.files.total")).toBe(rich.scope.population.census);
      expect(val(rich, "census.files.audited")).toBe(rich.scope.population.audited);
    });
  });

  describe("one fact, one name", () => {
    test("no two counters of different groups share unit, regex, file set and value, bar the deliberate overlaps", () => {
      const seen = new Map();
      const pairs = [];
      for (const c of rich.counters) {
        const key = JSON.stringify([c.unit, c.definition.regex, c.definition.flags, c.definition.regexes, c.definition.fileSet, c.value]);
        if (seen.has(key) && seen.get(key).group !== c.group) pairs.push([seen.get(key).id, c.id].sort());
        else seen.set(key, c);
      }
      // docs.spine.* repeats the existence flags of the group that analyses the file; their definitions say so
      expect(pairs).toEqual([
        ["decisions.design_md.exists", "docs.spine.design_md"],
        ["docs.spine.guardrails_mdx", "guardrails.file.exists"],
      ]);
    });

    test("no two counters of different groups say the same thing about the same files, however their regexes differ", () => {
      // the test above keys on regex and value, so two parsers that answer one question differently slip past it:
      // the same words (backticks and case aside) over the same file set is one fact with two names
      const norm = (text) => text.replace(/`/g, "").replace(/\s+/g, " ").trim().toLowerCase();
      const seen = new Map();
      const pairs = [];
      for (const c of rich.counters) {
        const key = JSON.stringify([c.unit, norm(c.definition.summary), c.definition.fileSet]);
        if (seen.has(key) && seen.get(key).group !== c.group) pairs.push([seen.get(key).id, c.id].sort());
        else seen.set(key, c);
      }
      expect(pairs).toEqual([]);
    });

    test("the deliberate overlaps agree, and each says it is the same fact as the other", () => {
      expect(val(rich, "docs.spine.guardrails_mdx")).toBe(val(rich, "guardrails.file.exists"));
      expect(val(rich, "docs.spine.design_md")).toBe(val(rich, "decisions.design_md.exists"));
      expect(get(rich, "docs.spine.guardrails_mdx").definition.summary).toContain("guardrails.file.exists");
      expect(get(rich, "docs.spine.design_md").definition.summary).toContain("decisions.design_md.exists");
      for (const report of [rich, empty]) {
        expect(val(report, "docs.spine.guardrails_mdx")).toBe(val(report, "guardrails.file.exists"));
      }
    });

    test("the oklch facts about the token source live in the tokens group only", () => {
      expect(rich.counters.filter((c) => /oklch/.test(c.id)).map((c) => c.id)).toEqual([
        "colour.oklch_fn.outside_token_source", // oklch( calls in ts/tsx, not the token source
        "decisions.adr.mentioning_oklch", // ADR sections
        "docs.oklch.adr_mentions", // the word, in ADR text
        "docs.oklch.claude_md_mentions",
        "docs.oklch.docs_claim_without_declaration",
        "tokens.oklch.declarations", // the token source itself: here and nowhere else
        "tokens.oklch.occurrences",
      ]);
    });

    test("counters that restate a population number agree with it", () => {
      const pop = rich.scope.population;
      expect(val(rich, "census.files.total")).toBe(pop.census);
      expect(val(rich, "census.files.tests")).toBe(pop.tests);
      expect(val(rich, "census.files.declarations")).toBe(pop.declarations);
      expect(val(rich, "census.files.audited")).toBe(pop.audited);
      expect(val(rich, "colour.scanner.files_audited")).toBe(pop.audited);
      expect(val(rich, "tokens.custom_properties.distinct")).toBe(rich.scope.tokenSource.customProperties);
      expect(val(rich, "tokens.source.path")).toBe(rich.scope.tokenSource.path);
      expect(val(rich, "tokens.source.via")).toBe(rich.scope.tokenSource.via);
      expect(val(rich, "census.files.token_source")).toBe(1);
    });

    test("the scanner counters ARE the scanner", () => {
      const scan = scanProject(richRoot, ["src"]);
      expect(val(rich, "colour.scanner.colour_hits")).toBe(scan.critical);
      expect(val(rich, "colour.scanner.px_hits")).toBe(scan.warnings);
      expect(val(rich, "colour.scanner.files_with_hits")).toBe(scan.filesWithDrift);
      expect(val(rich, "reachability.colour_hits.assessed")).toBeLessThanOrEqual(scan.critical);
    });

    test("a family's matches ≥ lines ≥ files, so the three units cannot be swapped", () => {
      const m = val(rich, "typography.arbitrary_size.matches");
      const l = val(rich, "typography.arbitrary_size.lines");
      const f = val(rich, "typography.arbitrary_size.files");
      expect(m).toBeGreaterThanOrEqual(l);
      expect(l).toBeGreaterThanOrEqual(f);
      expect(f).toBeGreaterThan(0);
      expect(val(rich, "typography.arbitrary_size.px_matches") + val(rich, "typography.arbitrary_size.rem_matches")).toBe(m);
      expect(val(rich, "colour.hex6.outside_token_source")).toBeGreaterThanOrEqual(val(rich, "colour.hex6.outside_token_source_files"));
      expect(val(rich, "primitives.button.raw.total")).toBe(val(rich, "primitives.button.raw.inside_ui") + val(rich, "primitives.button.raw.outside_ui"));
      expect(val(rich, "primitives.button.tags.total")).toBe(val(rich, "primitives.button.tags.inside_ui") + val(rich, "primitives.button.tags.outside_ui"));
      expect(val(rich, "reachability.graph.references.total"))
        .toBe(val(rich, "reachability.graph.references.resolved") + val(rich, "reachability.graph.references.package") + val(rich, "reachability.graph.references.outside_census")
          + val(rich, "reachability.graph.references.missing"));
    });
  });

  describe("modules read the repo only through ctx, and are deterministic by construction", () => {
    const groupSources = GROUPS.map((g) => [g, fs.readFileSync(path.join(COUNTERS_DIR, `${g}.js`), "utf8")]);
    const sharedSources = SHARED.map((f) => [f, fs.readFileSync(path.join(COUNTERS_DIR, f), "utf8")]);
    // statement-level requires only: the word "require(" also appears in comments and in the text counters search for
    const requires = (src) => [...src.matchAll(/^[ \t]*(?:const|let|var)\b[^\n=]*=\s*require\(\s*["']([^"']+)["']\s*\)/gm)].map((m) => m[1]);
    const shared = SHARED.map((f) => `./${f.slice(0, -3)}`);

    test.each(groupSources)("%s requires only path, the shared modules, the layout, the resolver and the scanner (never another group)", (g, src) => {
      const allowed = new Set(["path", "./counter", ...shared, "../layout", "../design-source", "../../commands/drift"]);
      expect(requires(src).filter((r) => !allowed.has(r))).toEqual([]);
    });

    test.each(groupSources)("%s exports its group and its run, nothing else", (g) => {
      expect(Object.keys(require(path.join(COUNTERS_DIR, g))).sort()).toEqual(["group", "run"]);
    });

    test.each(sharedSources)("%s is not a group: it exports no run, and requires no group", (f, src) => {
      expect(typeof require(path.join(COUNTERS_DIR, f)).run).toBe("undefined");
      const groups = new Set(GROUPS.map((g) => `./${g}`));
      expect(requires(src).filter((r) => groups.has(r))).toEqual([]);
    });

    test.each([...groupSources, ...sharedSources])("%s uses no clock, locale-dependent sort, randomness, environment or working directory", (g, src) => {
      const code = src
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .split("\n")
        .map((line) => line.replace(/^\s*\/\/.*$/, ""))
        .join("\n");
      for (const banned of ["Date.now(", "new Date()", "Math.random(", ".localeCompare(", "toLocale", "Intl.", "process.env", "process.argv", "child_process", "gray-matter", "performance.now"]) {
        expect([g, code.includes(banned) ? banned : null]).toEqual([g, null]);
      }
    });
  });

  describe("determinism", () => {
    test("two runs over the same tree give the same bytes", () => {
      expect(JSON.stringify(run(richRoot, { dirs: ["src"] }))).toBe(JSON.stringify(rich));
    });

    test("the same tree in another folder gives the same report (no absolute path, no folder name leaks in)", () => {
      const other = track(copyTree(richRoot));
      const a = JSON.stringify(rich);
      const b = JSON.stringify(run(other, { dirs: ["src"] }));
      expect(b).toBe(a); // the copy carries the history, so the commit and its date are the same too
      for (const text of [a, b]) {
        expect(text).not.toContain(path.basename(richRoot));
        expect(text).not.toContain(path.basename(other));
        expect(text).not.toContain(path.dirname(richRoot) + path.sep);
      }
    });

    test("dirs may be named in any order", () => {
      const ab = run(richRoot, { dirs: ["src", "scripts"] });
      const ba = run(richRoot, { dirs: ["scripts", "src"] });
      expect(ba.counters).toEqual(ab.counters);
    });

    test("provenance comes from git: the commit and its date, never the clock", () => {
      expect(rich.repo.commitDate).toBe("2026-09-15T12:00:00+00:00");
      expect(val(rich, "habit.snapshots.last_age_days")).toBe(69); // 2026-07-08 → 2026-09-15
      expect(val(rich, "decisions.adr.newest_age_days")).toBe(136); // 2026-05-02 → 2026-09-15
    });
  });

  describe("the README documents every counter", () => {
    const { tableOf, readmeBlock, README } = require("./readme-table");
    const readme = fs.readFileSync(README, "utf8");

    test("its id table is exactly the table of a run on the fixture (regenerate: node tests/acceptance/counters/readme-table.js --write)", () => {
      expect(readmeBlock(readme)).toBe(tableOf(rich).markdown);
    });

    test("every id of the fixture run is in the table with its unit, and the table has no other id", () => {
      const rows = [...readmeBlock(readme).matchAll(/^\| `([a-z0-9_.]+)` \| (\w+) \|/gm)].map((m) => ({ id: m[1], unit: m[2] }));
      // the table is grouped in GROUPS order; within a group, in id order
      expect(rows).toEqual(GROUPS.flatMap((g) => rich.counters.filter((c) => c.group === g)).map((c) => ({ id: c.id, unit: c.unit })));
    });

    test("it names every flag of the command, every unit, every group and the versioning rules", () => {
      for (const flag of ["--dirs", "--groups", "--ids", "--brief", "--no-definitions", "--no-per-file", "--out", "--pretty", "--summary", "--dirty", "--root"]) expect(readme).toContain(flag);
      for (const unit of ["match", "line", "file", "distinct", "boolean", "ratio", "number", "string", "date"]) expect(readme).toContain(`\`${unit}\``);
      for (const g of GROUPS) expect(readme).toContain(`#### ${g} (`);
      expect(readme).toMatch(/## Versioning/);
      expect(readme).toContain("COUNTERS_VERSION");
      expect(readme).toContain("must not recompute a counter that is in the JSON");
      // the README does not claim a wiring that is not there: the skills are "meant to" quote the report
      expect(readme).toMatch(/are meant to quote this report/);
      expect(readme).toMatch(/mechanical.*judged|judged.*mechanical/s);
    });

    test("the README says whether the three audit skills call the counters, and is right about it", () => {
      const skills = ["design-audit", "drift-report", "readiness-audit"].map((name) => fs.readFileSync(path.join(COUNTERS_DIR, "..", "..", "..", "pipelines", "design-system", "skills", name, "SKILL.md"), "utf8"));
      const wired = skills.filter((text) => /audit counters/.test(text)).length;
      // when a skill is wired to the command this fails: delete the sentence in the README's intro, it is no longer true
      expect(readme.includes("Today none of the three SKILL.md files calls it yet")).toBe(wired === 0);
    });

    test("the package README points at it", () => {
      const pkg = fs.readFileSync(path.join(COUNTERS_DIR, "..", "..", "..", "README.md"), "utf8");
      expect(pkg).toContain("audit counters");
      expect(pkg).toContain("src/lib/counters/README.md");
    });
  });

  describe("scoping: a report says what it covered", () => {
    test("--groups style selection runs only those groups and leaves the rest out of the report", () => {
      const some = run(richRoot, { dirs: ["src"], groups: ["tokens", "census"] });
      expect(some.groups.run).toEqual(["census", "tokens"]);
      expect(some.counters.every((c) => c.group === "census" || c.group === "tokens")).toBe(true);
      expect(validateReport(some)).toEqual([]);
    });

    test("every group can run alone (no group needs another group's run)", () => {
      for (const g of GROUPS) {
        const alone = run(richRoot, { dirs: ["src"], groups: [g] });
        expect(alone.groups.run).toEqual([g]);
        const sameIds = alone.counters.map((c) => c.id);
        expect(sameIds).toEqual(rich.counters.filter((c) => c.group === g).map((c) => c.id));
        expect(alone.counters).toEqual(rich.counters.filter((c) => c.group === g));
      }
    });
  });
});
