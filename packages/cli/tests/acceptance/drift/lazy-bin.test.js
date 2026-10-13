/**
 * lazy-bin.test.js — bin/cli.js loads a command only when that command runs.
 *
 * The bug: the bin required every command up front, so `drift scan` crashed with
 * MODULE_NOT_FOUND (gray-matter) in a checkout where the CLI's dependencies were
 * not installed, although `drift` needs none of them. These tests spawn the real
 * bin with a preload hook (block-deps.js) that makes packages "not installed".
 */

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const { makeRepo, removeRepo } = require("./helpers");

const PKG = path.resolve(__dirname, "../../..");
const BIN = path.join(PKG, "bin", "cli.js");
const SRC = path.join(PKG, "src");
const HOOK = path.join(__dirname, "block-deps.js");

let scratch;
beforeAll(() => {
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), "sx-lazy-"));
});
afterAll(() => fs.rmSync(scratch, { recursive: true, force: true }));

/** Run the real bin. `block`: "" | "gray-matter" | "all" (packages that are "not installed"). */
function sx(args, { cwd, block = "", trace = false } = {}) {
  const traceFile = path.join(scratch, `trace-${Math.random().toString(36).slice(2)}.json`);
  const r = spawnSync(process.execPath, ["-r", HOOK, BIN, ...args], {
    cwd: cwd ?? scratch,
    encoding: "utf8",
    timeout: 60000,
    env: { PATH: process.env.PATH, HOME: scratch, NO_COLOR: "1", SX_BLOCK: block, ...(trace ? { SX_TRACE: traceFile } : {}) },
  });
  const loaded = trace
    ? JSON.parse(fs.readFileSync(traceFile, "utf8"))
        .filter((f) => f.startsWith(SRC + path.sep))
        .map((f) => path.relative(SRC, f).split(path.sep).join("/"))
        .sort()
    : null;
  return { code: r.status, out: r.stdout, err: r.stderr, loaded };
}

