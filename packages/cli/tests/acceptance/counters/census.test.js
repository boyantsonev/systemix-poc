/**
 * census.test.js — acceptance tests for the `census` counters: the file
 * population every other counter rests on. Every expectation is hand-computed
 * from a tiny temp repo (never from the live repo).
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { makeRepo, removeRepo, run, get, val } = require("./helpers");
const { createContext } = require("../../../src/lib/counters/context");

const css = (n) => Array.from({ length: n }, (_, i) => `  --p${i}: ${i};`).join("\n");
const tokens = `:root {\n${css(5)}\n}\n`;

describe("census counters", () => {
  const roots = [];
  const repo = (files) => {
    const root = makeRepo(files);
    roots.push(root);
    return root;
  };
  afterEach(() => roots.splice(0).forEach(removeRepo));

  test("census, tests, declarations, token source and audited are hand-countable", () => {
    const root = repo({
      "src/a.ts": "export const a = 1;",
      "src/b.tsx": "export const B = () => null;",
      "src/c.css": ".c { color: red; }",
      "src/d.js": "module.exports = 1;",
      "src/e.test.ts": "test('x', () => {});",
      "src/f.spec.tsx": "test('y', () => {});",
      "src/types.d.ts": "declare const x: number;",
      "src/__tests__/helper.ts": "export {};",
      "src/theme.css": tokens,
      // not census: wrong extension, skipped dirs, dot-dir, generated
      "src/data.json": "{}",
      "src/logo.svg": "<svg/>",
      "src/node_modules/x/y.ts": "export {};",
      "src/.hidden/z.ts": "export {};",
      "src/gen.generated.ts": "export {};",
      "src/vendor/v.ts": "export {};",
    });
    const r = run(root, { dirs: ["src"] });

    expect(val(r, "census.files.total")).toBe(9);
    expect(get(r, "census.files.total").detail.byExt).toEqual({ ".css": 2, ".js": 1, ".ts": 4, ".tsx": 2 });
    expect(val(r, "census.files.tests")).toBe(3); // e.test.ts, f.spec.tsx, __tests__/helper.ts
    expect(get(r, "census.files.tests").perFile.map((p) => p.file)).toEqual([
      "src/__tests__/helper.ts",
      "src/e.test.ts",
      "src/f.spec.tsx",
    ]);
    expect(val(r, "census.files.declarations")).toBe(1);
    expect(val(r, "census.files.token_source")).toBe(1);
    expect(get(r, "census.files.token_source").detail).toEqual({ path: "src/theme.css", via: "most-custom-properties", inCensus: true });
    expect(val(r, "census.files.audited")).toBe(4); // a.ts, b.tsx, c.css, d.js
    expect(get(r, "census.files.audited").detail).toMatchObject({ census: 9, tests: 3, declarations: 1, tokenSource: 1, excludedUnion: 5 });
    expect(get(r, "census.files.audited").detail.byExt).toEqual({ ".css": 1, ".js": 1, ".ts": 1, ".tsx": 1 });
    // the report header agrees with the counters
    expect(r.scope.population).toEqual({ census: 9, tests: 3, declarations: 1, audited: 4, unreadable: 0 });
    // any-type walk: census files + json + svg + dot-dir + generated + vendor (node_modules skipped) = 14
    expect(val(r, "census.files.any_type")).toBe(14);
    expect(get(r, "census.files.any_type").detail.byExt[".svg"]).toBe(1);
    expect(get(r, "census.files.any_type").detail.byExt[".json"]).toBe(1);
  });

  test("a file that is both a test and a declaration is excluded once", () => {
    const root = repo({
      "src/a.ts": "export {};",
      "src/__tests__/types.d.ts": "declare const t: 1;",
    });
    const r = run(root, { dirs: ["src"] });
    expect(val(r, "census.files.total")).toBe(2);
    expect(val(r, "census.files.tests")).toBe(1);
    expect(val(r, "census.files.declarations")).toBe(1);
    expect(val(r, "census.files.audited")).toBe(1);
    expect(get(r, "census.files.audited").detail.excludedUnion).toBe(1);
  });

  test("app-router pages, component tsx and components/ui are counted by whole path segments", () => {
    const root = repo({
      "src/app/page.tsx": "x",
      "src/app/(app)/config/page.tsx": "x",
      "src/app/docs/[[...slug]]/page.tsx": "x",
      "src/app/layout.tsx": "x", // layout, not a page
      "src/app/page.test.tsx": "x", // basename is page.test.tsx
      "src/lib/page.tsx": "x", // no app/ above it
      "src/myapp/page.tsx": "x", // "myapp" is not "app"
      "src/components/Button.tsx": "x",
      "src/components/ui/card.tsx": "x",
      "src/components/ui/card.test.tsx": "x",
      "src/components/ui/util.ts": "x",
      "src/components/a/app/page.tsx": "x", // an app/ dir anywhere above counts (pinned rule)
      "src/components/DeepDiveMockups.tsx": "x",
      "src/lib/Mockups.ts": "x",
      "src/mycomponents/X.tsx": "x", // "mycomponents" is not "components"
      "src/mycomponents/ui/x.tsx": "x", // ...and "mycomponents/ui" is not "components/ui"
      "src/lib/X.tsx": "x",
      "src/__tests__/app/page.tsx": "x", // a page fixture under __tests__/ is a test, not a route
    });
    const r = run(root, { dirs: ["src"] });

    expect(val(r, "census.files.total")).toBe(18);
    expect(val(r, "census.files.tests")).toBe(3); // page.test.tsx, card.test.tsx, __tests__/app/page.tsx
    expect(val(r, "census.files.audited")).toBe(15);

    expect(val(r, "census.routes.app_pages")).toBe(4);
    expect(get(r, "census.routes.app_pages").perFile.map((p) => p.file).sort()).toEqual([
      "src/app/(app)/config/page.tsx",
      "src/app/docs/[[...slug]]/page.tsx",
      "src/app/page.tsx",
      "src/components/a/app/page.tsx",
    ]);
    // Button, ui/card, ui/card.test, a/app/page, DeepDiveMockups (util.ts is ts, mycomponents is a different dir)
    expect(val(r, "census.components.tsx_files")).toBe(5);
    expect(val(r, "census.components.ui_files")).toBe(3); // card.tsx, card.test.tsx, util.ts
    // audited under ui/: card.tsx and util.ts (the test file is not audited)
    expect(val(r, "census.audited.in_components_ui")).toBe(2);
    expect(val(r, "census.audited.outside_components_ui")).toBe(13);
    expect(val(r, "census.audited.in_components_ui") + val(r, "census.audited.outside_components_ui")).toBe(val(r, "census.files.audited"));
    // filename rule: DeepDiveMockups.tsx and Mockups.ts
    expect(val(r, "census.audited.mockup_named")).toBe(2);
  });

  test("a page.tsx under __tests__/ is in the census and in tests, but is not a route", () => {
    const root = repo({
      "src/app/page.tsx": "x",
      "src/__tests__/app/page.tsx": "x",
      "src/app/__tests__/page.ts": "x",
    });
    const r = run(root, { dirs: ["src"], groups: ["census"] });
    expect(val(r, "census.files.total")).toBe(3);
    expect(val(r, "census.files.tests")).toBe(2);
    expect(val(r, "census.routes.app_pages")).toBe(1);
    expect(get(r, "census.routes.app_pages").perFile).toEqual([{ file: "src/app/page.tsx", count: 1 }]);
    expect(get(r, "census.routes.app_pages").definition.fileSet).toMatch(/minus test files/);
  });

  test("a token source outside the audited dirs is not removed from the audited population", () => {
    const root = repo({
      "design/tokens.css": tokens,
      "src/a.ts": "export {};",
    });
    const r = run(root, { dirs: ["src"] });
    expect(val(r, "census.files.total")).toBe(1);
    expect(val(r, "census.files.token_source")).toBe(0);
    expect(get(r, "census.files.token_source").detail).toEqual({ path: "design/tokens.css", via: "design/tokens.css", inCensus: false });
    expect(get(r, "census.files.token_source").notes.join(" ")).toMatch(/outside the audited dirs/);
    expect(val(r, "census.files.audited")).toBe(1);
  });

  test("no src/, no token source, no git: everything is 0 with notes, never an error", () => {
    const root = repo({ "README.md": "# hi\n" });
    const r = run(root, { groups: ["census"] });
    for (const id of [
      "census.files.total", "census.files.tests", "census.files.declarations", "census.files.token_source",
      "census.files.audited", "census.audited.in_components_ui", "census.audited.outside_components_ui",
      "census.audited.mockup_named", "census.routes.app_pages", "census.components.tsx_files", "census.components.ui_files",
    ]) {
      expect(val(r, id)).toBe(0);
    }
    expect(val(r, "census.files.any_type")).toBe(0); // no default dir exists, so nothing is walked
    expect(get(r, "census.files.total").notes.join(" ")).toMatch(/not found/);
    expect(get(r, "census.files.token_source").notes.join(" ")).toMatch(/no token source/);
  });

  test("an entirely empty repo and a missing requested dir", () => {
    const root = repo({});
    const r = run(root, { dirs: ["nope"], groups: ["census"] });
    expect(val(r, "census.files.total")).toBe(0);
    expect(get(r, "census.files.total").notes).toContain("audited dir(s) not found: nope");
    expect(r.scope.missingDirs).toEqual(["nope"]);
  });

  test("a dir with spaces, a dir given as a single file and overlapping dirs", () => {
    const root = repo({
      "my src/a.ts": "export {};",
      "my src/sub/b.tsx": "export {};",
      "other/c.ts": "export {};",
    });
    expect(val(run(root, { dirs: ["my src"], groups: ["census"] }), "census.files.total")).toBe(2);
    expect(val(run(root, { dirs: ["other/c.ts"], groups: ["census"] }), "census.files.total")).toBe(1);
    const single = run(root, { dirs: ["other/c.ts"], groups: ["census"] });
    expect(val(single, "census.files.any_type")).toBe(1);
    // overlapping dirs never double count
    const overlap = run(root, { dirs: ["my src", "my src/sub"], groups: ["census"] });
    expect(val(overlap, "census.files.total")).toBe(2);
    expect(val(overlap, "census.files.any_type")).toBe(2);
  });

  test("dirs that escape the repo are ignored, not followed", () => {
    const root = repo({ "src/a.ts": "export {};" });
    const r = run(root, { dirs: ["src", "../elsewhere"], groups: ["census"] });
    expect(val(r, "census.files.total")).toBe(1);
    expect(get(r, "census.files.total").notes.join(" ")).toMatch(/outside the repo root/);
  });

  describe("symlinks that leave the repo", () => {
    const link = (target, at) => {
      fs.mkdirSync(path.dirname(at), { recursive: true });
      fs.symlinkSync(target, at);
    };

    test("the context refuses a path that resolves outside the repo (absent, one warning); one that stays inside reads normally", () => {
      const outside = repo({ "secret.md": "# secret\n", "dir/a.yml": "x" });
      const root = repo({ "real.md": "# real\n", "sub/b.txt": "b" });
      link(path.join(outside, "secret.md"), path.join(root, "leak.md"));
      link(path.join(outside, "dir"), path.join(root, "leakdir"));
      link(path.join(root, "real.md"), path.join(root, "alias.md")); // inside → fine
      link(path.join(root, "sub"), path.join(root, "subalias")); // inside → fine
      link("missing.md", path.join(root, "dangling.md"));
      link("loop.md", path.join(root, "loop.md"));
      const view = createContext(root);

      expect(view.exists("leak.md")).toBe(false);
      expect(view.read("leak.md")).toBe("");
      expect(view.readJson("leak.md")).toBeNull();
      expect(view.isDirectory("leakdir")).toBe(false);
      expect(view.listTree("leakdir")).toEqual([]);
      expect(view.exists("alias.md")).toBe(true);
      expect(view.read("alias.md")).toBe("# real\n");
      expect(view.listTree("subalias").map((f) => f.rel)).toEqual(["subalias/b.txt"]);
      expect(view.exists("dangling.md")).toBe(false); // missing, not "outside"
      expect(view.exists("loop.md")).toBe(false);
      expect(view.exists("real.md")).toBe(true);
      expect(view.escaped()).toEqual(["leak.md", "leakdir"]);
      expect(view.warnings).toEqual(expect.arrayContaining(["symlink resolves outside the repo: leak.md", "symlink resolves outside the repo: leakdir"]));
      expect(view.leftRepoNotes(["leak.md", "alias.md"])).toEqual(["leak.md is a symlink that resolves outside the repo and was ignored"]);
    });

    test("an audited dir that is a symlink out of the repo is refused, not followed, and the report says so", () => {
      const outside = repo({ "a.ts": "export {};", "b.ts": "export {};" });
      const root = repo({ "README.md": "x" });
      link(outside, path.join(root, "src"));
      const r = run(root, { dirs: ["src"], groups: ["census"] });
      expect(val(r, "census.files.total")).toBe(0); // the resolver treats it like a `..` path: nothing outside the repo is read
      expect(r.scope.rejectedDirs).toEqual(["src"]);
      expect(get(r, "census.files.total").notes.join(" ")).toMatch(/audited dir\(s\) outside the repo root were ignored: src/);
      expect(r.warnings).toContain("audited dir outside the repo root was ignored: src");
    });
  });

  describe("census files that cannot be opened", () => {
    test("an unreadable file, a FIFO and a name that is not valid UTF-8 sit in the census, are counted as unreadable and warned about", () => {
      const root = repo({ "src/ok.tsx": "export {};\n", "src/locked.ts": "export {};\n" });
      fs.writeFileSync(Buffer.concat([Buffer.from(path.join(root, "src") + path.sep), Buffer.from([0x62, 0x61, 0x64, 0xff, 0x2e, 0x74, 0x73])]), "export {};\n");
      const real = fs.openSync;
      const spy = jest.spyOn(fs, "openSync").mockImplementation((file, ...rest) => {
        if (String(file).endsWith(path.join("src", "locked.ts"))) throw Object.assign(new Error("EACCES: permission denied"), { code: "EACCES" });
        return real.call(fs, file, ...rest);
      });
      try {
        const r = run(root, { dirs: ["src"], groups: ["census", "colour"] });
        expect(val(r, "census.files.total")).toBe(3);
        expect(val(r, "census.files.unreadable")).toBe(2);
        expect(get(r, "census.files.unreadable").perFile.map((p) => p.file)).toEqual(expect.arrayContaining(["src/locked.ts"]));
        expect(get(r, "census.files.unreadable").detail.reasons).toMatchObject({ EACCES: 1 });
        expect(r.scope.population.unreadable).toBe(2);
        // the report no longer claims files it did not read: the scanner skipped them too
        expect(val(r, "colour.scanner.files_audited")).toBe(1);
        expect(r.warnings.some((w) => /^2 census file\(s\) could not be opened/.test(w) && w.includes("src/locked.ts (EACCES)"))).toBe(true);
      } finally {
        spy.mockRestore();
      }
    });

    test("a FIFO in the audited tree is refused, not read until it blocks", () => {
      const root = repo({ "src/ok.tsx": "export {};\n" });
      const { spawnSync } = require("child_process");
      if (spawnSync("mkfifo", [path.join(root, "src", "pipe.ts")]).status !== 0) return; // no mkfifo here
      const t0 = Date.now();
      const r = run(root, { dirs: ["src"] });
      expect(Date.now() - t0).toBeLessThan(5000);
      expect(val(r, "census.files.unreadable")).toBe(0); // a FIFO is not a regular file, so the walk never lists it
      expect(val(r, "census.files.total")).toBe(1);
    });
  });

  test("the same tree always produces the same bytes, and ids are stable and sorted", () => {
    const root = repo({ "src/a.ts": "x", "src/b.tsx": "x", "src/theme.css": tokens });
    const a = run(root, { dirs: ["src"], groups: ["census"] });
    const b = run(root, { dirs: ["src"], groups: ["census"] });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.counters.map((c) => c.id)).toEqual([
      "census.audited.in_components_ui",
      "census.audited.mockup_named",
      "census.audited.outside_components_ui",
      "census.components.tsx_files",
      "census.components.ui_files",
      "census.files.any_type",
      "census.files.audited",
      "census.files.declarations",
      "census.files.tests",
      "census.files.token_source",
      "census.files.total",
      "census.files.unreadable",
      "census.routes.app_pages",
    ]);
    expect(a.counters.every((c) => c.group === "census" && c.definition.fileSet)).toBe(true);
  });
});
