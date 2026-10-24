/**
 * decisions.test.js — acceptance tests for the `decisions` counters: ADR facts
 * (headings, statuses, dates, ages to the HEAD commit date, mentions) and
 * DESIGN.md facts (lines, H2s, bytes, front-matter colours against the token
 * source, generator-script output). Every expectation is hand-computed from a
 * tiny temp repo (never from the live repo); an empty repo must degrade to
 * 0 / false / null with notes.
 */

"use strict";

const path = require("path");
const { makeRepo, removeRepo, run } = require("./helpers");
const { createContext } = require("../../../src/lib/counters/context");
const decisions = require("../../../src/lib/counters/decisions");

const HEAD = "2026-10-11T12:00:00+00:00";
const lines = (...l) => l.join("\n") + "\n";
const lineCount = (text) => text.split("\n").length - 1;

const ADR = lines(
  "# Architecture Decision Records",
  "",
  "Preamble mentions guardrails once.",
  "",
  "## ADR-001: First",
  "**Date:** 2026-04-06",
  "**Status:** DECIDED",
  "",
  "Body mentions Guardrails and oklch.",
  "",
  "```md",
  "## ADR-999: fake inside a fence",
  "Status: IGNORED",
  "```",
  "",
  "## ADR-002: Second",
  "**Date:** 2026-06-19",
  "**Status:** PROPOSED (maybe)",
  "",
  "The TVA rebrand is discussed.",
  "",
  "## ADR-004: Fourth",
  "Status: superseded",
  "Date: 2026-02-30",
);
const OTHER = lines("## ADR-001: Duplicate id elsewhere", "**Date:** 2026-05-01", "**Status:** Accepted");

