/**
 * redos.test.js — one hostile line in a file the audit reads must not stall it. The audit is
 * pointed at repos its author did not write, and the line-oriented patterns of the
 * documentation groups used to be quadratic on a single long line (a run of one character
 * followed by a character the next token does not accept, or a lone \r / U+2028 that stops `.`
 * before the closing `$`): 100,000 characters took 8 to 17 seconds, 5 MB would take hours.
 *
 * Each row is one of those inputs, run through the WHOLE report (every group), at a size where
 * the quadratic version needed tens of seconds. The bound is far above what a linear pattern
 * costs on a loaded CI machine and far below the old behaviour. The numbers the hostile line
 * produces are asserted too: the line is still read, not skipped.
 */

"use strict";

const { makeRepo, removeRepo, run, get, val } = require("./helpers");

const N = 200000;
const BOUND_MS = 4000;
const SRC = { "src/a.tsx": "export const A = () => null;\n" };

describe("hostile lines are read in bounded time", () => {
  const roots = [];
  afterEach(() => roots.splice(0).forEach(removeRepo));
  const timed = (files) => {
    const root = makeRepo({ ...SRC, ...files });
    roots.push(root);
    const t0 = Date.now();
    const report = run(root, { dirs: ["src"] });
    return { report, ms: Date.now() - t0 };
  };

  test("guardrails: a colour followed by a long run of ( — the 'X on Y' pattern", () => {
    const { report, ms } = timed({ "design/guardrails.mdx": "- `#fff` on " + "(".repeat(N) + "\n" });
    expect(ms).toBeLessThan(BOUND_MS);
    expect(val(report, "guardrails.structure.rule_bullets")).toBe(1);
  });

  test("guardrails: many colours each followed by a long run of marks", () => {
    const { ms } = timed({ "design/guardrails.mdx": "- " + "#fff on ``` ".repeat(2) + "*".repeat(N) + " #000\n" + "- " + "#fff `` ".repeat(20000) + "\n" });
    expect(ms).toBeLessThan(BOUND_MS);
  });

  test("guardrails: a heading, a long blank run, a lone \\r", () => {
    const { report, ms } = timed({ "design/guardrails.mdx": "## " + " ".repeat(N) + "\rx\n- rule\n" });
    expect(ms).toBeLessThan(BOUND_MS);
    expect(val(report, "guardrails.structure.rule_bullets")).toBe(1);
  });

  test("guardrails and typography: a # run of blanks then a lone \\r — the heading pattern of the exemption reader", () => {
    const { ms } = timed({ "design/guardrails.mdx": "#" + " ".repeat(N) + "x\ry\n- Exceptions: `a.tsx`\n" });
    expect(ms).toBeLessThan(BOUND_MS);
  });

  test("typography: a ~ fence of N characters then a lone \\r — the fence pattern of the exemption reader", () => {
    const { report, ms } = timed({ "design/guardrails.mdx": "~".repeat(N) + "\rx\n- Exceptions: `a.tsx`\n" });
    expect(ms).toBeLessThan(BOUND_MS);
    expect(val(report, "typography.exempt.declared")).toBe(false); // the fence opened and never closed: the bullet is code
  });

  test.each([["\r"], [" "], [" "]])("decisions: a Status line of N asterisks and a line separator %j", (sep) => {
    const { report, ms } = timed({ "decisions/ADR.md": "## ADR-001: x\nStatus:" + "*".repeat(N) + sep + "\nDate: 2026-01-01\n" });
    expect(ms).toBeLessThan(BOUND_MS);
    expect(val(report, "decisions.adr.headings")).toBe(1);
    expect(val(report, "decisions.adr.dated")).toBe(1);
  });

  test("legibility: a ~/ path of N exclamation marks, then a letter, then one more", () => {
    const { report, ms } = timed({ "CLAUDE.md": "# T\nsee ~/" + "!".repeat(N) + "a!\n" });
    expect(ms).toBeLessThan(BOUND_MS);
    expect(val(report, "legibility.machine_paths.matches")).toBe(1);
    expect(get(report, "legibility.machine_paths.matches").detail.distinct).toBe(1);
  });

  test("a report over a hostile line stays small: every text from the repo is clamped", () => {
    const { report } = timed({
      "design/guardrails.mdx": "## " + "H".repeat(N) + "\n- " + "r".repeat(N) + "\n- ★ " + "s".repeat(N) + "\n",
      "decisions/ADR.md": "## ADR-001: " + "t".repeat(N) + "\nStatus: " + "z".repeat(N) + "\n",
      "systemix.config.yaml": "autonomy: " + "a".repeat(N) + "\n",
    });
    const bytes = JSON.stringify(report).length;
    expect(bytes).toBeLessThan(1500000); // the report of an empty-ish repo is ~300 KB of definitions; the 1.2 MB of hostile text adds a few KB
    const clamped = report.counters.filter((c) => c.truncated);
    expect(clamped.map((c) => c.id)).toEqual(expect.arrayContaining(["guardrails.structure.h2_sections", "guardrails.structure.rule_bullets", "guardrails.structure.starred_rules"]));
  });
});