describe("bin/cli.js is lazy", () => {
  const source = fs.readFileSync(BIN, "utf8");

  test("nothing is required before main(): every command module is required inside its own case", () => {
    const header = source.slice(0, source.indexOf("async function main"));
    expect(header).not.toMatch(/\brequire\(/);
    const body = source.slice(source.indexOf("async function main"));
    expect(body.match(/\brequire\("\.\.\/src\//g).length).toBeGreaterThanOrEqual(25);
  });

  test("every lazily required path exists (a typo would otherwise surface only when that command runs)", () => {
    const paths = [...source.matchAll(/require\("(\.\.\/src\/[^"]+)"\)/g)].map((m) => m[1]);
    expect(paths.length).toBeGreaterThanOrEqual(25);
    for (const rel of paths) {
      expect(() => require.resolve(path.join(path.dirname(BIN), rel))).not.toThrow();
    }
  });

  test("each command module is required in exactly one place, in the case that runs it", () => {
    const paths = [...source.matchAll(/require\("(\.\.\/src\/[^"]+)"\)/g)].map((m) => m[1]);
    const counts = paths.reduce((acc, p) => ({ ...acc, [p]: (acc[p] ?? 0) + 1 }), {});
    // add.js serves both `add` and `workflow`, and `workflow` shares the one require
    expect(Object.entries(counts).filter(([, n]) => n > 1)).toEqual([["../src/add", 2]]);
  });
});

describe("with no dependency installed, what does not need one still works", () => {
  let repo;
  beforeEach(() => {
    repo = makeRepo({
      "src/Bad.tsx": "const s = { color: '#ff0000', pad: '4px' };\n",
      "src/Clean.tsx": "export const ok = 1;\n",
      "packages/p/Other.tsx": "const o = '#00ff00';\n",
    });
  });
  afterEach(() => removeRepo(repo));

  test.each([["gray-matter"], ["all"]])("drift scan --json runs (blocked: %s) and writes its snapshot", (block) => {
    const r = sx(["drift", "scan", "src", "--json", "--triggered-by", "ci"], { cwd: repo, block });
    expect(r.err).toBe("");
    expect(r.code).toBe(0);
    const doc = JSON.parse(r.out);
    expect(doc).toMatchObject({ ok: true, snapshotWritten: true, snapshotNumber: 1, critical: 1, warnings: 1, componentsAudited: 2, score: 50, dirs: ["src"] });
    const history = JSON.parse(fs.readFileSync(path.join(repo, ".systemix", "drift-history.json"), "utf8"));
    expect(history.snapshots).toHaveLength(1);
    expect(history.snapshots[0]).toMatchObject({ triggeredBy: "ci", score: 50, scoreFormula: "clean-files/1" });
  });

  test.each([["gray-matter"], ["all"]])("drift history runs (blocked: %s)", (block) => {
    sx(["drift", "scan", "src"], { cwd: repo, block });
    const r = sx(["drift", "history"], { cwd: repo, block });
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/score\s+50\s+critical 1\s+warnings 1\s+\(cli\)/);
  });

  test("a positional folder is honoured: `drift scan src` does not also scan packages/", () => {
    const r = sx(["drift", "scan", "src", "--dry-run", "--json"], { cwd: repo, block: "all" });
    expect(JSON.parse(r.out)).toMatchObject({ dirs: ["src"], componentsAudited: 2, critical: 1 });
    // with no folder named the default list takes packages/ too
    const all = sx(["drift", "scan", "--dry-run", "--json"], { cwd: repo, block: "all" });
    expect(JSON.parse(all.out)).toMatchObject({ dirs: ["src", "packages"], componentsAudited: 3, critical: 2 });
  });

  test("--dry-run writes nothing", () => {
    const r = sx(["drift", "scan", "src", "--dry-run"], { cwd: repo, block: "all" });
    expect(r.code).toBe(0);
    expect(r.out).toContain("dry run, no snapshot written");
    expect(fs.existsSync(path.join(repo, ".systemix"))).toBe(false);
  });

  test("a refused scan exits 1 with the reason on stderr", () => {
    const r = sx(["drift", "scan", "nope"], { cwd: repo, block: "all" });
    expect(r.code).toBe(1);
    expect(r.err).toContain("nothing to audit");
    expect(r.out).toBe("");
    expect(fs.existsSync(path.join(repo, ".systemix"))).toBe(false);
  });

  test("help, no command and an unknown command need nothing either", () => {
    for (const args of [[], ["help"], ["--help"], ["-h"]]) {
      const r = sx(args, { block: "all", trace: true });
      expect(r.code).toBe(0);
      expect(r.out).toContain("systemix — agentic design system ops for Claude Code");
      expect(r.out).toContain("drift <sub>");
      expect(r.loaded).toEqual([]); // not one file of src/ was loaded
    }
    const unknown = sx(["nope"], { block: "all" });
    expect(unknown.code).toBe(1);
    expect(unknown.err).toContain("Unknown command: nope");
    expect(unknown.out).toContain("Usage:");
  });
});

describe("laziness is per command", () => {
  test("drift loads its own four modules and no other command", () => {
    const repo = makeRepo({ "src/a.ts": "export const a = 1;\n" });
    try {
      const r = sx(["drift", "scan", "--dry-run"], { cwd: repo, trace: true });
      expect(r.code).toBe(0);
      // drift's whole dependency tree; growing it means `drift` needs one more thing installed
      // (lib/css-parse.js is the custom-property scanner the token-source resolver shares with the counters)
      const tree = ["commands/drift.js", "config.js", "lib/css-parse.js", "lib/design-source.js"];
      expect(r.loaded).toEqual(tree);
      const history = sx(["drift", "history"], { cwd: repo, trace: true });
      expect(history.loaded).toEqual(tree);
    } finally {
      removeRepo(repo);
    }
  });

  test("a command that does need gray-matter fails on its own, with the missing module named — the hook really bites", () => {
    const repo = makeRepo({});
    try {
      const blocked = sx(["experiment", "list"], { cwd: repo, block: "gray-matter" });
      expect(blocked.code).toBe(1);
      expect(blocked.err).toContain("Cannot find module 'gray-matter'");
      // the same command with nothing blocked works
      const fine = sx(["experiment", "list"], { cwd: repo });
      expect(fine.code).toBe(0);
      expect(fine.err).toBe("");
    } finally {
      removeRepo(repo);
    }
  });

  test("another command's missing dependency never breaks drift in the same checkout", () => {
    const repo = makeRepo({ "src/a.ts": "const a = '#ff0000';\n" });
    try {
      expect(sx(["docs", "sync"], { cwd: repo, block: "gray-matter" }).code).toBe(1); // docs needs gray-matter
      expect(sx(["drift", "scan", "--dry-run"], { cwd: repo, block: "gray-matter" }).code).toBe(0);
    } finally {
      removeRepo(repo);
    }
  });
});
