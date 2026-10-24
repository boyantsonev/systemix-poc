/**
 * report.test.js — the report as a document a reader (a skill, a model, a person) has to take in:
 * what it says when it cuts something, what it never lets a repo put into it, and how a reader
 * takes a slice of it instead of all 350 counters.
 *
 *   - perFile is cut at 200 rows and says exactly what was left out
 *   - text that comes from the repo is clamped, so one hostile line cannot make the report huge
 *   - a key the repo chooses (a heading called "constructor", a value "__proto__") is a key
 *   - every published regex, pasted with its flags, finds what the counter counted
 *   - `audit counters --ids/--brief/--no-definitions/--no-per-file` slice the report, and say so
 *   - a group that cannot be loaded is an error, never a smaller report
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { makeRepo, removeRepo, run, get } = require("./helpers");
const { counter, validateReport, clampText, PER_FILE_LIMIT, MAX_DETAIL_TEXT, MAX_NOTE_TEXT } = require("../../../src/lib/counters/counter");
const { sliceReport, GROUPS } = require("../../../src/lib/counters");

const BIN = path.join(__dirname, "..", "..", "..", "bin", "cli.js");
const base = { id: "x.y", group: "x", kind: "mechanical", unit: "match", definition: { summary: "s", regex: null, fileSet: "f" } };

describe("report", () => {
  const roots = [];
  const repo = (files = {}) => {
    const root = makeRepo(files);
    roots.push(root);
    return root;
  };
  afterEach(() => roots.splice(0).forEach(removeRepo));

  describe("perFile is cut at 200 rows and says what it left out", () => {
    const rows = (n) => Array.from({ length: n }, (_, i) => ({ file: `src/f${String(i).padStart(4, "0")}.ts`, count: 1 }));

    test("exactly 200 files: nothing is cut; 201: perFileTotal, what the dropped rows hold, and a note", () => {
      const at = counter({ ...base, value: 200, perFile: rows(200) });
      expect(at.perFile).toHaveLength(PER_FILE_LIMIT);
      expect(at.perFileTotal).toBeUndefined();
      expect(at.perFileOmitted).toBeUndefined();

      const over = counter({ ...base, value: 205, perFile: [...rows(200), { file: "src/z-1.ts", count: 2 }, { file: "src/z-2.ts", count: 3 }].sort((a, b) => b.count - a.count) });
      expect(over.perFile).toHaveLength(PER_FILE_LIMIT);
      expect(over.perFileTotal).toBe(202);
      // the cut rows are the 2 smallest: two files of one hit each
      expect(over.perFileOmitted).toEqual({ files: 2, count: 2 });
      expect(over.perFile.reduce((a, r) => a + r.count, 0) + over.perFileOmitted.count).toBe(over.value);
      expect(over.notes.join(" ")).toMatch(/perFile lists the first 200 of 202 files; the other 2 hold 2/);
    });

    test("through a real run: 250 files with a colour each — rows plus the omitted count add up to the value", () => {
      const files = {};
      for (let i = 0; i < 250; i++) files[`src/f${String(i).padStart(3, "0")}.tsx`] = 'export const c = "#ff0000";\n';
      const report = run(repo(files), { dirs: ["src"], groups: ["colour"] });
      const c = get(report, "colour.hex6.outside_token_source");
      expect(c.value).toBe(250);
      expect(c.perFile).toHaveLength(200);
      expect(c.perFileTotal).toBe(250);
      expect(c.perFileOmitted).toEqual({ files: 50, count: 50 });
      expect(c.perFile.reduce((a, r) => a + r.count, 0) + c.perFileOmitted.count).toBe(c.value);
      expect(c.notes.join(" ")).toMatch(/the first 200 of 250 files/);
    });

    test("validateReport rejects a cut perFile that does not say what it cut", () => {
      const over = counter({ ...base, value: 201, perFile: rows(201) });
      const report = { schema: "systemix.audit-counters/1", countersVersion: "1.0.0", scope: {}, counters: [over] };
      expect(validateReport(report)).toEqual([]);
      const { perFileOmitted, ...without } = over; // eslint-disable-line no-unused-vars
      expect(validateReport({ ...report, counters: [without] })).toEqual(["counter x.y: perFileTotal needs a matching perFileOmitted"]);
    });
  });

  describe("text that comes from the repo is clamped", () => {
    test("a long string in detail, a key, a string value and a note are cut, with an ellipsis, and the counter says so", () => {
      const long = "é".repeat(5000);
      const c = counter({ ...base, unit: "string", value: long, detail: { text: long, nested: [{ deep: long }], [long]: 1, short: "ok" }, notes: [long, "fine"] });
      expect(c.value).toHaveLength(MAX_DETAIL_TEXT);
      expect(c.value.endsWith("…")).toBe(true);
      expect(c.detail.text).toHaveLength(MAX_DETAIL_TEXT);
      expect(c.detail.nested[0].deep).toHaveLength(MAX_DETAIL_TEXT);
      expect(Object.keys(c.detail).map((k) => k.length)).toEqual([4, 6, MAX_DETAIL_TEXT, 5]); // text, nested, the long key, short
      expect(c.detail.short).toBe("ok");
      expect(c.notes[0]).toHaveLength(MAX_NOTE_TEXT);
      expect(c.notes[1]).toBe("fine");
      expect(c.truncated).toBe(true);
      expect(counter({ ...base, value: 1, detail: { fine: "short" } }).truncated).toBeUndefined();
    });

    test("two keys that clamp alike stay two keys", () => {
      const a = "k".repeat(MAX_DETAIL_TEXT + 10) + "A";
      const b = "k".repeat(MAX_DETAIL_TEXT + 10) + "B";
      const c = counter({ ...base, value: 1, detail: { [a]: 1, [b]: 2 } });
      expect(Object.keys(c.detail)).toHaveLength(2);
      expect(Object.values(c.detail).sort()).toEqual([1, 2]);
    });

    test("a cut never splits a surrogate pair, and clamping a clamped text changes nothing", () => {
      const emoji = "😀".repeat(MAX_DETAIL_TEXT);
      const once = clampText(emoji, MAX_DETAIL_TEXT);
      expect(once.length).toBeLessThanOrEqual(MAX_DETAIL_TEXT);
      expect(once.endsWith("…")).toBe(true);
      expect(JSON.parse(JSON.stringify(once))).toBe(once); // no lone surrogate
      expect(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(once)).toBe(false);
      expect(clampText(once, MAX_DETAIL_TEXT)).toBe(once);
    });

    test("validateReport accepts a clamped counter (it clamps what it already clamped)", () => {
      const c = counter({ ...base, value: 1, detail: { text: "x".repeat(9000) } });
      expect(validateReport({ schema: "systemix.audit-counters/1", countersVersion: "1.0.0", scope: {}, counters: [c] })).toEqual([]);
    });
  });

  describe("a key the repo chooses is a key like any other", () => {
    test("guardrails sections called constructor, __proto__ and toString", () => {
      const report = run(repo({
        "design/guardrails.mdx": ["## constructor", "- a", "- b", "## __proto__", "- c", "## toString", "- d", "## hasOwnProperty", "- e", ""].join("\n"),
      }), { groups: ["guardrails"] });
      const bullets = get(report, "guardrails.structure.rule_bullets");
      expect(bullets.value).toBe(5);
      const bySection = JSON.parse(JSON.stringify(bullets.detail.bySection));
      expect(Object.keys(bySection).sort()).toEqual(["__proto__", "constructor", "hasOwnProperty", "toString"]);
      expect(bySection).toEqual({ constructor: 2, toString: 1, hasOwnProperty: 1, ["__proto__"]: 1 });
      expect(Object.values(bySection).reduce((a, b) => a + b, 0)).toBe(bullets.value); // the counts agree with the value
    });

    test("values of a tally: leading-[__proto__], leading-[constructor]", () => {
      const report = run(repo({ "src/a.tsx": 'x = "leading-[__proto__] leading-[constructor] leading-[constructor]";\n' }), { dirs: ["src"], groups: ["typography"] });
      const byValue = JSON.parse(JSON.stringify(get(report, "typography.leading_arbitrary.matches").detail.byValue));
      expect(Object.keys(byValue)).toEqual(["constructor", "__proto__"]);
      expect(byValue.constructor).toBe(2);
    });

    test("ADR status words and contract folders", () => {
      const report = run(repo({
        "decisions/ADR.md": "## ADR-001: a\nStatus: Accepted\n## ADR-002: b\nStatus: Accepted\n## ADR-003: c\nStatus: Proposed\n",
        "contract/constructor/x.mdx": "x\n",
        "contract/__proto__/y.mdx": "y\n",
      }), { groups: ["decisions", "docs"] });
      expect(get(report, "decisions.adr.status_lines").detail.byStatus).toEqual({ ACCEPTED: 2, PROPOSED: 1 });
      const byDir = JSON.parse(JSON.stringify(get(report, "docs.contract.files").detail.byDir));
      expect(byDir).toEqual({ ["contract/__proto__"]: 1, "contract/constructor": 1 });
    });
  });

  describe("every published regex, pasted with its flags, finds what the counter counted", () => {
    const files = {
      "src/a.tsx": [
        'export const a = <div className="bg-[#FFF] shadow-[0_0_0_1px_#ff0000] border-[1px_solid_#a8511a] text-[13px] text-[0.8125rem]" style={{ color: "rgba(0,0,0,.5)", width: "12px" }} />;',
        "const b = hsl(10 20% 30%); const c = oklch(0.5 0.1 20); const url = 'url(#abc)'; const e = '&#123;';",
        "",
      ].join("\n"),
      "src/b.ts": "export const t = 'text-[11px] leading-[1.2] tracking-[0.1em] #12345678 #abc';\n",
      "design/tokens.css": ":root { --a: #fff; --font-size-sm: 13px; --c: 3; --d: 4; --e: 5; }\n",
    };
    const text = (rel) => fs.readFileSync(path.join(roots[0], rel), "utf8");

    /** Σ matches of the counter's published pattern(s), each run with its published flags, over the given files. */
    const reproduce = (c, rels) => {
      const patterns = c.definition.regexes ?? [{ regex: c.definition.regex, flags: c.definition.flags }];
      let n = 0;
      for (const p of patterns) {
        const flags = p.flags.includes("g") ? p.flags : p.flags + "g";
        for (const rel of rels) n += [...text(rel).matchAll(new RegExp(p.regex, flags))].length;
      }
      return n;
    };

    test("scanner counters: colour hits (two patterns, the finding's 3-instead-of-113 case), px hits, hex6 and hex_scanner", () => {
      const root = repo(files);
      const report = run(root, { dirs: ["src"], groups: ["colour", "typography", "tokens"] });
      const all = ["src/a.tsx", "src/b.ts"];
      const colour = get(report, "colour.scanner.colour_hits");
      expect(colour.definition.regex).toBeNull();
      expect(colour.definition.regexes).toHaveLength(2);
      expect(reproduce(colour, all)).toBe(colour.value);
      expect(colour.value).toBe(8); // #FFF #ff0000 #a8511a #12345678 #abc  +  rgba( hsl( oklch(
      expect(reproduce(get(report, "colour.scanner.px_hits"), all)).toBe(get(report, "colour.scanner.px_hits").value);
      expect(reproduce(get(report, "colour.hex_scanner.outside_token_source"), all)).toBe(get(report, "colour.hex_scanner.outside_token_source").value);
      expect(reproduce(get(report, "colour.hex6.outside_token_source"), all)).toBe(get(report, "colour.hex6.outside_token_source").value);
      expect(reproduce(get(report, "typography.arbitrary_size.matches"), all)).toBe(get(report, "typography.arbitrary_size.matches").value);
      expect(reproduce(get(report, "typography.leading_arbitrary.matches"), all)).toBe(1);
      expect(reproduce(get(report, "tokens.hex.literals"), ["design/tokens.css"])).toBe(get(report, "tokens.hex.literals").value);
      expect(reproduce(get(report, "tokens.oklch.occurrences"), ["design/tokens.css"])).toBe(get(report, "tokens.oklch.occurrences").value);
    });

    test("the regex a flag-sensitive counter publishes carries the flag it needs (case-insensitive hex needs i)", () => {
      const report = run(repo({ "src/a.tsx": 'x = "#FFF #ABCDEF";\n', "design/tokens.css": ":root{--a:1;--b:2;--c:3;--d:4;--e:5}" }), { dirs: ["src"], groups: ["colour"] });
      const d = get(report, "colour.hex_scanner.outside_token_source").definition;
      expect(d.flags).toContain("i");
      const without = [...'x = "#FFF #ABCDEF";'.matchAll(new RegExp(d.regex, d.flags.replace("i", "")))].length;
      const withFlags = [...'x = "#FFF #ABCDEF";'.matchAll(new RegExp(d.regex, d.flags))].length;
      expect([without, withFlags]).toEqual([0, 2]);
    });
  });

  describe("slicing the report", () => {
    const files = { "src/a.tsx": 'export const a = "#ff0000";\n', "design/tokens.css": ":root { --a: 1; --b: 2; --c: 3; --d: 4; --e: 5; }\n" };
    const sx = (root, ...args) => spawnSync(process.execPath, [BIN, "audit", "counters", ...args], { cwd: root, encoding: "utf8", timeout: 60000 });

    test("--ids takes an id or a dotted prefix; the slice says what it is a slice of", () => {
      const report = run(repo(files), { dirs: ["src"] });
      const { report: slice, unmatched } = sliceReport(report, { ids: ["colour.hex6", "tokens.source.path"] });
      expect(unmatched).toEqual([]);
      expect(slice.counters.map((c) => c.id)).toEqual(report.counters.filter((c) => c.id.startsWith("colour.hex6.") || c.id === "tokens.source.path").map((c) => c.id));
      expect(slice.counters.length).toBeGreaterThan(3);
      expect(slice.slice).toMatchObject({ ids: ["colour.hex6", "tokens.source.path"], brief: false, definitions: true, perFile: true, of: report.counters.length });
      expect(slice.counters[0].definition).toBeDefined();
      expect(slice.schema).toBe(report.schema);
      expect(slice.warnings).toEqual(report.warnings);
    });

    test("a selector is a whole segment: colour.hex does not select colour.hex6 or colour.hex_scanner", () => {
      const report = run(repo(files), { dirs: ["src"] });
      const { report: slice, unmatched } = sliceReport(report, { ids: ["colour.hex"] });
      expect(slice.counters).toEqual([]);
      expect(unmatched).toEqual(["colour.hex"]);
    });

    test("--brief keeps id, unit, value, and a ratio's numerator and denominator — nothing else", () => {
      const report = run(repo(files), { dirs: ["src"] });
      const { report: slice } = sliceReport(report, { brief: true });
      expect(slice.counters).toHaveLength(report.counters.length);
      for (const row of slice.counters) expect(Object.keys(row).sort()).toEqual(row.unit === "ratio" ? ["detail", "id", "unit", "value"] : ["id", "unit", "value"]);
      const ratio = slice.counters.find((c) => c.unit === "ratio");
      expect(Object.keys(ratio.detail).sort()).toEqual(["denominator", "numerator"]);
      expect(JSON.stringify(slice).length).toBeLessThan(JSON.stringify(report).length / 8);
      expect(slice.slice).toMatchObject({ brief: true, definitions: false, perFile: false });
    });

    test("--no-definitions and --no-per-file each drop their part, separately", () => {
      const report = run(repo(files), { dirs: ["src"] });
      const noDef = sliceReport(report, { definitions: false }).report;
      expect(noDef.counters.every((c) => c.definition === undefined)).toBe(true);
      expect(noDef.counters.some((c) => c.perFile !== undefined)).toBe(true);
      const noRows = sliceReport(report, { perFile: false }).report;
      expect(noRows.counters.every((c) => c.perFile === undefined && c.perFileTotal === undefined && c.perFileOmitted === undefined)).toBe(true);
      expect(noRows.counters.every((c) => c.definition !== undefined)).toBe(true);
      expect(JSON.stringify(sliceReport(report, { definitions: false, perFile: false }).report).length).toBeLessThan(JSON.stringify(report).length * 0.6);
    });

    test("the command: --ids prints the slice on stdout, an id that matches nothing is an error, --summary still sees the full report", () => {
      const root = repo(files);
      const ok = sx(root, "--dirs", "src", "--ids", "tokens.source.path,colour.scanner", "--brief");
      expect(ok.status).toBe(0);
      const slice = JSON.parse(ok.stdout);
      expect(slice.counters.map((c) => c.id)).toEqual(expect.arrayContaining(["tokens.source.path", "colour.scanner.colour_hits", "colour.scanner.px_hits"]));
      expect(slice.counters.every((c) => c.id.startsWith("tokens.source.path") || c.id.startsWith("colour.scanner."))).toBe(true);
      expect(slice.slice.brief).toBe(true);

      const bad = sx(root, "--dirs", "src", "--ids", "colour.scanner,nope.such");
      expect(bad.status).toBe(1);
      expect(bad.err ?? bad.stderr).toMatch(/no counter matches nope\.such/);
      expect(bad.stdout).toBe("");

      const summary = sx(root, "--dirs", "src", "--summary", "--ids", "colour.scanner");
      expect(summary.status).toBe(0);
      expect(summary.stdout).toMatch(/\ncensus \(13\)\n/); // the table is of the whole report
    });

    test("--out writes the slice and reports its size", () => {
      const root = repo(files);
      const out = path.join(root, "slice.json");
      const r = sx(root, "--dirs", "src", "--groups", "census", "--no-per-file", "--no-definitions", "--out", out);
      expect(r.status).toBe(0);
      const written = JSON.parse(fs.readFileSync(out, "utf8"));
      expect(written.slice).toMatchObject({ perFile: false, definitions: false });
      expect(r.stderr).toMatch(/wrote .*slice\.json — 13 counters/);
    });
  });

  describe("a group that cannot be loaded is an error, not a smaller report", () => {
    test("runCounters throws when a listed group fails to load; --groups leaves the others out and says so", () => {
      jest.resetModules();
      jest.doMock("../../../src/lib/counters/scale", () => {
        throw Object.assign(new Error("Cannot find module './scale' (a broken install)"), { code: "MODULE_NOT_FOUND" });
      });
      try {
        const { runCounters } = require("../../../src/lib/counters");
        const root = repo({ "src/a.ts": "export {};\n" });
        expect(() => runCounters(root, { dirs: ["src"] })).toThrow(/Cannot find module '\.\/scale'/);
        const some = runCounters(root, { dirs: ["src"], groups: ["census", "tokens"] });
        expect(some.groups.run).toEqual(["census", "tokens"]);
        expect(some.groups.skipped).toEqual(GROUPS.filter((g) => g !== "census" && g !== "tokens"));
        expect(some.groups).not.toHaveProperty("missing");
      } finally {
        jest.dontMock("../../../src/lib/counters/scale");
        jest.resetModules();
      }
    });

    test("the command exits 1 with the reason on stderr and nothing on stdout", async () => {
      jest.resetModules();
      jest.doMock("../../../src/lib/counters/scale", () => {
        throw Object.assign(new Error("Cannot find module './scale'"), { code: "MODULE_NOT_FOUND" });
      });
      const logs = [];
      const errs = [];
      const log = jest.spyOn(console, "log").mockImplementation((...a) => logs.push(a.join(" ")));
      const err = jest.spyOn(console, "error").mockImplementation((...a) => errs.push(a.join(" ")));
      const prior = process.exitCode;
      try {
        const { audit } = require("../../../src/commands/audit");
        const result = await audit(["counters", "--dirs", "src"], { projectRoot: repo({ "src/a.ts": "export {};\n" }) });
        expect(result).toBeNull();
        expect(process.exitCode).toBe(1);
        expect(logs).toEqual([]);
        expect(errs.join("\n")).toContain("Cannot find module './scale'");
      } finally {
        process.exitCode = prior;
        log.mockRestore();
        err.mockRestore();
        jest.dontMock("../../../src/lib/counters/scale");
        jest.resetModules();
      }
    });
  });

  test("a report too big to read whole says so, and names the way out; a small one does not", () => {
    const root = repo({ "src/a.tsx": 'export const a = "#ff0000";\n' });
    const small = run(root, { dirs: ["src"] });
    expect(small.warnings.some((w) => /over 5 MB/.test(w))).toBe(false);
    const big = run(root, { dirs: ["src"], warnReportBytes: 1000 });
    const warning = big.warnings.find((w) => /^this report is over 5 MB/.test(w));
    expect(warning).toMatch(/--ids, --brief, --no-per-file, --no-definitions/);
    expect({ ...big, warnings: small.warnings }).toEqual(small); // the warning is the only difference
  });
});