describe("decisions counters", () => {
  const roots = [];
  const repo = (files) => {
    const root = makeRepo(files);
    roots.push(root);
    return root;
  };
  afterEach(() => roots.splice(0).forEach(removeRepo));

  /** The decisions counters of `root` with a chosen HEAD commit date (null = no git). */
  const counters = (root, commitDate = HEAD, opts = { dirs: ["src"] }) => {
    const ctx = createContext(root, opts);
    const list = decisions.run({ ...ctx, git: { commit: commitDate ? "abc" : null, commitDate, dirty: false } });
    const byId = Object.fromEntries(list.map((c) => [c.id, c]));
    return { list, byId, v: (id) => byId[id].value, c: (id) => byId[id] };
  };

  describe("decision records", () => {
    const files = { "decisions/ADR.md": ADR, "design/decisions/other.md": OTHER };

    test("headings, statuses, dates and ids are hand-countable; fenced headings are ignored", () => {
      const { v, c } = counters(repo(files));
      expect(v("decisions.files.count")).toBe(2);
      expect(v("decisions.files.lines")).toBe(lineCount(ADR) + lineCount(OTHER)); // 24 + 3
      expect(v("decisions.files.bytes")).toBe(Buffer.byteLength(ADR) + Buffer.byteLength(OTHER));
      expect(c("decisions.files.lines").perFile).toEqual([
        { file: "decisions/ADR.md", count: 24 },
        { file: "design/decisions/other.md", count: 3 },
      ]);

      // ADR-001, 002, 004 in ADR.md + the duplicate ADR-001 in other.md; "## ADR-999" sits inside a fence
      expect(v("decisions.adr.headings")).toBe(4);
      expect(c("decisions.adr.headings").perFile).toEqual([
        { file: "decisions/ADR.md", count: 3 },
        { file: "design/decisions/other.md", count: 1 },
      ]);
      // DECIDED, PROPOSED, superseded, Accepted (the fenced "Status: IGNORED" is not counted)
      expect(v("decisions.adr.status_lines")).toBe(4);
      expect(c("decisions.adr.status_lines").detail.byStatus).toEqual({ ACCEPTED: 1, DECIDED: 1, PROPOSED: 1, SUPERSEDED: 1 });
      expect(v("decisions.adr.without_status")).toBe(0);

      // ADR-004's date is not a real calendar date (Feb 30) → undated
      expect(v("decisions.adr.dated")).toBe(3);
      expect(v("decisions.adr.without_date")).toBe(1);
      expect(c("decisions.adr.without_date").detail.adrs).toEqual(["ADR-004"]);
      expect(c("decisions.adr.dated").notes.join(" ")).toMatch(/not a real calendar date/);
      expect(v("decisions.adr.first_date")).toBe("2026-04-06");
      expect(v("decisions.adr.last_date")).toBe("2026-06-19");
      expect(c("decisions.adr.last_date").detail.adr).toBe("ADR-002");

      // ids 1, 2, 4, 1: max 4; 3 is missing; id 1 is used twice
      expect(v("decisions.adr.id_max")).toBe(4);
      expect(v("decisions.adr.id_gaps")).toBe(1);
      expect(v("decisions.adr.id_duplicates")).toBe(1);
      expect(c("decisions.adr.id_duplicates").detail.ids).toEqual(["1"]);
    });

    test("age is calendar days from the newest ADR to the HEAD commit date, never to today", () => {
      // 2026-06-19 → 2026-10-11: 11 (rest of June) + 31 + 31 + 30 + 11 = 114
      expect(counters(repo(files), HEAD).v("decisions.adr.newest_age_days")).toBe(114);
      // the UTC date decides, not the offset: 2026-10-11T23:30:00-05:00 is 2026-10-12T04:30Z → 115
      expect(counters(repo(files), "2026-10-11T23:30:00-05:00").v("decisions.adr.newest_age_days")).toBe(115);
      const none = counters(repo(files), null);
      expect(none.v("decisions.adr.newest_age_days")).toBeNull();
      expect(none.c("decisions.adr.newest_age_days").notes[0]).toMatch(/no git history/);
      expect(none.v("decisions.adr.last_date")).toBe("2026-06-19"); // the facts that need no clock are still reported
    });

    test("an ISO date-time after Date: still reads as a date", () => {
      const { v } = counters(repo({ "decisions/a.md": lines("## ADR-001: x", "Date: 2026-01-02T10:00:00Z", "Status: Accepted") }));
      expect(v("decisions.adr.first_date")).toBe("2026-01-02");
    });

    test("status formats: bold, bullet, quote and tight colon are all status lines", () => {
      const { v, c } = counters(repo({
        "decisions/a.md": lines(
          "## ADR-001: a", "- **Status**: Accepted",
          "## ADR-002: b", "> Status: Draft",
          "## ADR-003: c", "Status:Done",
          "## ADR-004: d", "status quo is not a status line",
        ),
      }));
      expect(v("decisions.adr.status_lines")).toBe(3);
      expect(c("decisions.adr.status_lines").detail.byStatus).toEqual({ ACCEPTED: 1, DONE: 1, DRAFT: 1 });
      expect(v("decisions.adr.without_status")).toBe(1);
      expect(c("decisions.adr.without_status").detail.adrs).toEqual(["ADR-004"]);
    });

    test("mentions: sections vs raw matches, case-insensitively, code fences included", () => {
      const { v, c } = counters(repo(files));
      // "guardrails" appears in the preamble (outside every ADR) and in ADR-001's body:
      // 2 raw matches in the file set, 1 ADR section
      expect(v("decisions.files.guardrails_mentions")).toBe(2);
      expect(c("decisions.files.guardrails_mentions").perFile).toEqual([{ file: "decisions/ADR.md", count: 2 }]);
      expect(v("decisions.adr.mentioning_guardrails")).toBe(1);
      expect(c("decisions.adr.mentioning_guardrails").detail.adrs).toEqual(["ADR-001"]);
      expect(v("decisions.adr.mentioning_rebrand")).toBe(1); // "TVA rebrand" in ADR-002 (one section, two matches)
      expect(c("decisions.adr.mentioning_rebrand").detail.adrs).toEqual(["ADR-002"]);
      expect(v("decisions.adr.mentioning_oklch")).toBe(1);
    });

    test("CRLF files read the same as LF", () => {
      const crlf = (s) => s.replace(/\n/g, "\r\n");
      const a = counters(repo(files));
      const b = counters(repo({ "decisions/ADR.md": crlf(ADR), "design/decisions/other.md": crlf(OTHER) }));
      const pick = (x) => x.list.filter((c) => c.id !== "decisions.files.bytes").map((c) => [c.id, c.value]);
      expect(pick(b)).toEqual(pick(a));
    });

    test("a repo with only a decisions/ file that has no ADR headings reports files but 0 ADRs", () => {
      const { v } = counters(repo({ "decisions/README.md": "# Decisions\n\nnothing here\n" }));
      expect(v("decisions.files.count")).toBe(1);
      expect(v("decisions.adr.headings")).toBe(0);
      expect(v("decisions.adr.id_max")).toBe(0);
      expect(v("decisions.adr.first_date")).toBeNull();
    });

    test("thousands of ADRs are read in bounded time", () => {
      const big = Array.from({ length: 20000 }, (_, i) => `## ADR-${String(i + 1).padStart(5, "0")}: t\n**Date:** 2026-01-01\n**Status:** DECIDED\n`).join("\n");
      const start = Date.now();
      const { v } = counters(repo({ "decisions/big.md": big }));
      expect(Date.now() - start).toBeLessThan(3000);
      expect(v("decisions.adr.headings")).toBe(20000);
      expect(v("decisions.adr.id_max")).toBe(20000);
      expect(v("decisions.adr.id_gaps")).toBe(0);
    });
  });

  describe("decision records: edge cases", () => {
    const adr = (...l) => ({ "decisions/ADR.md": lines(...l) });

    test("an id that is a date or a timestamp costs nothing: id_gaps is arithmetic, not a loop over the range", () => {
      const start = Date.now();
      const { v, c } = counters(repo(adr("## ADR-202604061200", "Status: x", "Date: 2026-01-01")));
      expect(Date.now() - start).toBeLessThan(2000);
      expect(v("decisions.adr.id_max")).toBe(202604061200);
      expect(v("decisions.adr.id_gaps")).toBe(202604061199); // every integer in 1..id_max but the one used
      expect(c("decisions.adr.id_gaps").notes.join(" ")).toMatch(/look like dates or timestamps/);
      expect(c("decisions.adr.id_max").notes).toBeUndefined();
    });

    test("id 0 is outside 1..id_max: ids 0 and 3 leave 1 and 2 unused", () => {
      const { v } = counters(repo(adr("## ADR-0: zero", "## ADR-3: three")));
      expect(v("decisions.adr.id_max")).toBe(3);
      expect(v("decisions.adr.id_gaps")).toBe(2);
    });

    test("an id above the safe-integer range is not a number: left out of the id counters and counted in a note", () => {
      const { v, c } = counters(repo(adr("## ADR-99999999999999999999: huge", "Status: x", "## ADR-9007199254740993: edge", "## ADR-2: ok")));
      expect(v("decisions.adr.headings")).toBe(3);
      expect(v("decisions.adr.id_max")).toBe(2);
      expect(v("decisions.adr.id_gaps")).toBe(1);
      expect(c("decisions.adr.id_max").notes.join(" ")).toMatch(/2 ADR heading\(s\) have an id above 9007199254740991/);
      expect(c("decisions.adr.without_date").detail.adrs).toEqual(["ADR-99999999999999999999", "ADR-9007199254740993", "ADR-002"]);
    });

    test("a sub-heading (###) inside an ADR does not end its section: status, date and mentions after it still belong to it", () => {
      const { v } = counters(repo(adr(
        "## ADR-001: a",
        "### Context",
        "Status: Accepted",
        "Date: 2026-01-01",
        "Body mentions Guardrails.",
        "### Consequences",
        "Mentions oklch.",
        "## ADR-002: b",
        "Nothing here.",
      )));
      expect(v("decisions.adr.status_lines")).toBe(1);
      expect(v("decisions.adr.dated")).toBe(1);
      expect(v("decisions.adr.mentioning_guardrails")).toBe(1);
      expect(v("decisions.adr.mentioning_oklch")).toBe(1);
      expect(v("decisions.adr.without_status")).toBe(1); // ADR-002
    });

    test("the rebrand terms are TVA (a whole word), rebrand / re-brand and Amber Mainframe", () => {
      const { v, c } = counters(repo(adr(
        "## ADR-001: a", "The Amber Mainframe palette.",
        "## ADR-002: b", "A re-brand happened.",
        "## ADR-003: c", "Nothing about it: statvat is not the word.",
        "## ADR-004: d", "TVA.",
      )));
      expect(v("decisions.adr.mentioning_rebrand")).toBe(3);
      expect(c("decisions.adr.mentioning_rebrand").detail.adrs).toEqual(["ADR-001", "ADR-002", "ADR-004"]);
      // Amber Mainframe alone is enough
      expect(counters(repo(adr("## ADR-001: a", "The Amber Mainframe palette."))).v("decisions.adr.mentioning_rebrand")).toBe(1);
    });

    test("a decision file over the 5 MB read cap says so, and is not blamed on the layout", () => {
      const big = "x".repeat(5 * 1024 * 1024 + 10);
      const only = counters(repo({ "decisions/ADR.md": big }));
      expect(only.v("decisions.files.count")).toBe(1);
      expect(only.v("decisions.files.lines")).toBe(0);
      expect(only.v("decisions.adr.headings")).toBe(0);
      for (const id of ["decisions.files.lines", "decisions.adr.headings", "decisions.adr.id_max"]) {
        expect(only.c(id).notes.join(" ")).toMatch(/5 MB read cap and not read: decisions\/ADR\.md/);
      }
      expect(only.c("decisions.adr.headings").notes.join(" ")).not.toMatch(/none has a "## ADR-" heading/);

      // another, readable file with no ADR headings keeps the layout note
      const mixed = counters(repo({ "decisions/ADR.md": big, "decisions/README.md": "# Decisions\n" }));
      expect(mixed.c("decisions.adr.headings").notes.join(" ")).toMatch(/5 MB read cap/);
      expect(mixed.c("decisions.adr.headings").notes.join(" ")).toMatch(/none has a "## ADR-" heading/);
    });
  });

  describe("DESIGN.md", () => {
    const design = lines(
      "---",
      "title: X",
      "colors:",
      '  background: "#16100A"',
      '  foreground: "#efe5d3"',
      '  primary: "#abc"',
      '  ghost: "#123456"',
      '  accent: "var(--zzz)"',
      '  odd: "#0f0"',
      "---",
      "",
      "# Title",
      "",
      "## One",
      "",
      "```css",
      "## fake",
      "```",
      "",
      "## Two",
    );
    const tokens = lines(
      ":root { --background: #ECE3CB; --foreground: #16100A; --primary: #AABBCC; --odd: #0F0; --accent: #fff; --zzz: #fff; }",
      ".dark { --background: #16100a; --foreground: #EFE5D3; }",
    );

    test("lines, bytes, H2s (fenced ## excluded) and the front-matter colours", () => {
      const { v, c } = counters(repo({ "design/DESIGN.md": design, "design/tokens.css": tokens }));
      expect(v("decisions.design_md.exists")).toBe(true);
      expect(v("decisions.design_md.lines")).toBe(20);
      expect(v("decisions.design_md.bytes")).toBe(Buffer.byteLength(design));
      expect(v("decisions.design_md.h2")).toBe(2);
      expect(v("decisions.design_md.front_matter")).toBe(true);
      expect(v("decisions.design_md.front_matter_colors")).toBe(6);
      expect(c("decisions.design_md.front_matter_colors").detail.names).toEqual(["background", "foreground", "primary", "ghost", "accent", "odd"]);
    });

    test("colours vs the .dark theme: the dark block wins, :root is inherited, hex is case/3-digit normalised, a missing property is not a mismatch", () => {
      const { v, c } = counters(repo({ "design/DESIGN.md": design, "design/tokens.css": tokens }));
      // equal: background (.dark #16100a), foreground (.dark #EFE5D3), primary (inherited #AABBCC = #abc), odd (inherited #0F0 = #0f0)
      expect(v("decisions.design_md.colors_equal_dark")).toBe(4);
      expect(c("decisions.design_md.colors_equal_dark").detail.inheritedFromRoot).toBe(2);
      // accent: front matter says var(--zzz), the token is #fff → different strings
      expect(v("decisions.design_md.colors_mismatch_dark")).toBe(1);
      expect(c("decisions.design_md.colors_mismatch_dark").detail.rows[0]).toMatchObject({ name: "accent", designValue: "var(--zzz)", tokenValue: "#fff", status: "mismatch" });
      // ghost has no --ghost / --color-ghost
      expect(v("decisions.design_md.colors_missing_dark")).toBe(1);
      expect(c("decisions.design_md.colors_missing_dark").detail.rows.map((r) => r.name)).toEqual(["ghost"]);
    });

    test("colours vs the light theme (:root)", () => {
      const { v } = counters(repo({ "design/DESIGN.md": design, "design/tokens.css": tokens }));
      // equal: primary, odd; mismatch: background (#ECE3CB vs #16100A), foreground, accent; missing: ghost
      expect(v("decisions.design_md.colors_equal_light")).toBe(2);
      expect(v("decisions.design_md.colors_mismatch_light")).toBe(3);
      expect(v("decisions.design_md.colors_missing_light")).toBe(1);
    });

    test("--color-<name> in @theme is found and var(--x) is followed", () => {
      const { v } = counters(repo({
        "design/DESIGN.md": lines("---", "colors:", '  surface: "#112233"', "---"),
        "design/tokens.css": lines("@theme inline { --color-surface: var(--panel); }", ":root { --panel: #112233; }"),
      }));
      expect(v("decisions.design_md.colors_equal_light")).toBe(1);
      expect(v("decisions.design_md.colors_equal_dark")).toBe(1);
    });

    test("no token source: every colour is missing, with a note, never a crash", () => {
      const { v, c } = counters(repo({ "design/DESIGN.md": design }));
      expect(v("decisions.design_md.colors_equal_dark")).toBe(0);
      expect(v("decisions.design_md.colors_mismatch_dark")).toBe(0);
      expect(v("decisions.design_md.colors_missing_dark")).toBe(6);
      expect(c("decisions.design_md.colors_missing_dark").notes.join(" ")).toMatch(/no token source/);
    });

    test("a root DESIGN.md is read when design/DESIGN.md does not exist, and says so", () => {
      const { v, c } = counters(repo({ "DESIGN.md": "# Root\n\n## A\n" }));
      expect(v("decisions.design_md.exists")).toBe(true);
      expect(v("decisions.design_md.lines")).toBe(3);
      expect(v("decisions.design_md.h2")).toBe(1);
      expect(c("decisions.design_md.exists").detail.path).toBe("DESIGN.md");
      expect(c("decisions.design_md.lines").notes[0]).toMatch(/root DESIGN\.md was read/);
    });

    test("DESIGN.md with no front matter has no colours to compare", () => {
      const { v, c } = counters(repo({ "design/DESIGN.md": "# Just a doc\n" }));
      expect(v("decisions.design_md.front_matter")).toBe(false);
      expect(v("decisions.design_md.front_matter_colors")).toBe(0);
      expect(c("decisions.design_md.front_matter_colors").notes.join(" ")).toMatch(/no colors: block/);
    });
  });

  describe("DESIGN.md: edge cases", () => {
    test("H2 follows the stated rule: column 0 and a non-empty title", () => {
      const { v, c } = counters(repo({ "design/DESIGN.md": lines("# T", "", "## Real", "", " ## indented", "", "## ", "", "##\tTab", "", "### Deep") }));
      expect(v("decisions.design_md.h2")).toBe(2);
      expect(c("decisions.design_md.h2").definition.regex).toBe("^##[ \\t]+\\S");
    });

    test("a DESIGN.md over the 5 MB read cap says so instead of reporting 0 lines silently", () => {
      const { v, c } = counters(repo({ "design/DESIGN.md": "x".repeat(5 * 1024 * 1024 + 10) }));
      expect(v("decisions.design_md.exists")).toBe(true);
      expect(v("decisions.design_md.lines")).toBe(0);
      for (const id of ["decisions.design_md.exists", "decisions.design_md.lines", "decisions.design_md.bytes", "decisions.design_md.h2"]) {
        expect(c(id).notes.join(" ")).toMatch(/5 MB read cap and not read: design\/DESIGN\.md/);
      }
    });
  });

  describe("generator scripts", () => {
    const gen = lines(
      'import { writeFileSync } from "fs";',
      'import { join } from "path";',
      'const ROOT = join(__dirname, "..");',
      'const OUT_PATH = join(ROOT, "DESIGN.md");',
      'writeFileSync(OUT_PATH, "x", "utf8");',
    );

    test("a script whose output DESIGN.md does not exist is a generator with a missing output", () => {
      const { v, c } = counters(repo({ "scripts/gen.ts": gen }));
      expect(v("decisions.design_md.generator_scripts")).toBe(1);
      expect(v("decisions.design_md.generator_outputs_missing")).toBe(1);
      expect(v("decisions.design_md.generator_output_exists")).toBe(false);
      expect(c("decisions.design_md.generator_scripts").detail.generators).toEqual([
        { script: "scripts/gen.ts", lines: 5, outputs: [{ output: "DESIGN.md", exists: false }] },
      ]);
      expect(c("decisions.design_md.generator_outputs_missing").detail.missing).toEqual([{ script: "scripts/gen.ts", output: "DESIGN.md" }]);
    });

    test("once the output exists the flag flips", () => {
      const { v } = counters(repo({ "scripts/gen.ts": gen, "DESIGN.md": "# built\n" }));
      expect(v("decisions.design_md.generator_scripts")).toBe(1);
      expect(v("decisions.design_md.generator_outputs_missing")).toBe(0);
      expect(v("decisions.design_md.generator_output_exists")).toBe(true);
    });

    test("inline join(), string literals and __dirname-relative paths resolve; other writers and unresolvable paths do not make a generator", () => {
      const { v, c } = counters(repo({
        "scripts/inline.js": 'const path = require("path");\nconst ROOT = path.resolve(__dirname, "..");\nfs.writeFileSync(path.join(ROOT, "docs", "DESIGN.md"), x);\n',
        "scripts/literal.mjs": 'writeFile("out/DESIGN.md", x);\n',
        "scripts/here.js": 'writeFileSync(join(__dirname, "DESIGN.md"), x);\n',
        "scripts/notes.ts": '// DESIGN.md is documented elsewhere\nwriteFileSync(join(ROOT, "NOTES.md"), x);\n',
        "scripts/dynamic.ts": "// writes DESIGN.md\nwriteFileSync(somethingDynamic(), x);\n",
        "scripts/deep/nested.ts": 'writeFileSync(join(ROOT, "DESIGN.md"), x);\n', // not a direct child of scripts/
        "docs/DESIGN.md": "built\n",
      }));
      const generators = c("decisions.design_md.generator_scripts").detail.generators;
      expect(generators.map((g) => [g.script, g.outputs.map((o) => [o.output, o.exists])])).toEqual([
        ["scripts/here.js", [["scripts/DESIGN.md", false]]],
        ["scripts/inline.js", [["docs/DESIGN.md", true]]],
        ["scripts/literal.mjs", [["out/DESIGN.md", false]]],
      ]);
      expect(v("decisions.design_md.generator_scripts")).toBe(3);
      expect(v("decisions.design_md.generator_outputs_missing")).toBe(2);
      expect(v("decisions.design_md.generator_output_exists")).toBe(false);
      expect(c("decisions.design_md.generator_scripts").notes.join(" ")).toMatch(/2 script\(s\) mention DESIGN\.md/);
    });

    test("an identifier is resolved from its own declaration, never assumed to be the repo root", () => {
      const { v, c } = counters(repo({
        "DESIGN.md": "hand written\n",
        "docs/DESIGN.md": "built\n",
        // ROOT is the build/ directory, so this writes build/DESIGN.md, not the hand-written root DESIGN.md
        "scripts/build.ts": 'const ROOT = join(__dirname, "..", "build");\nwriteFileSync(join(ROOT, "DESIGN.md"), x);\n',
        // a chain of declarations
        "scripts/chain.js": 'const ROOT = join(__dirname, "..");\nconst OUT_DIR = join(ROOT, "docs");\nconst OUT = join(OUT_DIR, "DESIGN.md");\nwriteFileSync(OUT, x);\n',
        // process.cwd() is read as the repo root, declared or written inline
        "scripts/cwd.js": 'const ROOT = process.cwd();\nwriteFileSync(join(ROOT, "DESIGN.md"), x);\n',
        "scripts/cwd2.js": 'writeFileSync(join(process.cwd(), "DESIGN.md"), x);\n',
        // not resolvable: argv, no declaration, a template, a declaration that does not end the statement
        "scripts/argv.js": 'const root = process.argv[2];\nfs.writeFileSync(path.join(root, "DESIGN.md"), x);\n',
        "scripts/undeclared.js": 'fs.writeFileSync(path.join(ROOT, "DESIGN.md"), x);\n',
        "scripts/template.js": "fs.writeFileSync(`${out}/DESIGN.md`, x);\n",
        "scripts/suffix.js": 'const OUT = join(__dirname, "..", "DESIGN.md") + ".bak";\nwriteFileSync(OUT, x);\n',
      }));
      const generators = c("decisions.design_md.generator_scripts").detail.generators;
      expect(generators.map((g) => [g.script, g.outputs.map((o) => [o.output, o.exists])])).toEqual([
        ["scripts/build.ts", [["build/DESIGN.md", false]]],
        ["scripts/chain.js", [["docs/DESIGN.md", true]]],
        ["scripts/cwd.js", [["DESIGN.md", true]]],
        ["scripts/cwd2.js", [["DESIGN.md", true]]],
      ]);
      expect(v("decisions.design_md.generator_scripts")).toBe(4);
      expect(v("decisions.design_md.generator_outputs_missing")).toBe(1);
      expect(v("decisions.design_md.generator_output_exists")).toBe(false);
      expect(c("decisions.design_md.generator_scripts").notes.join(" ")).toMatch(/4 script\(s\) mention DESIGN\.md/);
    });

    test("declarations that loop, that conflict, or that reset to an absolute path resolve to nothing instead of guessing", () => {
      const { v, c } = counters(repo({
        "DESIGN.md": "hand written\n",
        // a cycle must not recurse forever
        "scripts/cycle.js": 'const A = join(B, "x");\nconst B = join(A, "y");\nwriteFileSync(join(A, "DESIGN.md"), x);\n',
        // the same name declared twice with different values (two scopes): ambiguous
        "scripts/twice.js": 'function a() { const OUT = join(__dirname, "..", "a"); }\nfunction b() { const OUT = join(__dirname, "..", "b"); writeFileSync(join(OUT, "DESIGN.md"), x); }\n',
        // resolve() with an absolute part restarts from it
        "scripts/abs.js": 'const ROOT = join(__dirname, "..");\nwriteFileSync(resolve(ROOT, "/tmp/build", "DESIGN.md"), x);\n',
        // the same declaration twice is not a conflict
        "scripts/same.js": 'function a() { const ROOT = join(__dirname, ".."); }\nfunction b() { const ROOT = join(__dirname, ".."); writeFileSync(join(ROOT, "DESIGN.md"), x); }\n',
      }));
      const generators = c("decisions.design_md.generator_scripts").detail.generators;
      expect(generators.map((g) => [g.script, g.outputs.map((o) => [o.output, o.exists])])).toEqual([["scripts/same.js", [["DESIGN.md", true]]]]);
      expect(v("decisions.design_md.generator_scripts")).toBe(1);
      expect(c("decisions.design_md.generator_scripts").notes.join(" ")).toMatch(/3 script\(s\) mention DESIGN\.md/);
    });

    test("an absolute or out-of-repo path is never looked up on the auditor's disk, and is not echoed", () => {
      const outside = repo({ "DESIGN.md": "outside the repo\n" });
      const abs = path.join(outside, "DESIGN.md");
      const rel = path.join("..", path.basename(outside), "DESIGN.md");
      const root = repo({
        "scripts/abs.js": `fs.writeFileSync(${JSON.stringify(abs)}, x);\n`,
        "scripts/rel.js": `fs.writeFileSync(${JSON.stringify(rel)}, x);\n`,
        "scripts/up.js": 'const ROOT = join(__dirname, "..");\nfs.writeFileSync(join(ROOT, "..", "DESIGN.md"), x);\n',
      });
      const { list, v } = counters(root);
      expect(v("decisions.design_md.generator_scripts")).toBe(0);
      expect(v("decisions.design_md.generator_outputs_missing")).toBe(0);
      expect(v("decisions.design_md.generator_output_exists")).toBe(false);
      expect(JSON.stringify(list)).not.toContain(outside);
    });

    test("thousands of writeFileSync(identifier) calls are read in bounded time", () => {
      const calls = Array.from({ length: 16000 }, (_, i) => `fs.writeFileSync(out${i}, "x");`).join("\n");
      const start = Date.now();
      const { v } = counters(repo({ "scripts/gen.js": `// DESIGN.md\nconst ROOT = join(__dirname, "..");\n${calls}\n` }));
      expect(Date.now() - start).toBeLessThan(3000);
      expect(v("decisions.design_md.generator_scripts")).toBe(0);
    });

    test("an output path that climbs out of the repo is not resolved", () => {
      const { v } = counters(repo({ "scripts/out.ts": 'const ROOT = join(__dirname, "..");\nwriteFileSync(join(ROOT, "..", "..", "DESIGN.md"), x);\n' }));
      expect(v("decisions.design_md.generator_scripts")).toBe(0);
    });
  });

  describe("an empty repo", () => {
    test("every counter degrades to 0 / false / null with a note, and the report is valid", () => {
      const { list, v, c } = counters(repo({}));
      for (const counter of list) expect([0, false, null]).toContain(counter.value);
      expect(v("decisions.files.count")).toBe(0);
      expect(v("decisions.adr.headings")).toBe(0);
      expect(v("decisions.adr.newest_age_days")).toBeNull();
      expect(v("decisions.design_md.exists")).toBe(false);
      expect(v("decisions.design_md.generator_output_exists")).toBe(false);
      expect(c("decisions.files.count").notes[0]).toMatch(/no decision records/);
      expect(c("decisions.design_md.exists").notes[0]).toMatch(/no design\/DESIGN\.md/);
      // and through the real runner (validateReport runs inside it)
      const report = run(repo({}), { groups: ["decisions"] });
      expect(report.counters.every((x) => x.id.startsWith("decisions."))).toBe(true);
    });
  });

  test("the report is deterministic and sorted", () => {
    const files = { "decisions/ADR.md": ADR, "design/DESIGN.md": "# x\n" };
    const a = run(repo(files), { groups: ["decisions"] });
    const b = run(repo(files), { groups: ["decisions"] });
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    expect(a.counters.map((c) => c.id)).toEqual([...a.counters.map((c) => c.id)].sort());
  });
});
