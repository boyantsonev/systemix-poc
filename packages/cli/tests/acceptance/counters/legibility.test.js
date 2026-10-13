/**
 * legibility.test.js — acceptance tests for the `legibility` counters (agent
 * legibility). Tiny temp repos, hand-computed expectations. Ages are measured to
 * the HEAD commit date; most tests hand the module a context with a chosen date.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { makeRepo, removeRepo, run, get, val } = require("./helpers");
const { createContext } = require("../../../src/lib/counters/context");
const legibility = require("../../../src/lib/counters/legibility");

const HEAD = "2026-10-11T12:00:00+00:00";
const lf = (...lines) => lines.join("\n") + "\n";

describe("legibility counters", () => {
  const roots = [];
  const repo = (files) => {
    const root = makeRepo(files);
    roots.push(root);
    return root;
  };
  afterEach(() => roots.splice(0).forEach(removeRepo));

  const counters = (root, commitDate = HEAD, opts = {}) => {
    const ctx = createContext(root, opts);
    const list = legibility.run({ ...ctx, git: { commit: commitDate ? "abc" : null, commitDate, dirty: false } });
    const byId = Object.fromEntries(list.map((c) => [c.id, c]));
    return { list, byId, v: (id) => byId[id].value };
  };

  describe("instruction files: exists / lines / headings", () => {
    const CLAUDE = lf(
      "# Title",
      "",
      "## Section A",
      "text",
      "```bash",
      "# not a heading",
      "```",
      "## Section B",
      "#hashtag is not a heading",
      "####### seven hashes is not a heading",
      "   ### three leading spaces still counts",
      "    #### four leading spaces is code",
      "~~~",
      "# inside a tilde fence",
      "~~~",
      "# After"
    );

    test("lines and ATX headings outside fences; CRLF reads the same as LF", () => {
      for (const text of [CLAUDE, CLAUDE.replace(/\n/g, "\r\n")]) {
        const { v } = counters(repo({ "CLAUDE.md": text }));
        expect(v("legibility.claude_md.exists")).toBe(true);
        expect(v("legibility.claude_md.lines")).toBe(16);
        // Title, Section A, Section B, "   ### three...", After
        expect(v("legibility.claude_md.headings")).toBe(5);
      }
    });

    test("a missing file is exists:false with 0 lines and 0 headings", () => {
      const { v, byId } = counters(repo({ "README.md": "x" }));
      for (const f of ["claude_md", "agents_md", "cursor_rules", "copilot_instructions"]) {
        expect(v(`legibility.${f}.exists`)).toBe(false);
        expect(v(`legibility.${f}.lines`)).toBe(0);
        expect(v(`legibility.${f}.headings`)).toBe(0);
      }
      expect(byId["legibility.claude_md.lines"].notes).toEqual(["CLAUDE.md not present"]);
      expect(v("legibility.instructions.present")).toBe(0);
    });

    test("an empty file exists with 0 lines; a last line without a newline still counts", () => {
      const { v, byId } = counters(repo({ "CLAUDE.md": "", "AGENTS.md": "# a" }));
      expect(v("legibility.claude_md.exists")).toBe(true);
      expect(v("legibility.claude_md.lines")).toBe(0);
      expect(byId["legibility.claude_md.lines"].notes.join(" ")).toMatch(/empty or over the 5 MB/);
      expect(v("legibility.agents_md.lines")).toBe(1);
      expect(v("legibility.agents_md.headings")).toBe(1);
      expect(v("legibility.instructions.present")).toBe(2);
    });

    test("copilot instructions, and .cursor/rules as a directory (front matter skipped, only rule extensions)", () => {
      const { v, byId } = counters(repo({
        ".github/copilot-instructions.md": "# Copilot\n",
        ".cursor/rules/a.mdc": lf("---", "description: x", "# a yaml comment, not a heading", "---", "# Rule A"),
        ".cursor/rules/sub/b.md": "## B\n",
        ".cursor/rules/c.txt": "# ignored\n",
      }));
      expect(v("legibility.copilot_instructions.exists")).toBe(true);
      expect(v("legibility.copilot_instructions.lines")).toBe(1);
      expect(v("legibility.copilot_instructions.headings")).toBe(1);
      expect(v("legibility.cursor_rules.exists")).toBe(true);
      expect(v("legibility.cursor_rules.lines")).toBe(6); // 5 + 1
      expect(v("legibility.cursor_rules.headings")).toBe(2); // "# Rule A" and "## B"
      expect(byId["legibility.cursor_rules.exists"].detail.files).toEqual([".cursor/rules/a.mdc", ".cursor/rules/sub/b.md"]);
      expect(v("legibility.instructions.present")).toBe(2);
    });

    test(".cursor/rules as a single legacy file; an empty rules directory is not an instruction file", () => {
      const single = counters(repo({ ".cursor/rules": "# R\nbe nice\n" }));
      expect(single.v("legibility.cursor_rules.exists")).toBe(true);
      expect(single.v("legibility.cursor_rules.lines")).toBe(2);
      const emptyDir = counters(repo({ ".cursor/rules/notes.txt": "x" }));
      expect(emptyDir.v("legibility.cursor_rules.exists")).toBe(false);
    });

    test("a leading horizontal rule is not mistaken for front matter", () => {
      const { v } = counters(repo({ "CLAUDE.md": lf("---", "# Heading right after a rule", "---", "# Another") }));
      expect(v("legibility.claude_md.headings")).toBe(2);
    });

    test("a file over 5 MB is skipped with a warning, not parsed", () => {
      const root = repo({ "CLAUDE.md": "# h\n".repeat(2_000_000) }); // 8 MB
      const r = run(root, { groups: ["legibility"] });
      expect(val(r, "legibility.claude_md.exists")).toBe(true);
      expect(val(r, "legibility.claude_md.lines")).toBe(0);
      expect(r.warnings.join(" ")).toMatch(/skipped \(over 5 MB\): CLAUDE.md/);
    });

    test("a BOM and non-UTF-8 bytes do not crash or shift the counts", () => {
      const { v } = counters(repo({
        "CLAUDE.md": Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("# Title\n"), Buffer.from([0xff, 0xfe, 0x0a]), Buffer.from("## Two\n")]),
      }));
      expect(v("legibility.claude_md.lines")).toBe(3);
      expect(v("legibility.claude_md.headings")).toBe(2); // the BOM does not hide the first heading
    });

    test("@path import lines resolve relative to the file that holds them", () => {
      const root = repo({
        "CLAUDE.md": lf("@AGENTS.md", "@docs/missing.md", "@/etc/hosts", "@~/notes.md", "@username", "install @scope/pkg for this", "```", "@in-fence.md", "```"),
        "etc/hosts": "a file under the repo that an absolute @/etc/hosts must not resolve to",
        "AGENTS.md": "# Agents\n",
      });
      const { v, byId } = counters(root);
      expect(v("legibility.instructions.imports")).toBe(4);
      expect(byId["legibility.instructions.imports"].detail).toEqual({
        resolved: ["AGENTS.md"],
        unresolved: ["/etc/hosts", "docs/missing.md", "~/notes.md"],
      });
      expect(v("legibility.claude_md.lines")).toBe(9);
      expect(v("legibility.agents_md.exists")).toBe(true);
    });
  });

  describe("markdown rules the counts rest on", () => {
    test("a fence closes only on a fence at least as long as its opener, with nothing after it", () => {
      const { v } = counters(repo({
        "CLAUDE.md": lf(
          "# Top",
          "````md",
          "```",
          "# inside the four-backtick fence",
          "```",
          "````",
          "## Real",
          "```",
          "```js",
          "# inside: a fence line with a language tag does not close",
          "```",
          "# After"
        ),
      }));
      // Top, Real, After; both "# inside" lines are in code
      expect(v("legibility.claude_md.headings")).toBe(3);
    });

    test("@path imports resolve from the importing file's own directory, also in nested rule files", () => {
      const root = repo({
        ".cursor/rules/sub/a.md": lf("@b.md", "@../c.md", "@../../../../outside.md", "@missing.md"),
        ".cursor/rules/sub/b.md": "# b\n",
        ".cursor/rules/c.md": "# c\n",
        "b.md": "a file at the root that @b.md must NOT resolve to\n",
      });
      const { v, byId } = counters(root);
      expect(v("legibility.instructions.imports")).toBe(4);
      expect(byId["legibility.instructions.imports"].detail).toEqual({
        resolved: [".cursor/rules/c.md", ".cursor/rules/sub/b.md"],
        unresolved: ["../../../../outside.md", ".cursor/rules/sub/missing.md"],
      });
    });
  });

  describe("guardrails mentions", () => {
    test("case-insensitive matches per file with line numbers; the singular is not a match", () => {
      const root = repo({
        "CLAUDE.md": lf("Read design/guardrails.mdx first.", "Guardrails matter; GUARDRAILS too.", "nothing here"),
        "AGENTS.md": "a guardrail (singular) only\n",
      });
      const { v, byId } = counters(root);
      expect(v("legibility.guardrails.mentions")).toBe(3);
      expect(byId["legibility.guardrails.mentions"].perFile).toEqual([{ file: "CLAUDE.md", count: 3 }]);
      expect(byId["legibility.guardrails.mentions"].detail.lines).toEqual({ "CLAUDE.md": [1, 2] });
      expect(v("legibility.guardrails.files_mentioning")).toBe(1);
    });

    test("no instruction files → 0 with a note", () => {
      const { v, byId } = counters(repo({ "README.md": "guardrails" }));
      expect(v("legibility.guardrails.mentions")).toBe(0);
      expect(byId["legibility.guardrails.mentions"].notes).toEqual(["no root instruction file present"]);
    });
  });

  describe("machine-local paths", () => {
    test("~/, /Users/ and /home/ references count; URLs and relative lookalikes do not", () => {
      const root = repo({
        "CLAUDE.md": lf(
          "see ~/.claude/plans/x.md.",
          "and `/Users/jane/proj/a.ts` and /home/ci/work.",
          "URL https://example.com/home/page and https://x.com/Users/bob are not machine paths.",
          "local ./home/x and src/home/x are not either.",
          "(~/notes) @~/import.md",
          "```",
          "cd ~/in-fence/a",
          "```"
        ),
      });
      const { v, byId } = counters(root);
      // line 1: 1 · line 2: 2 · line 3: 0 · line 4: 0 · line 5: 2 · line 7 (in a fence): 1
      expect(v("legibility.machine_paths.matches")).toBe(6);
      expect(byId["legibility.machine_paths.matches"].detail).toEqual({
        byPrefix: { "/Users/": 1, "/home/": 1, "~/": 4 },
        distinct: 6,
        lines: { "CLAUDE.md": [1, 2, 5, 7] },
      });
      expect(byId["legibility.machine_paths.matches"].perFile).toEqual([{ file: "CLAUDE.md", count: 6 }]);
    });

    test("the same path written twice is two matches, one distinct", () => {
      const { v, byId } = counters(repo({ "CLAUDE.md": "~/a/b and ~/a/b\n" }));
      expect(v("legibility.machine_paths.matches")).toBe(2);
      expect(byId["legibility.machine_paths.matches"].detail.distinct).toBe(1);
    });

    test("a repo with none reports 0", () => {
      expect(counters(repo({ "CLAUDE.md": "# clean\n" })).v("legibility.machine_paths.matches")).toBe(0);
    });
  });

  describe("repo-relative pointers", () => {
    test("code-span paths and relative links resolve against the tree; the rest is not path-shaped", () => {
      const root = repo({
        "CLAUDE.md": lf(
          "Key: `src/app/globals.css` `src/missing/file.ts` `docs/` `nodir/` `a/b` `./design/DESIGN.md`.",
          "Not paths: `npm run dev` `ghost/assisted` `https://x.dev/a.md` `@scope/pkg` `/abs/path.md` `getsystemix.vercel.app/docs/a.html` `src/*.ts` `bare.md`.",
          "See [guide](docs/guide.md#anchor) [web](https://example.com/a.md) [up](../outside.md) [loc](#top) [m](mailto:a@b.c).",
          "```",
          "`fence/only.ts`",
          "```"
        ),
        "src/app/globals.css": "x",
        "docs/guide.md": "x",
        "design/DESIGN.md": "x",
      });
      const { v, byId } = counters(root);
      // globals.css, missing/file.ts, docs, nodir, design/DESIGN.md, docs/guide.md, ../outside.md
      expect(v("legibility.path_refs.distinct")).toBe(7);
      expect(v("legibility.path_refs.resolved")).toBe(4);
      expect(byId["legibility.path_refs.resolved"].detail.paths).toEqual(["design/DESIGN.md", "docs", "docs/guide.md", "src/app/globals.css"]);
      expect(v("legibility.path_refs.unresolved")).toBe(3);
      expect(byId["legibility.path_refs.unresolved"].detail.paths).toEqual(["../outside.md", "nodir", "src/missing/file.ts"]);
    });

    test("a link resolves from the file's own directory, a code span from the repo root", () => {
      const root = repo({
        ".github/copilot-instructions.md": lf("[t](ISSUE_TEMPLATE/bug.md)", "`ISSUE_TEMPLATE/bug.md`"),
        ".github/ISSUE_TEMPLATE/bug.md": "x",
      });
      const { v, byId } = counters(root);
      expect(byId["legibility.path_refs.resolved"].detail.paths).toEqual([".github/ISSUE_TEMPLATE/bug.md"]);
      expect(byId["legibility.path_refs.unresolved"].detail.paths).toEqual(["ISSUE_TEMPLATE/bug.md"]);
      expect(v("legibility.path_refs.distinct")).toBe(2);
    });

    test("a pointer written twice counts once", () => {
      const { v } = counters(repo({ "CLAUDE.md": "`a/b.md` and `a/b.md` and [x](a/b.md)\n" }));
      expect(v("legibility.path_refs.distinct")).toBe(1);
    });
  });

  describe("skills named vs installed", () => {
    const root = () => repo({
      "CLAUDE.md": lf(
        "`/init-experiment` → `/write-variants` → `/clear` and `/docs` and `/for/<persona>` and `/atlas update`",
        "and /prose-only and `/Upper` and `/plugin:skill`",
        "```",
        "`/in-fence`",
        "```"
      ),
      ".claude/skills/init-experiment/SKILL.md": "x",
      ".claude/skills/atlas/SKILL.md": "x",
      ".claude/skills/loose.md": "x",
      ".claude/skills/nested/deeper/SKILL.md": "x",
      "packages/x/pipelines/write-variants/SKILL.md": "x",
      "node_modules/p/foo/SKILL.md": "x",
    });

    test("named slash tokens, those with a SKILL.md somewhere, those installed", () => {
      const { v, byId } = counters(root());
      expect(byId["legibility.skills.slash_tokens_named"].detail.names).toEqual(["atlas", "clear", "docs", "init-experiment", "write-variants"]);
      expect(v("legibility.skills.slash_tokens_named")).toBe(5);
      // atlas, init-experiment, write-variants have a SKILL.md in the repo; clear and docs do not
      expect(v("legibility.skills.named_with_skill_md_in_repo")).toBe(3);
      expect(byId["legibility.skills.named_with_skill_md_in_repo"].detail.notInstalled).toEqual(["write-variants"]);
      expect(v("legibility.skills.named_installed")).toBe(2);
      expect(byId["legibility.skills.named_installed"].detail.names).toEqual(["atlas", "init-experiment"]);
    });

    test("installed skills, skill dirs and every SKILL.md in the repo", () => {
      const { v, byId } = counters(root());
      expect(v("legibility.skills.installed")).toBe(2); // atlas, init-experiment (nested/deeper is two levels down)
      expect(v("legibility.skills.skill_dirs")).toBe(3); // atlas, init-experiment, nested
      expect(byId["legibility.skills.skill_dirs"].detail.names).toEqual(["atlas", "init-experiment", "nested"]);
      expect(v("legibility.skills.skill_md_in_repo")).toBe(4); // node_modules is skipped
      expect(byId["legibility.skills.skill_md_in_repo"].detail.installedUnderClaudeSkills).toBe(3);
    });

    test("worktree checkouts and dependency/build directories do not inflate the repo-wide SKILL.md count", () => {
      const skipped = [
        ".claude/worktrees/w1/.claude/skills/foo/SKILL.md",
        ".claude/worktrees/w1/packages/p/SKILL.md",
        "vendor/a/SKILL.md",
        ".venv/b/SKILL.md",
        "venv/b/SKILL.md",
        "target/c/SKILL.md",
        ".yarn/d/SKILL.md",
        ".turbo/e/SKILL.md",
        ".vercel/f/SKILL.md",
        "pkg/vendor/deep/SKILL.md", // at any depth
      ];
      const counted = [
        ".claude/skills/foo/SKILL.md",
        "packages/x/pipelines/y/SKILL.md",
        "docs/targets/SKILL.md", // "targets" is not "target"
        "src/worktrees/z/SKILL.md", // "worktrees" only matters directly under .claude
        "SKILL.md",
      ];
      const files = { "CLAUDE.md": "`/foo` `/a` `/y`\n", "node_modules/p/SKILL.md": "x" };
      for (const f of [...skipped, ...counted]) files[f] = "x";
      const { v, byId } = counters(repo(files));
      expect(v("legibility.skills.skill_md_in_repo")).toBe(5);
      const detail = byId["legibility.skills.skill_md_in_repo"].detail;
      expect(detail.skippedBySkipList).toBe(10); // node_modules is skipped by the walk itself and is not in this number
      expect(detail.installedUnderClaudeSkills).toBe(1);
      expect(detail.byTopDir).toEqual({ ".claude": 1, "(root)": 1, docs: 1, packages: 1, src: 1 });
      expect(byId["legibility.skills.skill_md_in_repo"].notes.join(" ")).toMatch(/10 more SKILL\.md file\(s\) sit under \.claude\/worktrees, vendor/);
      expect(byId["legibility.skills.skill_md_in_repo"].definition.fileSet).toMatch(/\.claude\/worktrees, vendor, \.venv, venv, target, \.yarn, \.turbo, \.vercel/);
      // /foo and /y have a SKILL.md outside the skip list; /a only has one under vendor/
      expect(v("legibility.skills.named_with_skill_md_in_repo")).toBe(2);
      expect(byId["legibility.skills.named_with_skill_md_in_repo"].detail.names).toEqual(["foo", "y"]);
      expect(v("legibility.skills.installed")).toBe(1);
    });

    test("no instruction file and no .claude/skills → zeros", () => {
      const { v } = counters(repo({ "README.md": "x" }));
      for (const id of ["slash_tokens_named", "named_with_skill_md_in_repo", "named_installed", "installed", "skill_dirs", "skill_md_in_repo"]) {
        expect(v(`legibility.skills.${id}`)).toBe(0);
      }
    });
  });

  describe("freshness against the HEAD commit date", () => {
    const text = lf(
      "# Briefing",
      "## Current Status (2026-07-09)",
      "Updated 2026-07-10 and 2026-13-45 (invalid) and 2026-10-12 (future) and v2026-07-11 and 2026-07-09-12 and a2026-07-09.",
      "```",
      "## Status (2026-09-30) inside a fence",
      "```"
    );

    test("newest ISO date, status-heading date, ages in calendar days, dates after HEAD", () => {
      const { v, byId } = counters(repo({ "CLAUDE.md": text }));
      // valid dates: 07-09, 07-10, 10-12, and the one in the fence (09-30); glued/invalid forms are ignored
      expect(v("legibility.freshness.newest_iso_date")).toBe("2026-10-12");
      expect(v("legibility.freshness.newest_iso_date_age_days")).toBe(-1); // one day after HEAD
      expect(byId["legibility.freshness.newest_iso_date_age_days"].detail).toEqual({ datesAfterHead: 1, headCommitDay: "2026-10-11" });
      // headings only: the fenced "Status" heading does not count
      expect(v("legibility.freshness.status_heading_date")).toBe("2026-07-09");
      expect(v("legibility.freshness.status_heading_age_days")).toBe(94);
      expect(byId["legibility.freshness.newest_iso_date"].detail.byFile).toEqual({ "CLAUDE.md": "2026-10-12" });
    });

    test("a date glued to other characters is not a date, even when it is the only one", () => {
      const { v, byId } = counters(repo({ "CLAUDE.md": lf("# x", "see v2026-07-11, a2026-07-09, _2026-07-08, pre-2026-07-07,", "2026-07-06-12, 2026-07-0512 and 2026-07-049.") }));
      expect(v("legibility.freshness.newest_iso_date")).toBeNull();
      expect(v("legibility.freshness.newest_iso_date_age_days")).toBeNull();
      expect(byId["legibility.freshness.newest_iso_date"].notes).toEqual(["no ISO date in any root instruction file"]);
      // the same dates standing alone are dates
      const alone = counters(repo({ "CLAUDE.md": "(2026-07-11), 2026-07-09.\n" }));
      expect(alone.v("legibility.freshness.newest_iso_date")).toBe("2026-07-11");
    });

    test("the status date comes only from a heading that says status; a status line in prose or a dated heading without it is not one", () => {
      const prose = counters(repo({ "CLAUDE.md": lf("# Doc", "## Current Status", "Status: last updated 2026-10-10", "## Release 2026-10-09") }));
      expect(prose.v("legibility.freshness.status_heading_date")).toBeNull();
      expect(prose.v("legibility.freshness.status_heading_age_days")).toBeNull();
      expect(prose.byId["legibility.freshness.status_heading_date"].notes).toEqual(["no status heading carries an ISO date"]);
      expect(prose.v("legibility.freshness.newest_iso_date")).toBe("2026-10-10"); // the dates are still there for the whole-text counter
      const heading = counters(repo({ "CLAUDE.md": lf("# Doc", "Status: 2026-10-10", "## status of things (2026-08-01)") }));
      expect(heading.v("legibility.freshness.status_heading_date")).toBe("2026-08-01"); // "status" in any case, in a heading
    });

    test("the newest date is the maximum over all instruction files, with a per-file breakdown", () => {
      const root = repo({ "CLAUDE.md": "# a\nupdated 2026-03-01\n", "AGENTS.md": "# b\nupdated 2026-01-01\n", ".github/copilot-instructions.md": "# c\n" });
      const { v, byId } = counters(root);
      expect(v("legibility.freshness.newest_iso_date")).toBe("2026-03-01");
      expect(byId["legibility.freshness.newest_iso_date"].detail.byFile).toEqual({
        ".github/copilot-instructions.md": null,
        "AGENTS.md": "2026-01-01",
        "CLAUDE.md": "2026-03-01",
      });
      // 2026-03-01 → 2026-10-11: Mar 1→Apr 1 is 31, then 30, 31, 30, 31, 31, 30 (to Oct 1), then 10 = 224
      expect(v("legibility.freshness.newest_iso_date_age_days")).toBe(Math.round((Date.UTC(2026, 9, 11) - Date.UTC(2026, 2, 1)) / 86400000));
      expect(v("legibility.freshness.newest_iso_date_age_days")).toBe(224);
      expect(v("legibility.freshness.status_heading_date")).toBeNull();
      expect(v("legibility.freshness.status_heading_age_days")).toBeNull();
    });

    test("no git history: dates are found, ages are null with a note, today is never used", () => {
      const { v, byId } = counters(repo({ "CLAUDE.md": "# s\n## Status 2026-07-09\n" }), null);
      expect(v("legibility.freshness.newest_iso_date")).toBe("2026-07-09");
      expect(v("legibility.freshness.newest_iso_date_age_days")).toBeNull();
      expect(v("legibility.freshness.status_heading_age_days")).toBeNull();
      expect(byId["legibility.freshness.newest_iso_date_age_days"].notes.join(" ")).toMatch(/no git history/);
    });

    test("no dates and no files give null with a reason", () => {
      const noDates = counters(repo({ "CLAUDE.md": "# nothing dated\n" }));
      expect(noDates.v("legibility.freshness.newest_iso_date")).toBeNull();
      expect(noDates.byId["legibility.freshness.newest_iso_date"].notes).toEqual(["no ISO date in any root instruction file"]);
      const noFiles = counters(repo({ "README.md": "x" }));
      expect(noFiles.v("legibility.freshness.newest_iso_date_age_days")).toBeNull();
      expect(noFiles.byId["legibility.freshness.newest_iso_date"].notes).toEqual(["no root instruction file present"]);
    });

    test("end to end with a real commit", () => {
      const root = repo({ "CLAUDE.md": "# s\n## Current Status (2026-07-09)\n" });
      commitAll(root, "2026-10-11T08:00:00+00:00");
      const r = run(root, { groups: ["legibility"] });
      expect(val(r, "legibility.freshness.status_heading_date")).toBe("2026-07-09");
      expect(val(r, "legibility.freshness.status_heading_age_days")).toBe(94);
    });
  });

  describe("systemix.config.yaml", () => {
    const FULL = lf(
      "version: 1",
      "design:",
      "  source: design",
      "hermes:",
      "  autonomy: assisted",
      "trust:",
      "  orchestrator_tier: 1",
      "  hermes_tier: 0",
      "self_improvement:",
      "  mode: audit",
      "signals:",
      "  posthog:",
      "    enabled: true",
      "  vercel:",
      "    enabled: false",
      "  figma:",
      "    enabled: true",
      "  odd: x"
    );

    test("autonomy, tiers, design block, signals and self-improvement mode", () => {
      const { v, byId } = counters(repo({ "systemix.config.yaml": FULL }));
      expect(v("legibility.config.exists")).toBe(true);
      expect(v("legibility.config.top_level_keys")).toBe(6);
      expect(byId["legibility.config.top_level_keys"].detail.keys).toEqual(["design", "hermes", "self_improvement", "signals", "trust", "version"]);
      expect(v("legibility.config.autonomy")).toBe("assisted");
      expect(byId["legibility.config.autonomy"].detail).toEqual({ source: "hermes.autonomy", orchestratorTier: 1, hermesTier: 0 });
      expect(v("legibility.config.self_improvement_mode")).toBe("audit");
      expect(v("legibility.config.design_block")).toBe(true);
      expect(v("legibility.config.signals_enabled")).toBe(2);
      expect(byId["legibility.config.signals_enabled"].detail).toEqual({ enabled: ["figma", "posthog"], disabled: ["vercel"] });
      expect(v("legibility.config.posthog_signal_enabled")).toBe(true);
    });

    test("a top-level autonomy key is the fallback; an empty design: is not a block", () => {
      const { v, byId } = counters(repo({ "systemix.config.yaml": lf("autonomy: ghost", "design:", "signals:", "  posthog:", "    enabled: false") }));
      expect(v("legibility.config.autonomy")).toBe("ghost");
      expect(byId["legibility.config.autonomy"].detail.source).toBe("autonomy");
      expect(v("legibility.config.design_block")).toBe(false);
      expect(v("legibility.config.posthog_signal_enabled")).toBe(false);
      expect(v("legibility.config.signals_enabled")).toBe(0);
    });

    test("a signal with no enabled key is neither enabled nor disabled", () => {
      const { v, byId } = counters(repo({
        "systemix.config.yaml": lf("signals:", "  sentry:", "    dsn: x", "  posthog:", "    enabled: true", "  figma:", "    enabled: false", "  loose: yes"),
      }));
      expect(v("legibility.config.signals_enabled")).toBe(1);
      expect(byId["legibility.config.signals_enabled"].detail).toEqual({ enabled: ["posthog"], disabled: ["figma"] });
    });

    test("no config: false/null/0 with a note", () => {
      const { v, byId } = counters(repo({ "README.md": "x" }));
      expect(v("legibility.config.exists")).toBe(false);
      expect(v("legibility.config.autonomy")).toBeNull();
      expect(v("legibility.config.self_improvement_mode")).toBeNull();
      expect(v("legibility.config.design_block")).toBe(false);
      expect(v("legibility.config.top_level_keys")).toBe(0);
      expect(v("legibility.config.signals_enabled")).toBe(0);
      expect(byId["legibility.config.autonomy"].notes).toEqual(["no systemix.config.yaml"]);
    });
  });

  describe("symlinks that leave the repo", () => {
    const link = (target, at) => {
      fs.mkdirSync(path.dirname(at), { recursive: true });
      fs.symlinkSync(target, at);
    };
    const SECRET = lf("# Secret", "## Two", "see guardrails and Guardrails, ~/x/y, `src/a.ts`", "Status 2026-10-11 and 2026-10-12");

    test("an instruction file that resolves outside the repo reads as absent, whatever its name", () => {
      const out = repo({ "secret.md": SECRET, "rules/a.mdc": "# rule\n", "gh/copilot-instructions.md": "# gh\n", "skills/s/SKILL.md": "x", "cfg.yaml": "autonomy: autonomous\nsignals:\n  posthog:\n    enabled: true\n", "pkg.json": JSON.stringify({ dependencies: { "posthog-js": "1" } }) });
      const root = repo({ "README.md": "x" });
      link(path.join(out, "secret.md"), path.join(root, "AGENTS.md"));
      link(path.join(out, "secret.md"), path.join(root, "CLAUDE.md"));
      link(path.join(out, "rules"), path.join(root, ".cursor/rules"));
      link(path.join(out, "gh"), path.join(root, ".github")); // the link is a parent of the instruction file
      link(path.join(out, "skills"), path.join(root, ".claude/skills"));
      link(path.join(out, "cfg.yaml"), path.join(root, "systemix.config.yaml"));
      link(path.join(out, "pkg.json"), path.join(root, "package.json"));
      const { v, byId } = counters(root);
      for (const f of ["claude_md", "agents_md", "cursor_rules", "copilot_instructions"]) {
        expect(v(`legibility.${f}.exists`)).toBe(false);
        expect(v(`legibility.${f}.lines`)).toBe(0);
        expect(v(`legibility.${f}.headings`)).toBe(0);
      }
      expect(byId["legibility.agents_md.exists"].notes).toEqual(["AGENTS.md is a symlink that resolves outside the repo and was ignored"]);
      expect(byId["legibility.agents_md.lines"].notes).toEqual(["AGENTS.md is a symlink that resolves outside the repo and was ignored"]);
      expect(byId["legibility.cursor_rules.exists"].notes).toEqual([".cursor/rules is a symlink that resolves outside the repo and was ignored"]);
      expect(v("legibility.instructions.present")).toBe(0);
      expect(v("legibility.guardrails.mentions")).toBe(0);
      expect(v("legibility.machine_paths.matches")).toBe(0);
      expect(v("legibility.path_refs.distinct")).toBe(0);
      expect(v("legibility.freshness.newest_iso_date")).toBeNull();
      expect(v("legibility.skills.installed")).toBe(0);
      expect(v("legibility.skills.skill_md_in_repo")).toBe(0);
      expect(v("legibility.config.exists")).toBe(false);
      expect(v("legibility.config.autonomy")).toBeNull();
      expect(v("legibility.config.posthog_signal_enabled")).toBe(false);
      expect(byId["legibility.config.autonomy"].notes).toEqual(["systemix.config.yaml is a symlink that resolves outside the repo and was ignored"]);
      expect(v("legibility.posthog.dependency_declared")).toBe(false);
      expect(byId["legibility.posthog.dependency_declared"].notes).toEqual(["package.json is a symlink that resolves outside the repo and was ignored"]);
      const warnings = run(root, { groups: ["legibility"] }).warnings;
      expect(warnings).toEqual(expect.arrayContaining([
        "symlink resolves outside the repo: AGENTS.md",
        "symlink resolves outside the repo: .cursor/rules",
        "symlink resolves outside the repo: .claude/skills",
      ]));
    });

    test("a symlink that stays inside the repo is read like the file it points at", () => {
      const root = repo({ "AGENTS.md": SECRET });
      link("AGENTS.md", path.join(root, "CLAUDE.md")); // the common CLAUDE.md -> AGENTS.md setup
      const { v } = counters(root);
      expect(v("legibility.claude_md.exists")).toBe(true);
      expect(v("legibility.claude_md.lines")).toBe(4);
      expect(v("legibility.claude_md.headings")).toBe(2);
      expect(v("legibility.agents_md.lines")).toBe(4);
      expect(v("legibility.guardrails.mentions")).toBe(4); // 2 per file, both files read
      expect(run(root, { groups: ["legibility"] }).warnings.filter((w) => /symlink/.test(w))).toEqual([]);
    });

    test("a dangling or self-looping instruction file is just missing", () => {
      const root = repo({ "README.md": "x" });
      link("nowhere.md", path.join(root, "AGENTS.md"));
      link("CLAUDE.md", path.join(root, "CLAUDE.md"));
      const { v, byId } = counters(root);
      expect(v("legibility.agents_md.exists")).toBe(false);
      expect(v("legibility.claude_md.exists")).toBe(false);
      expect(byId["legibility.agents_md.lines"].notes).toEqual(["AGENTS.md not present"]);
    });
  });

  describe("timezone independence", () => {
    const COUNTERS_DIR = path.join(__dirname, "../../../src/lib/counters");
    const CHILD = `
      const [dir, root, commitDate] = process.argv.slice(1);
      const { createContext } = require(dir + "/context");
      const legibility = require(dir + "/legibility");
      const ctx = createContext(root);
      const list = legibility.run({ ...ctx, git: { commit: "abc", commitDate, dirty: false } });
      const out = { offset: new Date(2026, 6, 8).getTimezoneOffset() };
      for (const c of list) out[c.id] = c.value;
      process.stdout.write(JSON.stringify(out));
    `;
    const inZone = (tz, root, commitDate) =>
      JSON.parse(execFileSync(process.execPath, ["-e", CHILD, COUNTERS_DIR, root, commitDate], { env: { ...process.env, TZ: tz }, encoding: "utf8" }));

    test("dates in the instruction files are read as UTC whatever the machine timezone", () => {
      // date-only values are UTC midnight; read as local midnight they would land on the previous UTC day in Auckland and Kolkata
      const root = repo({ "CLAUDE.md": lf("# Doc", "## Current Status (2026-10-11)", "Updated 2026-10-12.") });
      for (const tz of ["UTC", "America/Los_Angeles", "Pacific/Auckland", "Asia/Kolkata"]) {
        const out = inZone(tz, root, "2026-10-12T00:10:00");
        if (tz === "UTC") expect(out.offset).toBe(0);
        else expect(out.offset).not.toBe(0);
        expect(out["legibility.freshness.newest_iso_date"]).toBe("2026-10-12");
        expect(out["legibility.freshness.status_heading_date"]).toBe("2026-10-11");
        // HEAD 00:10 on the 12th (zone-less = UTC): 0 days after the newest date, 1 after the status date
        expect(out["legibility.freshness.newest_iso_date_age_days"]).toBe(0);
        expect(out["legibility.freshness.status_heading_age_days"]).toBe(1);
      }
    });
  });

  describe("posthog", () => {
    test("dependency in package.json, and the two case rules over the census", () => {
      const root = repo({
        "package.json": JSON.stringify({ dependencies: { "posthog-js": "^1.0.0", react: "1" }, devDependencies: { "posthog-node": "^2.0.0" } }),
        "src/a.ts": "import posthog from 'posthog-js';\n", // lowercase: 2 matches
        "src/b.ts": "// PostHog is great\nconst k = POSTHOG_KEY;\n", // any case: 2, lowercase: 0
        "src/c.ts": "nothing\n",
        "src/a.test.ts": "posthog\n", // tests are in the census
        "docs/d.ts": "posthog\n", // outside the audited dirs
      });
      const { v, byId } = counters(root, HEAD, { dirs: ["src"] });
      expect(v("legibility.posthog.dependency_declared")).toBe(true);
      expect(byId["legibility.posthog.dependency_declared"].detail.declared).toEqual({
        "dependencies:posthog-js": "^1.0.0",
        "devDependencies:posthog-node": "^2.0.0",
      });
      expect(v("legibility.posthog.files_any_case")).toBe(3);
      expect(byId["legibility.posthog.files_any_case"].perFile).toEqual([
        { file: "src/a.ts", count: 2 },
        { file: "src/b.ts", count: 2 },
        { file: "src/a.test.ts", count: 1 },
      ]);
      expect(v("legibility.posthog.files_lowercase")).toBe(2);
      expect(byId["legibility.posthog.files_lowercase"].perFile).toEqual([
        { file: "src/a.ts", count: 2 },
        { file: "src/a.test.ts", count: 1 },
      ]);
    });

    test("no dependency, no package.json, invalid package.json", () => {
      expect(counters(repo({ "package.json": JSON.stringify({ dependencies: { react: "1" } }) })).v("legibility.posthog.dependency_declared")).toBe(false);
      const none = counters(repo({ "README.md": "x" }));
      expect(none.v("legibility.posthog.dependency_declared")).toBe(false);
      expect(none.byId["legibility.posthog.dependency_declared"].notes).toEqual(["no package.json at the repo root"]);
      const bad = counters(repo({ "package.json": "{oops" }));
      expect(bad.v("legibility.posthog.dependency_declared")).toBe(false);
      expect(bad.byId["legibility.posthog.dependency_declared"].notes).toEqual(["package.json is not valid JSON"]);
    });
  });

  describe("robustness", () => {
    test("same tree, same bytes; ids start with the group, are unique, and the report validates", () => {
      const root = repo({
        "CLAUDE.md": "# a\nsee ~/x/y.md and `src/a.ts`\n## Status 2026-07-09\n",
        "src/a.ts": "posthog\n",
        "systemix.config.yaml": "version: 1\n",
      });
      const a = run(root, { dirs: ["src"], groups: ["legibility"] });
      const b = run(root, { dirs: ["src"], groups: ["legibility"] });
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      expect(a.counters.every((c) => c.id.startsWith("legibility.") && c.group === "legibility")).toBe(true);
      expect(new Set(a.counters.map((c) => c.id)).size).toBe(a.counters.length);
    });

    test("an empty repo produces the full, stable id list with no crash (ids are API)", () => {
      const r = run(repo({}), { groups: ["legibility"] });
      expect(val(r, "legibility.instructions.present")).toBe(0);
      expect(val(r, "legibility.posthog.files_any_case")).toBe(0);
      expect(r.counters.map((c) => c.id)).toEqual([
        "legibility.agents_md.exists",
        "legibility.agents_md.headings",
        "legibility.agents_md.lines",
        "legibility.claude_md.exists",
        "legibility.claude_md.headings",
        "legibility.claude_md.lines",
        "legibility.config.autonomy",
        "legibility.config.design_block",
        "legibility.config.exists",
        "legibility.config.posthog_signal_enabled",
        "legibility.config.self_improvement_mode",
        "legibility.config.signals_enabled",
        "legibility.config.top_level_keys",
        "legibility.copilot_instructions.exists",
        "legibility.copilot_instructions.headings",
        "legibility.copilot_instructions.lines",
        "legibility.cursor_rules.exists",
        "legibility.cursor_rules.headings",
        "legibility.cursor_rules.lines",
        "legibility.freshness.newest_iso_date",
        "legibility.freshness.newest_iso_date_age_days",
        "legibility.freshness.status_heading_age_days",
        "legibility.freshness.status_heading_date",
        "legibility.guardrails.files_mentioning",
        "legibility.guardrails.mentions",
        "legibility.instructions.imports",
        "legibility.instructions.present",
        "legibility.machine_paths.matches",
        "legibility.path_refs.distinct",
        "legibility.path_refs.resolved",
        "legibility.path_refs.unresolved",
        "legibility.posthog.dependency_declared",
        "legibility.posthog.files_any_case",
        "legibility.posthog.files_lowercase",
        "legibility.skills.installed",
        "legibility.skills.named_installed",
        "legibility.skills.named_with_skill_md_in_repo",
        "legibility.skills.skill_dirs",
        "legibility.skills.skill_md_in_repo",
        "legibility.skills.slash_tokens_named",
      ]);
    });

    test("a one-line minified instruction file does not hang the scanners", () => {
      const root = repo({ "CLAUDE.md": "[".repeat(300000) + "](" + "`".repeat(1000) + "\n" });
      const t0 = Date.now();
      const { v } = counters(root);
      expect(Date.now() - t0).toBeLessThan(3000);
      expect(v("legibility.claude_md.lines")).toBe(1);
    });
  });
});

function commitAll(root, iso) {
  const env = { ...process.env, GIT_AUTHOR_DATE: iso, GIT_COMMITTER_DATE: iso, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null" };
  const git = (...args) =>
    execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false", ...args], { cwd: root, env, stdio: "ignore" });
  git("init", "-q");
  git("add", "-A");
  git("commit", "-q", "-m", "fixture");
}
