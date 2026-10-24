/**
 * docs.test.js — acceptance tests for the `docs` counters: doc-vs-code presence
 * checks (spine members, oklch claims, contract records against the token
 * source). Every expectation is hand-computed from a tiny temp repo (never from
 * the live repo), and every check is also run on an EMPTY repo to prove it
 * degrades to 0 / false with a note instead of failing.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { makeRepo, removeRepo, run, get, val } = require("./helpers");
const { tokenThemes, normValue } = require("../../../src/lib/counters/css");
const { designColors } = require("../../../src/lib/counters/markdown");
const { repoRelativePath } = require("../../../src/lib/counters/util");
const { parseCss } = require("../../../src/lib/css-parse");
const cssRules = (text) => parseCss(text).rules;
const { createContext } = require("../../../src/lib/counters/context");

const lines = (...l) => l.join("\n") + "\n";
// five custom properties, one per line: enough for the "most custom properties" rule and the line-start regex
const TOKENS = lines(":root {", "  --a: 1;", "  --b: 2;", "  --c: 3;", "  --d: 4;", "  --e: 5;", "}");
const record = (fm, body = "") => lines("---", ...Object.entries(fm).map(([k, v]) => `${k}: ${v}`), "---", "", body);

describe("docs counters", () => {
  const roots = [];
  const repo = (files) => {
    const root = makeRepo(files);
    roots.push(root);
    return root;
  };
  afterEach(() => roots.splice(0).forEach(removeRepo));
  const r = (files, opts = {}) => run(repo(files), { groups: ["docs"], dirs: ["src"], ...opts });

  describe("an empty repo", () => {
    test("every counter degrades to 0 / false with no crash", () => {
      const report = r({});
      expect(report.counters.length).toBeGreaterThan(30);
      for (const c of report.counters) {
        expect([0, false, null]).toContain(c.value);
      }
      expect(val(report, "docs.spine.members_present")).toBe(0);
      expect(val(report, "docs.contract.exists")).toBe(false);
      expect(val(report, "docs.token_records.files")).toBe(0);
      expect(val(report, "docs.coverage.token_records_per_custom_property")).toBeNull(); // 0 of 0 is no ratio
      expect(get(report, "docs.coverage.token_records_per_custom_property").detail).toEqual({ numerator: 0, denominator: 0 });
      expect(val(report, "docs.coverage.component_records_per_component_file")).toBeNull();
      expect(get(report, "docs.contract.exists").notes).toEqual(["no contract/ directory in this repo"]);
      expect(get(report, "docs.token_records.matches").notes.length).toBeGreaterThan(0);
      expect(get(report, "docs.spine.design_md").notes).toEqual(["no design/ directory"]);
    });
  });

  describe("spine", () => {
    test("members count only when they are the right kind: files for DESIGN.md/guardrails/tokens, directories for the rest", () => {
      const report = r({
        "design/DESIGN.md": "# d\n",
        "design/guardrails.mdx": "x\n",
        "design/tokens.css": ":root { --a: 1; }\n",
        "design/decisions/ADR-001.md": "x\n",
        "design/goals": "a file, not a directory\n", // wrong kind
        // no design/.state
        "CLAUDE.md": "The spine: `DESIGN.md`, `tokens.css`, `decisions/`.\n",
        "experiments/LEARNINGS.md": "x\n",
      });
      expect(val(report, "docs.spine.design_md")).toBe(true);
      expect(val(report, "docs.spine.guardrails_mdx")).toBe(true);
      expect(val(report, "docs.spine.tokens_css")).toBe(true);
      expect(val(report, "docs.spine.decisions_dir")).toBe(true);
      expect(val(report, "docs.spine.goals_dir")).toBe(false);
      expect(val(report, "docs.spine.state_dir")).toBe(false);
      expect(val(report, "docs.spine.members_present")).toBe(4);
      expect(get(report, "docs.spine.members_present").detail).toEqual({
        expected: 6,
        present: ["design/DESIGN.md", "design/guardrails.mdx", "design/tokens.css", "design/decisions/"],
        missing: ["design/goals/", "design/.state/"],
      });
      // CLAUDE.md names DESIGN.md, tokens.css, decisions/ → 3 of the 6 names
      expect(val(report, "docs.spine.members_listed_in_claude_md")).toBe(3);
      // layout.js scaffolds three design members (all present) and four loop members (experiments/ + LEARNINGS.md present)
      expect(val(report, "docs.layout.design_members_present")).toBe(3);
      expect(val(report, "docs.layout.loop_members_present")).toBe(2);
      expect(get(report, "docs.layout.loop_members_present").detail.missing).toEqual(["experiments/goals", ".systemix/queue.json"]);
    });

    test("a .state directory counts (dot-directories are real members)", () => {
      const report = r({ "design/.state/queue.json": "[]" });
      expect(val(report, "docs.spine.state_dir")).toBe(true);
      expect(val(report, "docs.spine.members_present")).toBe(1);
    });
  });

  describe("oklch: what the docs claim vs what the token source declares", () => {
    const tokens = lines(
      ":root {",
      "  --a: oklch(0.2 0.01 70);",
      "  --b: #fff;",
      "  --c: oklch(0.3 0 0); /* oklch again */",
      "  --d: 1;",
      "  --e: 2;",
      "}",
    );

    test("whole-word, case-insensitive mentions in CLAUDE.md and the decision records; declarations by line", () => {
      const report = r({
        "design/tokens.css": tokens,
        "CLAUDE.md": "We use OKLCH. Also oklch(1 0 0) and oklchish and not-oklch.\n",
        "decisions/ADR.md": "## ADR-001: x\noklch here, and oklch there\n",
        "design/decisions/two.md": "nothing\n",
      });
      // OKLCH, oklch(, not-oklch (the hyphen is a word boundary) = 3; "oklchish" is not the word
      expect(val(report, "docs.oklch.claude_md_mentions")).toBe(3);
      expect(val(report, "docs.oklch.adr_mentions")).toBe(2);
      expect(get(report, "docs.oklch.adr_mentions").perFile).toEqual([{ file: "decisions/ADR.md", count: 2 }]);
      // token source: two oklch( declaration lines (the occurrences in the file are tokens.oklch.occurrences, not repeated here)
      expect(val(report, "docs.oklch.docs_claim_without_declaration")).toBe(false);
      expect(get(report, "docs.oklch.docs_claim_without_declaration").detail).toEqual({ docMentions: 5, tokenSourceDeclarations: 2 });
      expect(report.counters.some((c) => /token_source_(occurrences|declarations)$/.test(c.id))).toBe(false); // one name per fact
    });

    test("docs that mention oklch over a token source that declares none are flagged", () => {
      const report = r({
        "design/tokens.css": ":root { --a: #111; --b: #222; --c: #333; --d: #444; --e: #555; }\n",
        "CLAUDE.md": "All colours are oklch.\n",
      });
      expect(val(report, "docs.oklch.docs_claim_without_declaration")).toBe(true);
      expect(get(report, "docs.oklch.docs_claim_without_declaration").detail).toEqual({ docMentions: 1, tokenSourceDeclarations: 0 });
    });

    test("only an oklch( call is a declaration: the word in a gradient interpolation is an occurrence, not a declaration", () => {
      const report = r({
        "design/tokens.css": lines(":root {", "  --a: oklch(0.2 0 0);", "  --g: linear-gradient(in oklch, red, blue);", "  --c: #fff;", "  --d: 1;", "  --e: 2;", "}"),
      });
      expect(get(report, "docs.oklch.docs_claim_without_declaration").detail.tokenSourceDeclarations).toBe(1);
    });

    test("with no token source the boolean is true when docs claim oklch, and the note says why", () => {
      const report = r({ "CLAUDE.md": "oklch\n" });
      expect(val(report, "docs.oklch.docs_claim_without_declaration")).toBe(true);
      expect(get(report, "docs.oklch.docs_claim_without_declaration").notes[0]).toMatch(/no token source/);
    });
  });

  describe("contract/tokens records vs the token source", () => {
    const tokenCss = lines(
      ":root {",
      "  --primary: #A8511A;",
      "  --radius: 0.5rem;",
      "  --space-1: 4px;",
      "  --x: 1;",
      "  --y: 2;",
      "  --z: 3;",
      "  --w: 4;",
      "  --v: 5;",
      "}",
      ".dark {",
      "  --primary: #ff9e3d;",
      "}",
    );
    const files = {
      "design/tokens.css": tokenCss,
      // value equals the :root value after hex case normalisation → match
      "contract/tokens/a.mdx": record({ token: "--primary", value: "#a8511a", status: "clean" }),
      // 0.4rem vs 0.5rem, claims clean, Drift section says None → clean mismatch ×2
      "contract/tokens/b.mdx": record({ token: "--radius", value: "0.4rem", status: "clean" }, "## Drift\n\nNone recorded.\n"),
      // equal, status says drift → match, not clean
      "contract/tokens/c.mdx": record({ token: "--space-1", value: "4px", status: "drift" }),
      // token not declared → unresolved
      "contract/tokens/d.mdx": record({ token: "--nope", value: "1", status: "clean" }),
      // no value → cannot compare
      "contract/tokens/e.mdx": record({ token: "--z", status: "clean" }),
      // mismatch, status ok, Drift section None → clean mismatch ×2
      "contract/tokens/f.mdx": record({ token: "--x", value: "9", status: "ok" }, "## Drift\n\nNone.\n"),
      // mismatch, frontmatter drift: none (no status), Drift section describes drift → clean via drift key only
      "contract/tokens/g.mdx": record({ token: "--y", value: "9", drift: "none" }, "## Drift\n\nThe value moved.\n"),
      // title fallback, quoted value, mismatch, status stale → not clean
      "contract/tokens/h.md": record({ title: "--w", value: '"5"', status: "stale" }),
    };

    test("matches, mismatches, unresolved, clean-while-mismatching and coverage are hand-computed", () => {
      const report = r(files);
      expect(val(report, "docs.token_records.files")).toBe(8);
      expect(val(report, "docs.token_records.without_value")).toBe(1); // e
      expect(val(report, "docs.token_records.keyed")).toBe(7);
      expect(val(report, "docs.token_records.matches")).toBe(2); // a, c
      expect(val(report, "docs.token_records.mismatches")).toBe(4); // b, f, g, h
      expect(val(report, "docs.token_records.unresolved")).toBe(1); // d
      expect(get(report, "docs.token_records.matches").perFile.map((p) => p.file)).toEqual(["contract/tokens/a.mdx", "contract/tokens/c.mdx"]);
      expect(get(report, "docs.token_records.mismatches").perFile.map((p) => p.file)).toEqual([
        "contract/tokens/b.mdx", "contract/tokens/f.mdx", "contract/tokens/g.mdx", "contract/tokens/h.md",
      ]);
      // b (status clean), f (status ok), g (drift none) claim clean; h (stale) does not
      expect(val(report, "docs.token_records.clean_status_mismatching")).toBe(3);
      expect(get(report, "docs.token_records.clean_status_mismatching").perFile.map((p) => p.file)).toEqual([
        "contract/tokens/b.mdx", "contract/tokens/f.mdx", "contract/tokens/g.mdx",
      ]);
      // b and f have a Drift section starting "None"; g's section describes drift
      expect(val(report, "docs.token_records.clean_drift_section_mismatching")).toBe(2);
      // declared custom properties: primary, radius, space-1, x, y, z, w, v = 8. Distinct declared tokens named by a
      // record: primary (a), radius (b), space-1 (c), z (e, no value but named), x (f), y (g), w (h) = 7; --nope (d) is not declared
      expect(get(report, "docs.coverage.token_records_per_custom_property").detail).toEqual({ numerator: 7, denominator: 8 });
      expect(val(report, "docs.coverage.token_records_per_custom_property")).toBe(0.875);
    });

    test("the radius case: every declared value is listed, and a value equal to any of them is a match", () => {
      const report = r({
        "design/tokens.css": lines(":root { --radius: 0.3125rem; --b: 1; --c: 2; --d: 3; --e: 4; }", '[data-radius="round"] { --radius: 0.625rem; }'),
        "contract/tokens/one.mdx": record({ token: "--radius", value: "0.625rem" }),
        "contract/tokens/two.mdx": record({ token: "--radius", value: "0.5rem" }),
      });
      expect(val(report, "docs.token_records.matches")).toBe(1); // 0.625rem is declared in the [data-radius] rule
      expect(val(report, "docs.token_records.mismatches")).toBe(1);
      const rows = get(report, "docs.token_records.files").detail.records;
      expect(rows.find((x) => x.file.endsWith("two.mdx")).declared).toEqual([
        { block: "light", value: "0.3125rem" },
        { block: "other", value: "0.625rem" },
      ]);
      // one distinct token (--radius) of 5 custom properties
      expect(get(report, "docs.coverage.token_records_per_custom_property").detail).toEqual({ numerator: 1, denominator: 5 });
      expect(val(report, "docs.coverage.token_records_per_custom_property")).toBe(0.2);
    });

    test("coverage is rounded to 4 decimals and keeps its numerator and denominator", () => {
      const report = r({
        "design/tokens.css": ":root { --a: 1; --b: 2; --c: 3; --d: 4; --e: 5; --f: 6; --g: 7; }\n",
        "contract/tokens/a.mdx": record({ token: "--a", value: "1" }),
        "contract/tokens/b.mdx": record({ token: "--b", value: "2" }),
      });
      expect(val(report, "docs.coverage.token_records_per_custom_property")).toBe(0.2857); // 2/7
      expect(get(report, "docs.coverage.token_records_per_custom_property").detail).toEqual({ numerator: 2, denominator: 7 });
    });

    test("CRLF records and a quoted frontmatter value read the same as LF", () => {
      const lf = r(files);
      const crlf = r(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, v.replace(/\n/g, "\r\n")])));
      const pick = (rep) => rep.counters.filter((c) => c.id.startsWith("docs.token_records.")).map((c) => [c.id, c.value]);
      expect(pick(crlf)).toEqual(pick(lf));
    });

    test("records with no token source are unresolved, with a note", () => {
      const report = r({ "contract/tokens/a.mdx": record({ token: "--primary", value: "#fff" }) });
      expect(val(report, "docs.token_records.files")).toBe(1);
      expect(val(report, "docs.token_records.unresolved")).toBe(1);
      expect(val(report, "docs.token_records.matches")).toBe(0);
      expect(get(report, "docs.token_records.matches").notes.join(" ")).toMatch(/no token source/);
    });

    test("the value compare is a strict string compare: oklch is never converted to hex, units are never converted", () => {
      expect(normValue("OKLCH(0.2 0 0)")).toBe("OKLCH(0.2 0 0)");
      expect(normValue(" #ABC !important;")).toBe("#aabbcc");
      expect(normValue('"Chakra  Petch"')).toBe("Chakra Petch");
      expect(normValue("0.5rem")).not.toBe(normValue("8px"));
      expect(normValue("#A8511A")).toBe(normValue("#a8511a"));
      expect(normValue("#FFFF")).toBe("#ffffffff");
    });
  });

  describe("component records", () => {
    test("path coverage is distinct component files ÷ tsx under components/ (tests excluded)", () => {
      const report = r({
        "src/components/Button.tsx": "export const Button = () => null;\n",
        "src/components/ui/card.tsx": "export const Card = () => null;\n",
        "src/components/Button.test.tsx": "test('x', () => {});\n",
        "src/lib/x.ts": "export {};\n",
        "src/mdx-components.tsx": "export {};\n", // 'components' is not a directory segment
        "contract/components/button.mdx": record({ component: "Button", path: "./src/components/Button.tsx" }),
        "contract/components/gone.mdx": record({ component: "Gone", path: "src/components/Gone.tsx" }),
        "contract/components/nopath.mdx": record({ component: "NoPath" }),
      });
      expect(val(report, "docs.component_records.files")).toBe(3);
      expect(val(report, "docs.component_records.with_path")).toBe(2);
      expect(val(report, "docs.component_records.path_exists")).toBe(1);
      expect(val(report, "docs.component_records.path_missing")).toBe(1);
      expect(get(report, "docs.component_records.path_missing").perFile).toEqual([{ file: "contract/components/gone.mdx", count: 1 }]);
      // components: Button.tsx and ui/card.tsx (the test and mdx-components.tsx are out) → 1 of 2
      expect(val(report, "docs.coverage.component_records_per_component_file")).toBe(0.5);
      expect(get(report, "docs.coverage.component_records_per_component_file").detail).toEqual({ numerator: 1, denominator: 2 });
    });
  });

  describe("component record paths that say nothing about this tree", () => {
    test("absolute, home-relative and out-of-repo paths are not looked up: they count as unresolved, never as existing or missing", () => {
      const outside = repo({ "Thing.tsx": "export {};\n" }); // a real file outside the audited repo
      const root = repo({});
      const write = (rel, body) => {
        fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
        fs.writeFileSync(path.join(root, rel), body);
      };
      write("src/components/Button.tsx", "export const Button = () => null;\n");
      const rec = (name, p) => write(`contract/components/${name}.mdx`, record({ component: name, path: p }));
      rec("abs", path.join(outside, "Thing.tsx")); // exists on this machine, outside the repo
      rec("up", path.join("..", path.basename(outside), "Thing.tsx")); // exists, one level up
      rec("inside_abs", path.join(root, "src/components/Button.tsx")); // exists, but only on this machine
      rec("win", "C:\\Users\\someone\\Button.tsx");
      rec("home", "~/work/Button.tsx");
      rec("ok", "./src/components/Button.tsx");
      rec("gone", "src/components/Gone.tsx");

      const report = run(root, { groups: ["docs"], dirs: ["src"] });
      expect(val(report, "docs.component_records.files")).toBe(7);
      expect(val(report, "docs.component_records.with_path")).toBe(7);
      expect(val(report, "docs.component_records.path_exists")).toBe(1); // ok
      expect(val(report, "docs.component_records.path_missing")).toBe(1); // gone
      expect(val(report, "docs.component_records.path_unresolved")).toBe(5);
      expect(get(report, "docs.component_records.path_unresolved").perFile.map((p) => p.file).sort()).toEqual([
        "contract/components/abs.mdx", "contract/components/home.mdx", "contract/components/inside_abs.mdx",
        "contract/components/up.mdx", "contract/components/win.mdx",
      ]);
      expect(get(report, "docs.component_records.path_exists").notes.join(" ")).toMatch(/5 record\(s\) name an absolute/);
      // only the repo-relative record counts towards coverage
      expect(get(report, "docs.coverage.component_records_per_component_file").detail).toEqual({ numerator: 1, denominator: 1 });
    });

    test("repoRelativePath: what is a repo path and what is not", () => {
      expect(repoRelativePath("./src/a.tsx")).toBe("src/a.tsx");
      expect(repoRelativePath("src\\a.tsx")).toBe("src/a.tsx");
      expect(repoRelativePath("src/../lib/a.tsx")).toBe("lib/a.tsx");
      for (const bad of ["/etc/hostname", "C:\\x\\a.tsx", "c:/x", "\\\\host\\share\\a", "~/a.tsx", "~", "../a.tsx", "src/../../a.tsx", "..", ".", "", "  ", "${out}/a.tsx"]) {
        expect([bad, repoRelativePath(bad)]).toEqual([bad, null]);
      }
      expect(repoRelativePath("..foo/a.tsx")).toBe("..foo/a.tsx"); // a directory that merely starts with dots
    });
  });

  describe("contract/ itself", () => {
    test("exists + files of any type, split by directory", () => {
      const report = r({
        "contract/index.mdx": "x",
        "contract/meta.json": "{}",
        "contract/tokens/a.mdx": "x",
        "contract/components/b.mdx": "x",
        "contract/engagement/c.mdx": "x",
      });
      expect(val(report, "docs.contract.exists")).toBe(true);
      expect(val(report, "docs.contract.files")).toBe(5);
      expect(get(report, "docs.contract.files").detail.byDir).toEqual({
        contract: 2,
        "contract/components": 1,
        "contract/engagement": 1,
        "contract/tokens": 1,
      });
    });
  });

  describe("docs that call a css file canonical", () => {
    test("claims are lines with a canonical word AND a css file; only a claim naming the resolved source counts", () => {
      const report = r({
        "src/app/globals.css": TOKENS,
        "design/DESIGN.md": "intro\nTokens live in `src/app/globals.css` (canonical).\nUnrelated line about theme.css.\n",
        "design/tokens.mdx": "| `theme.css` | source of truth |\nThe canonical idea, without any css file.\n",
      });
      expect(report.scope.tokenSource.path).toBe("src/app/globals.css");
      expect(val(report, "docs.token_source.canonical_claims")).toBe(2);
      expect(get(report, "docs.token_source.canonical_claims").detail.claims).toEqual([
        { file: "design/DESIGN.md", line: 2, refs: ["src/app/globals.css"] },
        { file: "design/tokens.mdx", line: 1, refs: ["theme.css"] },
      ]);
      expect(val(report, "docs.token_source.docs_naming_resolved")).toBe(1);
      expect(get(report, "docs.token_source.docs_naming_resolved").detail.files).toEqual(["design/DESIGN.md"]);
    });

    test("a claim names the token source by its path, a path suffix or its bare file name, but not by another directory's file of the same name", () => {
      const report = r({
        "src/app/globals.css": TOKENS,
        "design/DESIGN.md": "Tokens: `globals.css` is canonical.\n",
        "design/tokens.mdx": "`app/globals.css` is the source of truth.\n",
        "design/index.mdx": "`other/globals.css` is the canonical file.\n",
      });
      expect(report.scope.tokenSource.path).toBe("src/app/globals.css");
      expect(val(report, "docs.token_source.canonical_claims")).toBe(3);
      expect(val(report, "docs.token_source.docs_naming_resolved")).toBe(2);
      expect(get(report, "docs.token_source.docs_naming_resolved").detail.files).toEqual(["design/DESIGN.md", "design/tokens.mdx"]);
    });

    test("a pathological long line is skipped rather than hanging the css-reference regex", () => {
      const start = Date.now();
      const report = r({
        "src/app/globals.css": TOKENS,
        "design/DESIGN.md": "canonical " + "a".repeat(300000) + ".css\n",
      });
      expect(Date.now() - start).toBeLessThan(3000);
      expect(val(report, "docs.token_source.canonical_claims")).toBe(0);
    });
  });

  describe("css parsing used for the compare", () => {
    test("themes: last declaration wins, @theme and prefers-color-scheme are understood, url(;) and strings do not split", () => {
      const root = repo({
        "design/tokens.css": lines(
          '@import "x.css";',
          "@theme inline { --color-background: var(--background); }",
          ":root { --background: #fff; --img: url(data:image/svg+xml;utf8,<svg/>); --f: \"a;b\"; }",
          ":root { --background: #eee; }",
          ".dark { --background: #111; }",
          "@media (prefers-color-scheme: dark) { :root { --fg: #222; } }",
          "@media (min-width: 600px) { :root { --wide: 1; } }",
          '@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --fg2: #333; } }',
          "html.dark, [data-theme='dark'] { --shared: #444; }",
          ":root, .dark { --both: #555; }",
          ".dark .card { --nested: #666; }",
          "/* .dark { --ghost: 1; } */",
        ),
      });
      const t = tokenThemes(createContext(root, { dirs: ["src"] }));
      expect(t.light.get("--background").value).toBe("#eee");
      expect(t.dark.get("--background").value).toBe("#111");
      expect(t.theme.get("--color-background").value).toBe("var(--background)");
      expect(t.light.get("--img").value).toBe("url(data:image/svg+xml;utf8,<svg/>)");
      expect(t.light.get("--f").value).toBe('"a;b"');
      expect(t.dark.get("--fg").value).toBe("#222");
      expect(t.light.has("--fg")).toBe(false);
      expect(t.all.get("--wide")[0].block).toBe("other");
      expect(t.all.has("--ghost")).toBe(false);
      // the common "dark unless the user forced light" pattern is a dark block, never a light one
      expect(t.dark.get("--fg2").value).toBe("#333");
      expect(t.light.has("--fg2")).toBe(false);
      // selector lists: html.dark and [data-theme='dark'] are dark; ":root, .dark" defines both themes
      expect(t.dark.get("--shared").value).toBe("#444");
      expect(t.light.has("--shared")).toBe(false);
      expect(t.dark.get("--both").value).toBe("#555");
      expect(t.light.get("--both").value).toBe("#555");
      // a descendant selector is not a theme block
      expect(t.dark.has("--nested")).toBe(false);
      expect(t.all.get("--nested")[0].block).toBe("other");
      expect(t.all.get("--background").map((d) => d.line)).toEqual([3, 4, 5]);
    });

    test("cssRules is linear on unterminated comments and unbalanced braces", () => {
      const start = Date.now();
      const rules = cssRules("/* a ".repeat(50000) + ":root { --a: 1;");
      expect(Date.now() - start).toBeLessThan(3000);
      expect(rules).toEqual([]);
      expect(cssRules("}}} :root { --a: 1 }").length).toBe(1);
    });
  });

  describe("DESIGN.md colours", () => {
    test("are parsed once per context", () => {
      const ctx = createContext(repo({ "design/DESIGN.md": lines("---", "colors:", '  background: "#000000"', "---", "# D") }), { dirs: ["src"] });
      const first = designColors(ctx);
      expect(first.colors).toEqual([{ name: "background", value: "#000000", line: 3 }]);
      expect(designColors(ctx)).toBe(first);
    });
  });

  describe("css nesting is bounded", () => {
    test("rules nested deeper than 32 levels are skipped and counted, not copied", () => {
      const { rules, tooDeep } = parseCss("{ --a: 1;".repeat(100) + "}".repeat(100)); // a rule is kept when it holds a declaration or encloses one
      expect(rules).toHaveLength(32);
      expect(tooDeep).toBe(68);
      expect(Math.max(...rules.map((x) => x.chain.length))).toBe(31);
      // an ordinary token file keeps working next to the pathological part
      const both = parseCss(":root { --a: 1; }\n" + "a{--x:1;".repeat(40) + "}".repeat(40));
      expect(both.rules.find((x) => x.selector === ":root").decls).toEqual([{ name: "--a", value: "1", line: 1 }]);
      expect(both.tooDeep).toBe(8); // :root closes first; of the 40 nested rules after it, 32 are kept and 8 skipped
    });

    test("40,000 nested braces (with or without declarations) are read in linear time and warn", () => {
      const start = Date.now();
      const plain = r({ "design/tokens.css": ":root { --a: 1; }\n" + "{".repeat(40000) + "}".repeat(40000) });
      const withDecls = r({ "design/tokens.css": ":root { --a: 1; }\n" + "a{--x:1;".repeat(40000) + "}".repeat(40000) });
      expect(Date.now() - start).toBeLessThan(3000);
      for (const report of [plain, withDecls]) {
        expect(report.warnings.join(" ")).toMatch(/design\/tokens\.css: \d+ css rule\(s\) nested deeper than 32 levels were not read/);
        expect(val(report, "docs.coverage.token_records_per_custom_property")).toBe(0);
      }
      expect(get(plain, "docs.coverage.token_records_per_custom_property").detail.denominator).toBe(1);
    });
  });

  describe("a file over the 5 MB read cap", () => {
    const big = () => "x".repeat(5 * 1024 * 1024 + 10);

    test("CLAUDE.md: the note names the cap instead of saying the file is absent", () => {
      const report = r({ "CLAUDE.md": big() });
      expect(val(report, "docs.oklch.claude_md_mentions")).toBe(0);
      for (const id of ["docs.oklch.claude_md_mentions", "docs.spine.members_listed_in_claude_md"]) {
        expect(get(report, id).notes.join(" ")).toMatch(/5 MB read cap and not read: CLAUDE\.md/);
        expect(get(report, id).notes.join(" ")).not.toMatch(/no CLAUDE\.md/);
      }
    });

    test("an empty CLAUDE.md is called empty, a missing one missing", () => {
      expect(get(r({ "CLAUDE.md": "" }), "docs.oklch.claude_md_mentions").notes).toEqual(["CLAUDE.md is empty"]);
      expect(get(r({}), "docs.oklch.claude_md_mentions").notes).toEqual(["no CLAUDE.md at the repo root"]);
    });

    test("a decision record and the token source say so too", () => {
      const adr = r({ "decisions/ADR.md": big() });
      expect(get(adr, "docs.oklch.adr_mentions").notes.join(" ")).toMatch(/5 MB read cap and not read: decisions\/ADR\.md/);
      const token = r({ "design/tokens.css": big(), "CLAUDE.md": "oklch\n" });
      expect(get(token, "docs.oklch.docs_claim_without_declaration").detail.tokenSourceDeclarations).toBe(0);
      expect(get(token, "docs.oklch.docs_claim_without_declaration").notes.join(" ")).toMatch(/5 MB read cap/);
    });
  });

  test("the report is deterministic, valid and never reads outside the repo", () => {
    const files = {
      "design/tokens.css": ":root { --a: 1; --b: 2; --c: 3; --d: 4; --e: 5; }\n",
      "contract/tokens/a.mdx": record({ token: "--a", value: "1", status: "clean" }),
      "CLAUDE.md": "oklch\n",
    };
    const a = r(files);
    const b = r(files);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    expect(a.counters.every((c) => c.group === "docs" && c.id.startsWith("docs."))).toBe(true);
    expect(a.counters.map((c) => c.id)).toEqual([...a.counters.map((c) => c.id)].sort());
  });
});
