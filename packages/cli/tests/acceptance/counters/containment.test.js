/**
 * containment.test.js — the report depends on the repo alone. An audit is pointed at repos its
 * author did not write (the paid-audit case), so a file the repo holds must never make the
 * auditor's own disk part of the report, and must never hang or exhaust the process:
 *
 *   - a symlink that leaves the repo reads as ABSENT, for every fixed-path input of every group
 *     (the guardrails, DESIGN.md, the token file, the instruction files, package.json, tsconfig,
 *     the config, the drift history), not only for the groups that used to wrap their context
 *   - a symlink to /dev/zero or a FIFO (git stores symlinks; a tarball can hold a FIFO) is refused,
 *     in bounded time and memory, by the counters and by `drift`
 *   - the text a run keeps in memory is bounded: a read budget, with the skipped files named
 *   - a file that cannot be opened is counted and warned about, not silently counted as audited
 *
 * Every repo is a tiny temp one; the "secret" is a marker string in a file outside it.
 */

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { makeRepo, removeRepo, run, get, val } = require("./helpers");
const { createContext } = require("../../../src/lib/counters/context");
const ds = require("../../../src/lib/design-source");
const { scanProject } = require("../../../src/commands/drift");

const MARK = "SECRETMARK";
const BIN = path.join(__dirname, "..", "..", "..", "bin", "cli.js");
const hasMkfifo = spawnSync("mkfifo", ["--version"]).error === undefined;

