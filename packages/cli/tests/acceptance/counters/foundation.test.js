/**
 * foundation.test.js — the shared layer under every counter group and under
 * `drift scan`: lib/design-source.js (token-source resolution, the audited
 * population), counters/context.js (git provenance) and counters/counter.js
 * (the counter builder and report validator). Each test is a defect found while
 * integrating the groups; every expectation is hand-computed from a tiny temp
 * repo, never from the live repo.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { makeRepo, removeRepo, run, get, val } = require("./helpers");
const ds = require("../../../src/lib/design-source");
const { createContext } = require("../../../src/lib/counters/context");
const { counter, validateReport } = require("../../../src/lib/counters/counter");
const { scanProject } = require("../../../src/commands/drift");

const css = (...props) => `:root {\n${props.map((p, i) => `  --${p}: ${i};`).join("\n")}\n}\n`;
const FIVE = css("a", "b", "c", "d", "e");

describe("foundation", () => {
  const roots = [];
  const repo = (files) => {
    const root = makeRepo(files);
    roots.push(root);
    return root;
  };
  afterEach(() => roots.splice(0).forEach(removeRepo));

  describe("token-source resolution", () => {
    test("a design doc line of any length cannot hang the canonical-file search", () => {
      // CSS_REF_RE backtracks on a long run of path characters: 80,000 characters took 8.7 s, 300,000 minutes
      for (const line of ["canonical " + "a".repeat(300000), "canonical " + "a".repeat(300000) + ".css", "canonical " + "x/".repeat(150000) + "f.css"]) {
        const root = repo({ "design/DESIGN.md": line + "\n", "src/theme.css": FIVE });
        const t0 = Date.now();
        const source = ds.resolveTokenSource(root, ["src"]);
        expect(Date.now() - t0).toBeLessThan(1000);
        expect(source.rel).toBe("src/theme.css"); // fell through to step 4
        expect(source.via).toBe("most-custom-properties");
      }
    });

    test("a short canonical line still names the file", () => {
      const root = repo({
        "design/DESIGN.md": "Tokens live in `src/app/globals.css`, the single source of truth.\n",
        "src/app/globals.css": css("a", "b"),
        "src/zz.css": FIVE,
      });
      const source = ds.resolveTokenSource(root, ["src"]);
      expect(source.rel).toBe("src/app/globals.css");
      expect(source.via).toBe("doc:design/DESIGN.md");
    });

    test("a bare file name in a design doc is found whatever subfolder is audited", () => {
      const root = repo({
        "design/DESIGN.md": "`globals.css` is the single source of truth.\n",
        "src/app/globals.css": css("a", "b"),
        "lib/x.ts": "export {};\n",
      });
      expect(ds.resolveTokenSource(root, ["src"]).rel).toBe("src/app/globals.css");
      expect(ds.resolveTokenSource(root, ["lib"]).rel).toBe("src/app/globals.css"); // narrowing dirs does not lose it
    });

    test("a token file starting with a BOM and using CRLF counts like the context reads it", () => {
      const root = repo({ "design/tokens.css": "﻿--first: 1;\r\n:root {\r\n  --a: #fff;\r\n}\r\n" });
      expect(ds.resolveTokenSource(root, ["src"]).customProperties).toBe(2);
      expect(val(run(root, { groups: ["tokens"] }), "tokens.custom_properties.distinct")).toBe(2);
    });

    test("design.tokens (the key the local app reads) is accepted; design.source wins when both resolve", () => {
      const only = repo({ "systemix.config.yaml": "design:\n  tokens: styles/t.css\n", "styles/t.css": css("a") });
      expect(ds.resolveTokenSource(only, ["src"])).toMatchObject({ rel: "styles/t.css", via: "config:design.tokens" });

      const both = repo({
        "systemix.config.yaml": "design:\n  source: styles/s.css\n  tokens: styles/t.css\n",
        "styles/s.css": css("a"),
        "styles/t.css": css("a"),
      });
      expect(ds.resolveTokenSource(both, ["src"])).toMatchObject({ rel: "styles/s.css", via: "config:design.source" });

      // an unusable design.source (the marker "design", or a missing file) falls through to design.tokens
      const marker = repo({ "systemix.config.yaml": "design:\n  source: design\n  tokens: styles/t.css\n", "styles/t.css": css("a") });
      expect(ds.resolveTokenSource(marker, ["src"]).via).toBe("config:design.tokens");
      const missing = repo({ "systemix.config.yaml": "design:\n  source: nope.css\n  tokens: styles/t.css\n", "styles/t.css": css("a") });
      expect(ds.resolveTokenSource(missing, ["src"]).via).toBe("config:design.tokens");
    });

    test("design.tokens may not point outside the repo", () => {
      const root = repo({ "systemix.config.yaml": "design:\n  tokens: ../outside.css\n" });
      expect(ds.resolveTokenSource(root, ["src"]).via).toBe("none");
    });
  });

  describe("the audited population", () => {
    test("a file named as a dir is judged by its own name, not by a parent folder that contains '.generated.'", () => {
      const root = repo({ "x.generated.d/src/a.ts": "export {};\n", "src/b.generated.ts": "export {};\n" });
      expect(ds.listFiles(root, ["x.generated.d/src/a.ts"]).map((f) => f.rel)).toEqual(["x.generated.d/src/a.ts"]);
      expect(ds.listFiles(root, ["src/b.generated.ts"])).toEqual([]); // the file itself is generated
    });

    test("dirs that name the same folder twice are listed once", () => {
      const root = repo({ "src/a.ts": "export {};\n" });
      const pop = ds.population(root, ["src", "./src", "src/"]);
      expect(pop.dirs).toEqual(["src"]);
      expect(pop.census.map((f) => f.rel)).toEqual(["src/a.ts"]);
    });

    describe("a symlink that leaves the repo", () => {
      const link = (target, at) => fs.symlinkSync(target, at);

      test("is refused like a `..` path: not walked, not listed, reported as rejected", () => {
        const outside = repo({ "leak.ts": "export {};\n", "deeper/leak2.tsx": "export {};\n" });
        const root = repo({ "src/a.ts": "export {};\n" });
        link(outside, path.join(root, "evil"));
        expect(ds.safeJoin(root, "evil")).toBeNull();
        expect(ds.listFiles(root, ["evil"])).toEqual([]);
        const pop = ds.population(root, ["src", "evil"]);
        expect(pop.dirs).toEqual(["src"]);
        expect(pop.rejectedDirs).toEqual(["evil"]);
        expect(pop.census.map((f) => f.rel)).toEqual(["src/a.ts"]);

        const ctx = createContext(root, { dirs: ["src", "evil"] });
        expect(ctx.warnings).toContain("audited dir outside the repo root was ignored: evil");
        expect(ctx.listTree("evil")).toEqual([]); // listTree uses the same guard
        expect(scanProject(root, ["evil"]).rejectedDirs).toEqual(["evil"]);
      });

      test("a symlink that stays inside the repo is still followed", () => {
        const root = repo({ "real/a.ts": "export {};\n" });
        link(path.join(root, "real"), path.join(root, "alias"));
        expect(ds.safeJoin(root, "alias")).toBe(path.join(root, "alias"));
        expect(ds.listFiles(root, ["alias"]).map((f) => f.rel)).toEqual(["alias/a.ts"]);
      });

      test("a dangling link is simply missing", () => {
        const root = repo({ "src/a.ts": "export {};\n" });
        link(path.join(root, "nowhere"), path.join(root, "ghost"));
        const pop = ds.population(root, ["ghost"]);
        expect(pop.missingDirs).toEqual(["ghost"]);
        expect(pop.rejectedDirs).toEqual([]);
      });

      test("a root that is itself reached through a symlink still works", () => {
        const real = repo({ "src/a.ts": "export {};\n" });
        const holder = repo({});
        const alias = path.join(holder, "alias");
        link(real, alias);
        expect(ds.population(alias, ["src"]).census.map((f) => f.rel)).toEqual(["src/a.ts"]);
      });
    });

    describe("folders skipped by name", () => {
      const files = {
        "src/ok/a.tsx": "export {};\n",
        "src/build/a.tsx": "export {};\n",
        "src/ui/reference/b.tsx": "export {};\n",
        "src/lib/out/c.ts": "export {};\n",
        "src/app/(shop)/vendor/page.tsx": "export {};\n",
        "src/generated/x.tsx": "export {};\n",
      };

      test("are not audited, and every one that holds source files is listed, sorted", () => {
        const root = repo(files);
        const pop = ds.population(root, ["src"]);
        expect(pop.census.map((f) => f.rel)).toEqual(["src/ok/a.tsx"]);
        expect(pop.skippedDirs).toEqual(["src/app/(shop)/vendor", "src/build", "src/generated", "src/lib/out", "src/ui/reference"]);
      });

      test("the report and the context warn instead of dropping them silently", () => {
        const root = repo(files);
        const report = run(root, { dirs: ["src"], groups: ["census"] });
        expect(report.scope.skippedDirs).toEqual(["src/app/(shop)/vendor", "src/build", "src/generated", "src/lib/out", "src/ui/reference"]);
        expect(report.warnings.some((w) => /folders skipped by name, not audited.*src\/build/.test(w))).toBe(true);
        expect(val(report, "census.files.total")).toBe(1);
      });

      test("dependency and tool output, empty folders and folders without source say nothing", () => {
        const root = repo({
          "src/ok/a.tsx": "export {};\n",
          "src/node_modules/pkg/index.js": "x",
          "src/dist/bundle.js": "x",
          "src/coverage/lcov-report/x.js": "x",
          "src/docs/vendor/README.md": "x",
          "src/lib/out/.gitkeep": "",
          "src/.hidden/a.ts": "x",
        });
        expect(ds.population(root, ["src"]).skippedDirs).toEqual([]);
        expect(run(root, { dirs: ["src"], groups: ["census"] }).scope.skippedDirs).toEqual([]);
      });

      test("a skipped folder you name as the audited dir is audited", () => {
        const root = repo({ "build/a.tsx": "export {};\n" });
        const pop = ds.population(root, ["build"]);
        expect(pop.census.map((f) => f.rel)).toEqual(["build/a.tsx"]);
        expect(pop.skippedDirs).toEqual([]);
      });

      test("a huge skipped tree costs a bounded probe, and is assumed to hold source", () => {
        const many = {};
        for (let i = 0; i < 300; i++) for (let j = 0; j < 10; j++) many[`src/vendor/d${i}/n${j}.md`] = "x";
        const root = repo({ "src/ok/a.ts": "export {};\n", ...many });
        const t0 = Date.now();
        const pop = ds.population(root, ["src"]);
        expect(Date.now() - t0).toBeLessThan(2000);
        expect(pop.skippedDirs).toEqual(["src/vendor"]); // 3000 entries, none of them source: over the probe limit, so listed
      });

      test("`drift scan` carries the same list in its result", () => {
        const root = repo(files);
        expect(scanProject(root, ["src"]).skippedDirs).toEqual(["src/app/(shop)/vendor", "src/build", "src/generated", "src/lib/out", "src/ui/reference"]);
      });
    });
  });

  describe("git provenance", () => {
    const git = (cwd, ...args) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false", ...args], {
      cwd,
      stdio: "ignore",
      env: { ...process.env, GIT_AUTHOR_DATE: "2026-05-01T12:00:00Z", GIT_COMMITTER_DATE: "2026-05-01T12:00:00Z" },
    });

    const commitAll = (root) => {
      git(root, "init", "-q");
      git(root, "add", "-A");
      git(root, "commit", "-q", "-m", "x");
    };

    test("at the top level: prefix is empty; dirty is only computed when asked, and then says tracked changes and new files", () => {
      const root = repo({ "a.ts": "export {};\n" });
      commitAll(root);
      let ctx = createContext(root, { dirs: ["."] });
      expect(ctx.git).toMatchObject({ commitDate: "2026-05-01T12:00:00+00:00", dirty: null, prefix: "" }); // not asked: not computed
      expect(ctx.git.commit).toMatch(/^[0-9a-f]{40}$/);
      expect(ctx.warnings.some((w) => /larger git repository/.test(w))).toBe(false);
      expect(createContext(root, { dirs: ["."], dirty: true }).git.dirty).toBe(false);
      fs.writeFileSync(path.join(root, "a.ts"), "export const x = 1;\n");
      ctx = createContext(root, { dirs: ["."], dirty: true });
      expect(ctx.git.dirty).toBe(true);
      expect(createContext(root, { dirs: ["."] }).git.dirty).toBeNull();
    });

    test("an untracked source file makes the tree dirty: the counters read the working tree, so the provenance flag must see it", () => {
      const root = repo({ "src/a.ts": "export {};\n" });
      commitAll(root);
      expect(createContext(root, { dirs: ["src"], dirty: true }).git.dirty).toBe(false);
      fs.writeFileSync(path.join(root, "src", "untracked.tsx"), 'export const c = "#ff0000";\n');
      const r = run(root, { dirs: ["src"], groups: ["census", "colour"], dirty: true });
      expect(r.repo.dirty).toBe(true);
      expect(val(r, "census.files.total")).toBe(2); // the report counted a file the commit does not hold
      expect(run(root, { dirs: ["src"], groups: ["census"] }).repo.dirty).toBeNull();
    });

    test("a subfolder of a bigger repository says so, and 'dirty' looks at the subfolder only", () => {
      const top = repo({ "pkg/web/a.ts": "export {};\n", "other/b.ts": "export {};\n" });
      commitAll(top);
      const sub = path.join(top, "pkg", "web");
      fs.writeFileSync(path.join(top, "other", "b.ts"), "export const x = 1;\n"); // dirty, but outside the audited folder
      let ctx = createContext(sub, { dirs: ["."], dirty: true });
      expect(ctx.git.prefix).toBe("pkg/web");
      expect(ctx.git.commitDate).toBe("2026-05-01T12:00:00+00:00");
      expect(ctx.git.dirty).toBe(false);
      expect(ctx.warnings.some((w) => /folder pkg\/web of a larger git repository/.test(w))).toBe(true);
      fs.writeFileSync(path.join(sub, "a.ts"), "export const y = 1;\n");
      ctx = createContext(sub, { dirs: ["."], dirty: true });
      expect(ctx.git.dirty).toBe(true);
    });

    test("no git at all: everything is null", () => {
      const root = repo({ "a.ts": "export {};\n" });
      expect(createContext(root, { dirs: ["."] }).git).toEqual({ commit: null, commitDate: null, dirty: null, prefix: null });
      expect(createContext(root, { dirs: ["."], dirty: true }).git.dirty).toBeNull();
    });

    describe("the audit is a function of the tree, not of the environment it runs in", () => {
      const KEYS = ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR", "GIT_OBJECT_DIRECTORY"];
      const saved = {};
      beforeEach(() => KEYS.forEach((k) => { saved[k] = process.env[k]; }));
      afterEach(() => KEYS.forEach((k) => { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }));

      test("GIT_DIR / GIT_WORK_TREE / GIT_INDEX_FILE inherited from a hook or a CI wrapper do not point the audit at another repository", () => {
        const other = repo({ "x.ts": "export {};\n" });
        commitAll(other);
        const plain = repo({ "a.ts": "export {};\n" }); // not a git repository
        const mine = repo({ "a.ts": "export {};\n" });
        git(mine, "init", "-q");
        git(mine, "add", "-A");
        execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "mine"], {
          cwd: mine, stdio: "ignore", env: { ...process.env, GIT_AUTHOR_DATE: "2026-06-01T12:00:00Z", GIT_COMMITTER_DATE: "2026-06-01T12:00:00Z" },
        });
        const clean = createContext(mine, { dirs: ["."] }).git;
        process.env.GIT_DIR = path.join(other, ".git");
        process.env.GIT_WORK_TREE = other;
        process.env.GIT_INDEX_FILE = path.join(other, ".git", "index");
        expect(createContext(plain, { dirs: ["."] }).git).toEqual({ commit: null, commitDate: null, dirty: null, prefix: null });
        expect(createContext(mine, { dirs: ["."], dirty: true }).git).toEqual({ ...clean, dirty: false });
        expect(clean.commitDate).toBe("2026-06-01T12:00:00+00:00");
      });
    });

    describe("dirty is unknown (null), never false, when git cannot tell", () => {
      test("a corrupt index", () => {
        const root = repo({ "a.ts": "export {};\n" });
        commitAll(root);
        fs.writeFileSync(path.join(root, ".git", "index"), "garbage");
        const ctx = createContext(root, { dirs: ["."], dirty: true });
        expect(ctx.git.commit).toMatch(/^[0-9a-f]{40}$/);
        expect(ctx.git.dirty).toBeNull();
      });
    });

    describe("the repository's own .git/config is code from the tree being audited", () => {
      const plant = (root, marker) => {
        const script = path.join(root, "..", `evil-${path.basename(root)}.sh`);
        fs.writeFileSync(script, `#!/bin/sh\necho ran >> ${JSON.stringify(marker)}\ncat\n`, { mode: 0o755 });
        fs.writeFileSync(path.join(root, ".gitattributes"), "* filter=evil\n");
        git(root, "add", "-A");
        git(root, "commit", "-q", "-m", "attributes");
        const config = path.join(root, ".git", "config");
        fs.appendFileSync(config, `[filter "evil"]\n\tclean = ${script}\n[core]\n\tfsmonitor = ${script}\n[log]\n\tshowSignature = true\n[gpg]\n\tprogram = ${script}\n`);
        fs.utimesSync(path.join(root, "a.ts"), new Date(), new Date(Date.now() + 5000)); // stat differs from the index: git would re-hash the file
        return script;
      };

      test("a default audit runs none of it: no clean filter, no fsmonitor, no gpg program", () => {
        const root = repo({ "a.ts": "export {};\n" });
        commitAll(root);
        const marker = path.join(root, "..", `marker-${path.basename(root)}`);
        const script = plant(root, marker);
        const r = run(root, { dirs: ["."] });
        expect(r.repo.commit).toMatch(/^[0-9a-f]{40}$/);
        expect(r.repo.commitDate).toBe("2026-05-01T12:00:00+00:00");
        expect(r.repo.dirty).toBeNull();
        expect(fs.existsSync(marker)).toBe(false);
        fs.rmSync(script, { force: true });
      });

      test("even when dirty is asked for, the fsmonitor hook does not run (the clean filter does: that is why dirty is opt-in)", () => {
        const root = repo({ "a.ts": "export {};\n" });
        commitAll(root);
        const marker = path.join(root, "..", `marker-${path.basename(root)}`);
        const script = path.join(root, "..", `evil-${path.basename(root)}.sh`);
        fs.writeFileSync(script, `#!/bin/sh\necho ran >> ${JSON.stringify(marker)}\necho\n`, { mode: 0o755 });
        fs.appendFileSync(path.join(root, ".git", "config"), `[core]\n\tfsmonitor = ${script}\n`);
        createContext(root, { dirs: ["."], dirty: true });
        expect(fs.existsSync(marker)).toBe(false);
        fs.rmSync(script, { force: true });
      });
    });
  });

  describe("the counter builder and the report validator", () => {
    const base = {
      id: "x.y",
      group: "x",
      kind: "mechanical",
      unit: "match",
      value: 3,
      definition: { summary: "s", regex: null, fileSet: "f" },
    };

    test("perFile rows given as an array are sorted count desc, file asc", () => {
      const c = counter({ ...base, perFile: [{ file: "b", count: 1 }, { file: "z", count: 5 }, { file: "a", count: 1 }] });
      expect(c.perFile).toEqual([{ file: "z", count: 5 }, { file: "a", count: 1 }, { file: "b", count: 1 }]);
    });

    test("perFile rows keep their extra fields; the caller's array is not reordered", () => {
      const rows = [{ file: "b", count: 1, extra: "keep" }, { file: "a", count: 2 }];
      const c = counter({ ...base, perFile: rows });
      expect(c.perFile).toEqual([{ file: "a", count: 2 }, { file: "b", count: 1, extra: "keep" }]);
      expect(rows[0].file).toBe("b");
    });

    test("a perFile row without a string file and a finite count is a bug in the module", () => {
      expect(() => counter({ ...base, perFile: [{ file: "a" }] })).toThrow(/every perFile row/);
      expect(() => counter({ ...base, perFile: [{ count: 1 }] })).toThrow(/every perFile row/);
      expect(() => counter({ ...base, perFile: [{ file: "a", count: NaN }] })).toThrow(/every perFile row/);
    });

    test("validateReport rejects a finished report whose perFile is out of order", () => {
      const good = counter(base);
      const bad = { ...good, perFile: [{ file: "a", count: 1 }, { file: "b", count: 2 }] };
      const report = { schema: "systemix.audit-counters/1", countersVersion: "1.0.0", scope: {}, counters: [bad] };
      expect(validateReport(report)).toEqual(["counter x.y: perFile must be sorted count desc, file asc"]);
      expect(validateReport({ ...report, counters: [{ ...good, perFile: [{ file: "b", count: 2 }, { file: "a", count: 1 }] }] })).toEqual([]);
    });

    test("a ratio is 0..1 with its numerator and denominator; with denominator 0 it is null, explicitly", () => {
      const ratio = { ...base, unit: "ratio", detail: { numerator: 1, denominator: 4 } };
      expect(counter({ ...ratio, value: 0.25 }).value).toBe(0.25);
      expect(() => counter({ ...ratio, value: 1.5 })).toThrow(/within 0..1/);
      expect(() => counter({ ...ratio, value: -0.1 })).toThrow(/within 0..1/);
      expect(() => counter({ ...ratio, value: 0.25, detail: undefined })).toThrow(/numerator and detail.denominator/);
      expect(counter({ ...ratio, value: null, detail: { numerator: 0, denominator: 0 } }).value).toBeNull();
      expect(() => counter({ ...ratio, value: null })).toThrow(/null ratio needs detail.denominator 0/); // a null with a real denominator is a missing number
    });

    test("a boolean is true or false, never null: an unknown answer is false plus a note", () => {
      const bool = { ...base, unit: "boolean", kind: "presence" };
      expect(() => counter({ ...bool, value: null })).toThrow(/boolean needs a boolean/);
      expect(counter({ ...bool, value: false, notes: ["no drift script, so the exit code is unknown"] }).notes).toHaveLength(1);
    });
  });

  describe("colour counters import the scanner's own regexes", () => {
    test("colour.scanner.colour_hits publishes exactly the regexes scanProject runs", () => {
      const { PATTERNS } = require("../../../src/commands/drift");
      const root = repo({ "src/a.tsx": "const a = '#fff'; const b = 'url(#abc)';\n" });
      const report = run(root, { dirs: ["src"], groups: ["colour"] });
      // the scanner runs two patterns: they are published as two, each with its flags, never glued into one string
      const colour = get(report, "colour.scanner.colour_hits").definition;
      expect(colour.regex).toBeNull();
      expect(colour.regexes).toEqual([
        { label: "hex literal", regex: PATTERNS.HEX_RE.source, flags: PATTERNS.HEX_RE.flags },
        { label: "colour function call", regex: PATTERNS.COLOR_FN_RE.source, flags: PATTERNS.COLOR_FN_RE.flags },
      ]);
      expect(get(report, "colour.scanner.px_hits").definition).toMatchObject({ regex: PATTERNS.PX_RE.source, flags: PATTERNS.PX_RE.flags });
      expect(get(report, "colour.hex_scanner.outside_token_source").definition).toMatchObject({ regex: PATTERNS.HEX_RE.source, flags: PATTERNS.HEX_RE.flags });
      expect(val(report, "colour.scanner.colour_hits")).toBe(1); // `url(#abc)` is a reference, not a colour
    });
  });
});
