/**
 * door.test.js — `systemix audit counters`, the command that runs the counters.
 *
 * The real bin is spawned (the door is what people and CI call), with a preload
 * hook that makes third-party packages "not installed": the command must run in a
 * checkout where nothing but node is available. A few cases run in-process to
 * reach paths a spawn cannot (a counter module that throws).
 */

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const { makeRepo, removeRepo } = require("./helpers");
const { runCounters, GROUPS } = require("../../../src/lib/counters");
const { capture } = require("../drift/helpers");

const PKG = path.resolve(__dirname, "../../..");
const BIN = path.join(PKG, "bin", "cli.js");
const SRC = path.join(PKG, "src");
const HOOK = path.join(__dirname, "..", "drift", "block-deps.js");

const FILES = {
  "src/app/globals.css": ":root {\n  --a: #112233;\n  --b: #445566;\n  --c: 1px;\n  --d: 2px;\n  --e: 3px;\n}\n",
  "src/app/page.tsx": "export default function P() { return <p className=\"text-[11px]\" style={{ color: '#112233' }}>x</p>; }\n",
  "src/components/Card.tsx": "export function Card() { return <div className=\"p-4\">x</div>; }\n",
  "lib/util.ts": "export const x = 1;\n",
};

describe("systemix audit counters", () => {
  let scratch;
  const roots = [];
  const repo = (files = FILES) => {
    const root = makeRepo(files);
    roots.push(root);
    return root;
  };
  beforeAll(() => {
    scratch = fs.mkdtempSync(path.join(os.tmpdir(), "sx-door-"));
  });
  afterAll(() => fs.rmSync(scratch, { recursive: true, force: true }));
  afterEach(() => roots.splice(0).forEach(removeRepo));

  /** Run the real bin. `block`: "" | "gray-matter" | "all" — packages that are "not installed". */
  function sx(args, { cwd, block = "", trace = false } = {}) {
    const traceFile = path.join(scratch, `trace-${Math.random().toString(36).slice(2)}.json`);
    const r = spawnSync(process.execPath, ["-r", HOOK, BIN, ...args], {
      cwd: cwd ?? scratch,
      encoding: "utf8",
      timeout: 60000,
      maxBuffer: 64 * 1024 * 1024,
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

  describe("the report on stdout", () => {
    test("stdout is the report and nothing else; it is the report runCounters returns", () => {
      const root = repo();
      const r = sx(["audit", "counters", "--dirs", "src"], { cwd: root });
      expect(r.code).toBe(0);
      expect(r.out.endsWith("\n")).toBe(true);
      expect(r.out.trim().split("\n")).toHaveLength(1); // compact: one line
      const report = JSON.parse(r.out);
      expect(report).toEqual(JSON.parse(JSON.stringify(runCounters(root, { dirs: ["src"] }))));
      expect(report.schema).toBe("systemix.audit-counters/1");
      expect(report.groups.run).toEqual(GROUPS);
      expect(report.groups.skipped).toEqual([]);
    });

    test("two runs on the same tree are byte-identical", () => {
      const root = repo();
      const a = sx(["audit", "counters", "--dirs", "src"], { cwd: root });
      const b = sx(["audit", "counters", "--dirs", "src"], { cwd: root });
      expect(a.out).toBe(b.out);
      expect(a.out.length).toBeGreaterThan(1000);
    });

    test("--pretty indents the same report", () => {
      const root = repo();
      const compact = sx(["audit", "counters", "--dirs", "src"], { cwd: root });
      const pretty = sx(["audit", "counters", "--dirs", "src", "--pretty"], { cwd: root });
      expect(pretty.out.split("\n").length).toBeGreaterThan(100);
      expect(pretty.out).toBe(JSON.stringify(JSON.parse(compact.out), null, 2) + "\n");
    });

    test("diagnostics go to stderr, so stdout still parses", () => {
      const root = repo();
      const r = sx(["audit", "counters", "--dirs", "src,nope"], { cwd: root });
      expect(r.code).toBe(0);
      expect(r.err).toContain("audited dir not found: nope");
      expect(() => JSON.parse(r.out)).not.toThrow();
      expect(JSON.parse(r.out).scope.missingDirs).toEqual(["nope"]);
    });

    test("a repo with nothing to audit still gets a valid report and exit 0", () => {
      const root = repo({ "README.md": "x\n" });
      const r = sx(["audit", "counters"], { cwd: root });
      expect(r.code).toBe(0);
      const report = JSON.parse(r.out);
      expect(report.scope.population.audited).toBe(0);
      expect(report.counters.length).toBeGreaterThan(50);
    });
  });

  describe("which folders", () => {
    test("positional folders, --dirs and both together are the same audit", () => {
      const root = repo();
      const positional = JSON.parse(sx(["audit", "counters", "src", "lib"], { cwd: root }).out);
      const flag = JSON.parse(sx(["audit", "counters", "--dirs", "src,lib"], { cwd: root }).out);
      const mixed = JSON.parse(sx(["audit", "counters", "src", "--dirs", "lib", "--dirs=src"], { cwd: root }).out);
      expect(positional.scope.dirs).toEqual(["lib", "src"]); // sorted: the audit does not depend on the order typed
      expect(flag).toEqual(positional);
      expect(mixed).toEqual(positional);
      // however it is spelled: reordered, with a trailing slash, with ./, or as an absolute path
      for (const spelling of [["lib", "src"], ["./src/", "lib/"], [path.join(root, "src"), "lib", "src"]]) {
        expect(sx(["audit", "counters", ...spelling], { cwd: root }).out).toBe(sx(["audit", "counters", "src", "lib"], { cwd: root }).out);
      }
    });

    test("with no folder it audits the scanner's default list", () => {
      const root = repo();
      const report = JSON.parse(sx(["audit", "counters"], { cwd: root }).out);
      expect(report.scope.dirs).toEqual(["lib", "src"]); // sorted; app, components and packages do not exist here
      expect(report.scope.missingDirs).toEqual(["app", "components", "packages"]);
      expect(report.warnings).toEqual([]); // the default list is not nagged about; a folder you name is
    });

    test("a path that leaves the project is refused with a clear error and no output", () => {
      const root = repo();
      for (const bad of ["..", "../x", "src/../../x", "src/../.."]) {
        const r = sx(["audit", "counters", bad], { cwd: root });
        expect(r.code).toBe(1);
        expect(r.out).toBe("");
        expect(r.err).toContain(`folder ${bad} is outside the project root`);
      }
      const viaFlag = sx(["audit", "counters", "--dirs", "src,../x"], { cwd: root });
      expect(viaFlag.code).toBe(1);
      expect(viaFlag.out).toBe("");
    });

    test("a symlink that leaves the project is refused the same way", () => {
      const outside = repo({ "leak.ts": "export {};\n" });
      const root = repo();
      fs.symlinkSync(outside, path.join(root, "evil"));
      const r = sx(["audit", "counters", "evil"], { cwd: root });
      expect(r.code).toBe(1);
      expect(r.out).toBe("");
      expect(r.err).toContain("folder evil is outside the project root");
    });

    test("an absolute path inside the project is fine and is reported relative", () => {
      const root = repo();
      const abs = JSON.parse(sx(["audit", "counters", path.join(root, "src")], { cwd: root }).out);
      const rel = JSON.parse(sx(["audit", "counters", "src"], { cwd: root }).out);
      expect(abs).toEqual(rel);
    });
  });

  describe("--groups", () => {
    test("runs only the groups named, in the fixed order", () => {
      const root = repo();
      const report = JSON.parse(sx(["audit", "counters", "--dirs", "src", "--groups", "tokens,census"], { cwd: root }).out);
      expect(report.groups.run).toEqual(["census", "tokens"]);
      expect([...new Set(report.counters.map((c) => c.group))].sort()).toEqual(["census", "tokens"]);
    });

    test("an unknown group is refused and the known ones are listed", () => {
      const r = sx(["audit", "counters", "--groups", "census,nope"], { cwd: repo() });
      expect(r.code).toBe(1);
      expect(r.out).toBe("");
      expect(r.err).toContain("unknown counter group nope");
      for (const g of GROUPS) expect(r.err).toContain(g);
    });
  });

  describe("--out and --summary", () => {
    test("--out writes the JSON to the file, creates its folders, and leaves stdout empty", () => {
      const root = repo();
      const file = path.join(scratch, "nested", "deeper", "report.json");
      const r = sx(["audit", "counters", "--dirs", "src", "--out", file], { cwd: root });
      expect(r.code).toBe(0);
      expect(r.out).toBe("");
      expect(r.err).toContain("wrote");
      const direct = sx(["audit", "counters", "--dirs", "src"], { cwd: root });
      expect(fs.readFileSync(file, "utf8")).toBe(direct.out);
    });

    test("a relative --out is relative to the current folder, and nothing else in the repo is written", () => {
      const root = repo();
      const before = fs.readdirSync(root).sort();
      const r = sx(["audit", "counters", "--dirs", "src", "--out", "r.json"], { cwd: root });
      expect(r.code).toBe(0);
      expect(fs.readdirSync(root).sort()).toEqual([...before, "r.json"].sort());
    });

    test("--out into a place that cannot be written exits 1", () => {
      const root = repo();
      const blocker = path.join(scratch, "a-file");
      fs.writeFileSync(blocker, "x");
      const r = sx(["audit", "counters", "--dirs", "src", "--out", path.join(blocker, "r.json")], { cwd: root });
      expect(r.code).toBe(1);
      expect(r.err).toContain("could not write");
      expect(r.out).toBe("");
    });

    test("--summary prints a table instead of the JSON, and --out still writes the JSON", () => {
      const root = repo();
      const file = path.join(scratch, "summary-report.json");
      const r = sx(["audit", "counters", "--dirs", "src", "--summary", "--out", file], { cwd: root });
      expect(r.code).toBe(0);
      expect(() => JSON.parse(r.out)).toThrow();
      expect(r.out).toMatch(/^systemix audit counters — counters 1\.\d+\.\d+ \(systemix\.audit-counters\/1\)/);
      expect(r.out).toMatch(/\ncensus \(13\)\n/);
      expect(r.out).toMatch(/census\.files.total\s+3\s+file\n/);
      const report = JSON.parse(fs.readFileSync(file, "utf8"));
      expect(r.out).toContain(`${report.counters.length} counters.`);
      // every counter of the report has a row, none more
      const rows = r.out.split("\n").filter((l) => /^ {2}[a-z]+\.[a-z0-9_.]+\s/.test(l));
      expect(rows.map((l) => l.trim().split(/\s+/)[0])).toEqual(report.counters.map((c) => c.id));
    });

    test("--summary formats ratios, nulls and booleans without inventing numbers", () => {
      const { formatSummary } = require("../../../src/lib/counters/summary");
      const report = runCounters(repo(), { dirs: ["src"], groups: ["tokens", "colour"] });
      const text = formatSummary(report);
      const ratio = report.counters.find((c) => c.unit === "ratio" && c.value !== null);
      expect(text).toContain(`${ratio.id}`);
      expect(text).toContain(`${ratio.value} (${Math.round(ratio.value * 10000) / 100}%)`);
      expect(text).toMatch(/tokens\.source\.found\s+true\s+boolean/);
    });
  });

  describe("--root and the current folder", () => {
    test("--root audits another project from anywhere, with the same bytes as running inside it", () => {
      const root = repo();
      const inside = sx(["audit", "counters", "--dirs", "src"], { cwd: root });
      const elsewhere = sx(["audit", "counters", "--dirs", "src", "--root", root], { cwd: os.tmpdir() });
      const relative = sx(["audit", "counters", "--dirs", "src", "--root", path.basename(root)], { cwd: path.dirname(root) });
      expect(elsewhere.out).toBe(inside.out);
      expect(relative.out).toBe(inside.out);
    });

    test("a root that cannot be read exits 1 with nothing on stdout", () => {
      const r = sx(["audit", "counters", "--root", path.join(scratch, "does-not-exist")]);
      expect(r.code).toBe(1);
      expect(r.out).toBe("");
      expect(r.err).toContain("cannot read the project root");
    });
  });

  describe("arguments", () => {
    test("an unknown flag, a flag without its value and a flag given a value it does not take are refused", () => {
      const root = repo();
      for (const args of [["--nope"], ["--dirs"], ["--out"], ["--pretty=yes"], ["-x"]]) {
        const r = sx(["audit", "counters", ...args], { cwd: root });
        expect(r.code).toBe(1);
        expect(r.out).toBe("");
      }
    });

    test("--help prints the usage and runs nothing", () => {
      const r = sx(["audit", "counters", "--help"], { cwd: repo() });
      expect(r.code).toBe(0);
      expect(r.out).toContain("Usage: npx @getsystemix/cli audit counters");
      for (const flag of ["--dirs", "--groups", "--out", "--pretty", "--summary", "--root"]) expect(r.out).toContain(flag);
      expect(() => JSON.parse(r.out)).toThrow();
    });

    test("the top-level help lists the command in one line", () => {
      const r = sx(["--help"]);
      const lines = r.out.split("\n").filter((l) => l.includes("audit counters"));
      expect(lines).toHaveLength(1);
    });
  });

  describe("it runs where nothing else in the CLI is installed", () => {
    test("with every third-party package unresolvable, the report is identical", () => {
      const root = repo();
      const normal = sx(["audit", "counters", "--dirs", "src"], { cwd: root });
      for (const block of ["gray-matter", "all"]) {
        const blocked = sx(["audit", "counters", "--dirs", "src"], { cwd: root, block });
        expect(blocked.err).toBe("");
        expect(blocked.code).toBe(0);
        expect(blocked.out).toBe(normal.out);
      }
    });

    test("it loads the counters and the shared resolver, and none of the commands that need packages", () => {
      const r = sx(["audit", "counters", "--dirs", "src"], { cwd: repo(), block: "all", trace: true });
      expect(r.code).toBe(0);
      expect(r.loaded).toEqual(expect.arrayContaining(["commands/audit.js", "commands/drift.js", "lib/design-source.js", "lib/css-parse.js", "lib/counters/index.js", "lib/counters/summary.js"]));
      for (const g of GROUPS) expect(r.loaded).toContain(`lib/counters/${g}.js`);
      expect(r.loaded.filter((f) => f.startsWith("commands/") && !["commands/audit.js", "commands/drift.js"].includes(f))).toEqual([]);
    });

    test("no module of the counters, the resolver or the drift scanner names gray-matter", () => {
      const files = [
        path.join(SRC, "lib", "design-source.js"),
        path.join(SRC, "lib", "css-parse.js"),
        path.join(SRC, "commands", "drift.js"),
        ...fs.readdirSync(path.join(SRC, "lib", "counters")).filter((f) => f.endsWith(".js")).map((f) => path.join(SRC, "lib", "counters", f)),
      ];
      for (const f of files) expect(fs.readFileSync(f, "utf8")).not.toMatch(/require\(["']gray-matter/);
    });
  });

  describe("plain `audit` is unchanged", () => {
    test("it installs the design-audit skill into the current folder and prints the same guidance", () => {
      const dir = repo({ "README.md": "x\n" });
      const r = sx(["audit"], { cwd: dir });
      expect(r.code).toBe(0);
      expect(r.out).toContain("✓ design-audit installed → .claude/skills/design-audit/");
      expect(r.out).toContain("/design-audit src/");
      expect(fs.existsSync(path.join(dir, ".claude", "skills", "design-audit", "SKILL.md"))).toBe(true);
    });

    test("an unknown subcommand (a typo of `counters` included) is an error that installs nothing", () => {
      for (const args of [["audit", "counter"], ["audit", "--whatever", "src"], ["audit", "src"]]) {
        const dir = repo({ "README.md": "x\n" });
        const r = sx(args, { cwd: dir });
        expect(r.code).toBe(1);
        expect(r.err).toContain(`unknown audit subcommand: ${args[1]}`);
        expect(r.err).toContain("counters");
        expect(r.out).toBe("");
        expect(fs.existsSync(path.join(dir, ".claude"))).toBe(false);
      }
    });

    test("`audit --help` prints usage and installs nothing", () => {
      for (const flag of ["--help", "-h", "help"]) {
        const dir = repo({ "README.md": "x\n" });
        const r = sx(["audit", flag], { cwd: dir });
        expect(r.code).toBe(0);
        expect(r.out).toContain("audit counters");
        expect(fs.existsSync(path.join(dir, ".claude"))).toBe(false);
      }
    });

    test("`audit counters` installs nothing", () => {
      const dir = repo();
      sx(["audit", "counters", "--dirs", "src"], { cwd: dir });
      expect(fs.existsSync(path.join(dir, ".claude"))).toBe(false);
    });
  });

  describe("failures", () => {
    test("a report that fails validation exits 1, prints the reason on stderr and nothing on stdout", async () => {
      jest.resetModules();
      jest.doMock("../../../src/lib/counters", () => ({
        GROUPS,
        runCounters: () => { throw new Error("counters report failed validation:\n  - duplicate counter id x.y"); },
      }));
      try {
        const { audit } = require("../../../src/commands/audit");
        const { out, err, exitCode, result } = await capture(() => audit(["counters", "--dirs", "src"], { projectRoot: repo() }));
        expect(result).toBeNull();
        expect(exitCode).toBe(1);
        expect(out).toEqual([]);
        expect(err.join("\n")).toContain("duplicate counter id x.y");
      } finally {
        jest.dontMock("../../../src/lib/counters");
        jest.resetModules();
      }
    });

    test("in-process, the command returns the report and writes only to the console", async () => {
      const root = repo();
      const { audit } = require("../../../src/commands/audit");
      const { out, exitCode, result } = await capture(() => audit(["counters", "--dirs", "src", "--groups", "census"], { projectRoot: root }));
      expect(exitCode).toBeUndefined();
      expect(out).toHaveLength(1);
      expect(JSON.parse(out[0])).toEqual(JSON.parse(JSON.stringify(result)));
    });
  });
});