describe("containment", () => {
  const roots = [];
  const repo = (files = {}) => {
    const root = makeRepo(files);
    roots.push(root);
    return root;
  };
  afterEach(() => roots.splice(0).forEach(removeRepo));

  const link = (target, at) => {
    fs.mkdirSync(path.dirname(at), { recursive: true });
    fs.symlinkSync(target, at);
  };

  // each fixed-path input, with outside content that would show up in the report if it were read
  const INPUTS = {
    "design/guardrails.mdx": `## ${MARK} heading\n- ${MARK} rule \`#ff0000\` on \`#000000\` is 5:1\n- ★ ${MARK} starred. Exceptions: \`${MARK}.tsx\`\n`,
    "design/DESIGN.md": `---\ncolors:\n  ${MARK}: "#123456"\n---\n# ${MARK}\n`,
    "design/tokens.css": `:root {\n  --${MARK}: #123456;\n  --a: 1;\n  --b: 2;\n  --c: 3;\n  --d: 4;\n}\n`,
    "CLAUDE.md": `# ${MARK}\nread ~/${MARK}/x.md and /${MARK}-skill\nUpdated 2026-01-01\n`,
    "package.json": `{"dependencies": {"posthog-js": "1", "${MARK}": "1"}, "scripts": {"drift": "${MARK}"}}\n`,
    "tsconfig.json": `{"compilerOptions": {"paths": {"@${MARK}/*": ["./src/*"]}}}\n`,
    "systemix.config.yaml": `autonomy: ${MARK}\ndesign:\n  source: ${MARK}.css\n`,
    ".systemix/drift-history.json": JSON.stringify([{ runAt: "2026-01-01T00:00:00Z", triggeredBy: MARK, score: 1 }]),
  };

  describe("a symlink that leaves the repo reads as absent, whichever group reads it", () => {
    test.each(Object.keys(INPUTS))("%s", (rel) => {
      const outside = repo({ "payload.txt": INPUTS[rel] });
      const root = repo({
        "src/a.tsx": 'import "@/lib/x";\nexport const A = () => <div className="text-[13px]">x</div>;\n', // an alias import: reachability consults tsconfig.json
        "src/b.css": ":root { --one: 1; }\n",
      });
      link(path.join(outside, "payload.txt"), path.join(root, rel));
      const report = run(root, { dirs: ["src"] });
      expect(JSON.stringify(report)).not.toContain(MARK);
      expect(report.warnings).toContain(`symlink resolves outside the repo: ${rel}`);
    });

    test("all of them at once, and the same files as plain files DO show up (the test would notice a leak)", () => {
      const outside = repo({});
      const root = repo({ "src/a.tsx": "export const A = 1;\n" });
      const plain = repo({ "src/a.tsx": "export const A = 1;\n" });
      for (const [rel, body] of Object.entries(INPUTS)) {
        fs.mkdirSync(path.dirname(path.join(outside, rel)), { recursive: true });
        fs.writeFileSync(path.join(outside, rel), body);
        link(path.join(outside, rel), path.join(root, rel));
        fs.mkdirSync(path.dirname(path.join(plain, rel)), { recursive: true });
        fs.writeFileSync(path.join(plain, rel), body);
      }
      expect(JSON.stringify(run(root, { dirs: ["src"] }))).not.toContain(MARK);
      expect(JSON.stringify(run(plain, { dirs: ["src"] }))).toContain(MARK);
    });

    test("the token source never resolves through a symlink that leaves the repo, at any resolution step", () => {
      const outside = repo({ "theme.css": INPUTS["design/tokens.css"], "DESIGN.md": `The canonical tokens are in ${MARK}.css.\n` });
      const root = repo({ "src/a.ts": "export {};\n" });
      link(path.join(outside, "theme.css"), path.join(root, "design/tokens.css")); // step 1
      expect(ds.resolveTokenSource(root, ["src"]).via).toBe("none");
      link(path.join(outside, "theme.css"), path.join(root, "styles/t.css"));
      fs.writeFileSync(path.join(root, "systemix.config.yaml"), "design:\n  source: styles/t.css\n"); // step 2
      expect(ds.resolveTokenSource(repo({ "systemix.config.yaml": "design:\n  source: styles/t.css\n" }), ["src"]).via).toBe("none");
      expect(ds.resolveTokenSource(root, ["src"]).via).not.toBe("config:design.source");
      link(path.join(outside, "DESIGN.md"), path.join(repo({}), "design/DESIGN.md")); // step 3: a doc that is a link is not read
      const docRoot = repo({ "src/styles/real.css": INPUTS["design/tokens.css"] });
      link(path.join(outside, "DESIGN.md"), path.join(docRoot, "design/DESIGN.md"));
      expect(ds.resolveTokenSource(docRoot, ["src"]).via).toBe("most-custom-properties"); // the doc (a link out) was not read, so it names nothing
    });

    test("a symlinked directory of records (decisions/, contract/, scripts/, .github/workflows) lists nothing", () => {
      const outside = repo({
        "adrs/ADR.md": `## ADR-001: ${MARK}\nStatus: Accepted\nDate: 2026-01-01\n`,
        "tokens/t.mdx": `---\ntoken: --${MARK}\nvalue: 1\n---\n`,
        "workflows/w.yml": `name: ${MARK} drift\n`,
        "scripts/drift.ts": `process.exit(1); // ${MARK}\n`,
      });
      const root = repo({ "src/a.ts": "export {};\n" });
      link(path.join(outside, "adrs"), path.join(root, "decisions"));
      link(path.join(outside, "tokens"), path.join(root, "contract/tokens"));
      link(path.join(outside, "workflows"), path.join(root, ".github/workflows"));
      link(path.join(outside, "scripts"), path.join(root, "scripts"));
      const report = run(root, { dirs: ["src"] });
      expect(JSON.stringify(report)).not.toContain(MARK);
      expect(report.warnings).toEqual(expect.arrayContaining(["symlink resolves outside the repo: decisions", "symlink resolves outside the repo: scripts"]));
    });

    test("a symlink that stays inside the repo is read like the file it points at", () => {
      const root = repo({ "docs/rules.mdx": `## Inside\n- rule\n`, "src/a.ts": "export {};\n" });
      link(path.join(root, "docs/rules.mdx"), path.join(root, "design/guardrails.mdx"));
      const report = run(root, { dirs: ["src"] });
      expect(val(report, "guardrails.structure.h2_sections")).toBe(1);
      expect(report.warnings.filter((w) => /symlink resolves outside/.test(w))).toEqual([]);
    });
  });

  describe("a file that is not a regular file is refused, in bounded time", () => {
    const zero = "/dev/zero";
    const have = fs.existsSync(zero);

    (have ? test : test.skip)("a symlink to /dev/zero at a fixed path is outside the repo (absent), for the counters", () => {
      const root = repo({ "src/a.ts": "export {};\n" });
      for (const rel of ["design/guardrails.mdx", "design/DESIGN.md", "CLAUDE.md", "systemix.config.yaml", ".systemix/drift-history.json", "package.json"]) {
        link(zero, path.join(root, rel));
      }
      const t0 = Date.now();
      const report = run(root, { dirs: ["src"] });
      expect(Date.now() - t0).toBeLessThan(10000);
      expect(val(report, "guardrails.file.exists")).toBe(false);
      expect(report.warnings).toContain("symlink resolves outside the repo: design/guardrails.mdx");
    });

    (have ? test : test.skip)("readBounded refuses /dev/zero and a directory without reading them", () => {
      expect(ds.readBounded(zero, 1024)).toEqual({ skipped: "not-a-file" });
      expect(ds.readBounded(os.tmpdir(), 1024)).toEqual({ skipped: "not-a-file" });
      expect(ds.readBounded(path.join(os.tmpdir(), "sx-no-such-file-here"), 1024)).toMatchObject({ skipped: "unreadable", code: "ENOENT" });
    });

    test("readBounded reads at most the cap: a file one byte over is 'over', one at the cap is read", () => {
      const root = repo({ "at.txt": "x".repeat(100), "over.txt": "x".repeat(101) });
      expect(ds.readBounded(path.join(root, "at.txt"), 100).text).toHaveLength(100);
      expect(ds.readBounded(path.join(root, "over.txt"), 100)).toEqual({ skipped: "over" });
    });

    (hasMkfifo ? test : test.skip)("a FIFO at a fixed path (a tarball can hold one) is skipped with a warning instead of blocking the audit", () => {
      const root = repo({ "src/a.ts": "export {};\n" });
      for (const rel of ["design/guardrails.mdx", "CLAUDE.md", "package.json", "systemix.config.yaml"]) {
        fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
        expect(spawnSync("mkfifo", [path.join(root, rel)]).status).toBe(0);
      }
      const t0 = Date.now();
      const report = run(root, { dirs: ["src"] });
      expect(Date.now() - t0).toBeLessThan(10000);
      expect(report.warnings).toEqual(expect.arrayContaining(["skipped (not a regular file): design/guardrails.mdx", "skipped (not a regular file): CLAUDE.md"]));
      expect(val(report, "guardrails.file.lines")).toBe(0);
    });

    (hasMkfifo ? test : test.skip)("`drift scan --dry-run` survives a FIFO where it reads the config, a design doc or the history", () => {
      const root = repo({ "src/a.ts": "const c = '#ff0000';\n" });
      for (const rel of ["systemix.config.yaml", "design/DESIGN.md", ".systemix/drift-history.json"]) {
        fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
        expect(spawnSync("mkfifo", [path.join(root, rel)]).status).toBe(0);
      }
      const t0 = Date.now();
      const r = spawnSync(process.execPath, [BIN, "drift", "scan", "src", "--dry-run", "--json"], { cwd: root, encoding: "utf8", timeout: 15000 });
      expect(Date.now() - t0).toBeLessThan(10000);
      expect(r.status).toBe(0);
      expect(JSON.parse(r.stdout)).toMatchObject({ ok: true, critical: 1 });
      const history = spawnSync(process.execPath, [BIN, "drift", "history"], { cwd: root, encoding: "utf8", timeout: 15000 });
      expect(history.stderr).toMatch(/not a regular file/);
    });

    (have ? test : test.skip)("`drift` never follows a link to /dev/zero for its config, a design doc or the history", () => {
      const root = repo({ "src/a.ts": "const c = '#ff0000';\n" });
      for (const rel of ["systemix.config.yaml", "design/DESIGN.md", ".systemix/drift-history.json"]) link(zero, path.join(root, rel));
      const t0 = Date.now();
      const r = spawnSync(process.execPath, [BIN, "drift", "scan", "src", "--dry-run", "--json"], { cwd: root, encoding: "utf8", timeout: 15000 });
      expect(Date.now() - t0).toBeLessThan(10000);
      expect(r.status).toBe(0);
      const history = spawnSync(process.execPath, [BIN, "drift", "history", "--json"], { cwd: root, encoding: "utf8", timeout: 15000 });
      expect(history.status).toBe(0);
      expect(history.stdout.trim()).toBe("[]");
    });
  });

  describe("drift: the history and the folder it lives in", () => {
    const drift = (cwd, ...args) => spawnSync(process.execPath, [BIN, "drift", ...args], { cwd, encoding: "utf8", timeout: 15000 });

    test("`drift history` does not print a history file that is a symlink out of the repo", () => {
      const outside = repo({ "h.json": JSON.stringify([{ runAt: "2026-01-01T00:00:00Z", triggeredBy: MARK, score: 1, critical: 1, warnings: 1 }]) });
      const root = repo({ "src/a.ts": "export {};\n" });
      link(path.join(outside, "h.json"), path.join(root, ".systemix/drift-history.json"));
      for (const args of [["history"], ["history", "--json"]]) {
        const r = drift(root, ...args);
        expect(r.stdout + r.stderr).not.toContain(MARK);
        expect(r.stderr).toMatch(/symlink that resolves outside the project/);
      }
    });

    test("a scan never writes through a .systemix symlink that leaves the repo, nor replaces a history file that is one", () => {
      const outside = repo({ "elsewhere/keep.txt": "keep\n" });
      const root = repo({ "src/a.ts": "const c = '#ff0000';\n" });
      link(path.join(outside, "elsewhere"), path.join(root, ".systemix"));
      const r = drift(root, "scan", "src");
      expect(r.status).toBe(1);
      expect(r.stderr).toMatch(/\.systemix is a symbolic link that leaves the project/);
      expect(fs.readdirSync(path.join(outside, "elsewhere"))).toEqual(["keep.txt"]); // nothing was created over there

      const root2 = repo({ "src/a.ts": "const c = '#ff0000';\n", ".systemix/x": "" });
      const target = path.join(outside, "outside.json");
      fs.writeFileSync(target, "[]\n");
      link(target, path.join(root2, ".systemix/drift-history.json"));
      const r2 = drift(root2, "scan", "src");
      expect(r2.status).toBe(1);
      expect(fs.readFileSync(target, "utf8")).toBe("[]\n"); // unchanged: the link was neither followed nor replaced
      expect(fs.lstatSync(path.join(root2, ".systemix/drift-history.json")).isSymbolicLink()).toBe(true);
    });

    test("a .systemix symlink that stays inside the repo is fine", () => {
      const root = repo({ "src/a.ts": "const c = '#ff0000';\n", "state/x": "" });
      link(path.join(root, "state"), path.join(root, ".systemix"));
      const r = drift(root, "scan", "src");
      expect(r.status).toBe(0);
      expect(fs.existsSync(path.join(root, "state/drift-history.json"))).toBe(true);
    });
  });

  describe("the text a run keeps is bounded", () => {
    test("past the read budget a file reads as empty, is named in a warning, and every counter says it undercounts", () => {
      const root = repo({
        "src/a.tsx": `const a = "#aa0000"; // ${"x".repeat(60)}\n`,
        "src/b.tsx": `const b = "#bb0000"; // ${"x".repeat(60)}\n`,
        "src/c.tsx": `const c = "#cc0000"; // ${"x".repeat(60)}\n`,
      });
      const ctx = createContext(root, { dirs: ["src"], readBudgetBytes: 200 });
      expect(ctx.read("src/a.tsx")).toContain("#aa0000");
      expect(ctx.read("src/b.tsx")).toContain("#bb0000");
      expect(ctx.read("src/c.tsx")).toBe(""); // 3 x ~85 characters: the third does not fit in 200
      expect(ctx.skipped.get("src/c.tsx")).toBe("budget");
      expect(ctx.readFile("src/c.tsx")).toMatchObject({ skipped: "budget" });
      expect(ctx.warnings).toContain("skipped (over the 200 bytes read budget): src/c.tsx");
      expect(ctx.skippedReads(["src/a.tsx", "src/c.tsx"])).toEqual(["src/c.tsx"]);

      const report = run(root, { dirs: ["src"], groups: ["colour"], readBudgetBytes: 200 });
      expect(report.warnings).toContain("skipped (over the 200 bytes read budget): src/c.tsx");
      expect(get(report, "colour.scanner.files_audited").detail.skipped).toEqual([{ file: "src/c.tsx", reason: "past the read budget" }]);
    });

    test("only the first 20 skipped files are named; the rest are counted in one warning", () => {
      const files = {};
      for (let i = 0; i < 30; i++) files[`src/f${String(i).padStart(2, "0")}.ts`] = "x".repeat(40);
      const report = run(repo(files), { dirs: ["src"], groups: ["census", "colour"], readBudgetBytes: 100 });
      const named = report.warnings.filter((w) => /^skipped \(over the 100 bytes read budget\)/.test(w));
      expect(named).toHaveLength(20);
      expect(report.warnings.some((w) => /^8 more file\(s\) were not read because the run's 100 bytes read budget was spent/.test(w))).toBe(true);
    });

    test("files over the 5 MB cap are named the same way: the first 20, then one count", () => {
      const files = {};
      for (let i = 0; i < 23; i++) files[`src/big${String(i).padStart(2, "0")}.ts`] = "x";
      const root = repo(files);
      // 5 MB + 1 byte: sparse files, so this costs no disk
      for (let i = 0; i < 23; i++) fs.truncateSync(path.join(root, `src/big${String(i).padStart(2, "0")}.ts`), 5 * 1024 * 1024 + 1);
      const report = run(root, { dirs: ["src"], groups: ["census", "colour"] });
      expect(report.warnings.filter((w) => /^skipped \(over 5 MB\): src\/big/.test(w))).toHaveLength(20);
      expect(report.warnings).toContain("3 more file(s) were over the 5 MB read cap and were not read");
      expect(get(report, "colour.scanner.files_audited").detail.skippedTotal).toBe(23);
    });

    test("with no budget pressure nothing is skipped and the report is the same as without the option", () => {
      const root = repo({ "src/a.tsx": 'const a = "#aa0000";\n' });
      expect(JSON.stringify(run(root, { dirs: ["src"], readBudgetBytes: 1e9 }))).toBe(JSON.stringify(run(root, { dirs: ["src"] })));
    });
  });

  describe("every audited file's text is read once per run (colour and reachability share the scanner's read)", () => {
    test("no audited file is opened more than twice: once to read it, once to probe that it can be opened", () => {
      const root = repo({
        "src/components/A.tsx": 'import { B } from "./B";\nexport const A = () => <B className="bg-[#ff0000]" />;\n',
        "src/components/B.tsx": "export const B = (p: object) => <div {...p} />;\n",
        "src/app/page.tsx": 'import { A } from "../components/A";\nexport default A;\n',
        "src/theme.css": ":root { --a: 1; --b: 2; --c: 3; --d: 4; --e: 5; }\n",
      });
      const opened = new Map();
      const real = fs.openSync;
      const spy = jest.spyOn(fs, "openSync").mockImplementation((file, ...rest) => {
        opened.set(String(file), (opened.get(String(file)) ?? 0) + 1);
        return real.call(fs, file, ...rest);
      });
      try {
        run(root, { dirs: ["src"] });
      } finally {
        spy.mockRestore();
      }
      expect([...opened].filter(([f]) => f.startsWith(path.join(root, "src"))).length).toBeGreaterThanOrEqual(4);
      // the resolver reads css files while it chooses the token source; the audited sources are never read by a second reader
      for (const rel of ["src/components/A.tsx", "src/components/B.tsx", "src/app/page.tsx"]) {
        expect(opened.get(path.join(root, rel))).toBeLessThanOrEqual(2);
      }
    });

    test("scanProject through the context reports exactly what a stand-alone scan reports", () => {
      const root = repo({
        "src/a.tsx": 'const a = "#ff0000"; const w = "12px";\r\n',
        "src/b.ts": "const c = rgba(0,0,0,.5);\n",
        "src/theme.css": ":root { --a: 1; --b: 2; --c: 3; --d: 4; --e: 5; }\n",
      });
      const ctx = createContext(root, { dirs: ["src"] });
      expect(ctx.scan()).toEqual(scanProject(root, ["src"]));
      expect(ctx.scan()).toBe(ctx.scan()); // computed once
    });
  });
});
