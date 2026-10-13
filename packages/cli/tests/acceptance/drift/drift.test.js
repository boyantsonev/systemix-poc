/**
 * drift.test.js — acceptance tests for `systemix drift scan|history`
 * (the sacred-timeline substrate: deterministic snapshots, rolling window).
 *
 * Every expectation is computed by hand from a tiny temp repo. The score is the
 * clean-file share: round-half-up of 100 × (1 − (colour-hit files + ½ px-only
 * files) ÷ audited files).
 */

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const { drift, readHistory } = require("../../../src/commands/drift");
const { makeRepo, removeRepo, capture, historyFile, readJsonFile, legacySnapshot } = require("./helpers");

const NOW = new Date("2026-07-11T10:00:00Z");

const silence = async (fn) => (await capture(fn)).result;

describe("systemix drift", () => {
  let root;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "sx-drift-"));
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.mkdirSync(path.join(root, "design"), { recursive: true });
    // canonical tokens are exempt even though they are full of colors
    fs.writeFileSync(path.join(root, "design", "tokens.css"), ":root { --primary: #1a1713; }");
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  test("scan counts raw colors as critical and px as warnings, writes a snapshot", async () => {
    fs.writeFileSync(
      path.join(root, "src", "Bad.tsx"),
      "const s = { color: '#ff0000', background: 'rgb(1,2,3)', padding: '16px' }"
    );
    fs.writeFileSync(path.join(root, "src", "Clean.tsx"), "const ok = 'var(--primary)'");

    const snapshot = await silence(() => drift(["scan"], { projectRoot: root, now: new Date("2026-07-11T10:00:00Z") }));

    expect(snapshot.critical).toBe(2); // hex + rgb(
    expect(snapshot.warnings).toBe(1); // 16px
    expect(snapshot.componentsAudited).toBe(2);
    expect(snapshot.topOffenders).toEqual(["src/Bad.tsx"]);
    expect(snapshot.runAt).toBe("2026-07-11T10:00:00.000Z");
    expect(snapshot.triggeredBy).toBe("cli");
    expect(snapshot.filesWithDrift).toBe(1);
    expect(snapshot.scoreFormula).toBe("clean-files/1");
    expect(snapshot.tokenSource).toBe("design/tokens.css");
    expect(snapshot.dirs).toEqual(["src"]);

    const { snapshots } = readHistory(root);
    expect(snapshots).toHaveLength(1);
    // 1 of the 2 audited files holds a color hit: round(100 × (1 − 1/2)) = 50.
    // The old per-hit penalty (100 − 2·2 − ½·1 = 96) rated a file that is half colour-dirty as 96/100.
    expect(snapshots[0].score).toBe(50);
  });

  test("design/tokens.css is exempt; generated files are skipped", async () => {
    fs.writeFileSync(path.join(root, "src", "themes.generated.ts"), "export const t = '#123456'");
    // something must be audited, or the scan is refused (see the refusal test below)
    fs.writeFileSync(path.join(root, "src", "Clean.tsx"), "export const ok = 1");
    const snapshot = await silence(() => drift(["scan"], { projectRoot: root }));
    expect(snapshot.critical).toBe(0);
    expect(snapshot.componentsAudited).toBe(1);
    expect(snapshot.score).toBe(100);
  });

  test("history rolls at 90 snapshots and prints the recent window", async () => {
    fs.writeFileSync(path.join(root, "src", "Clean.tsx"), "export const ok = 1");
    for (let i = 0; i < 95; i++) {
      await silence(() => drift(["scan", "--triggered-by", `run-${i}`], { projectRoot: root }));
    }
    const { snapshots } = readHistory(root);
    expect(snapshots).toHaveLength(90);
    expect(snapshots[89].triggeredBy).toBe("run-94");
    expect(snapshots[0].triggeredBy).toBe("run-5");

    const shown = await silence(() => drift(["history", "--last", "5"], { projectRoot: root }));
    expect(shown).toHaveLength(5);
  });

  test("a scan with nothing audited is refused: no snapshot, exit code 1, the reason is named", async () => {
    fs.writeFileSync(path.join(root, "src", "only.test.tsx"), "const t = '#ff0000'");
    const { result, err, exitCode } = await capture(() => drift(["scan"], { projectRoot: root }));
    expect(result).toBeNull();
    expect(exitCode).toBe(1);
    expect(fs.existsSync(path.join(root, ".systemix"))).toBe(false);
    expect(err.join("\n")).toContain("nothing to audit — 1 source file under src, all excluded (1 test)");
  });

  test("an empty project is refused too, and --json still prints one document", async () => {
    const { result, out, exitCode } = await capture(() => drift(["scan", "--json"], { projectRoot: root }));
    expect(result).toBeNull();
    expect(exitCode).toBe(1);
    expect(out).toHaveLength(1);
    const doc = JSON.parse(out[0]);
    expect(doc.ok).toBe(false);
    expect(doc.score).toBeNull();
    expect(doc.componentsAudited).toBe(0);
    expect(doc.error).toMatch(/^nothing to audit — no source files .* under: src$/);
  });
});

describe("drift scan — which folders", () => {
  let root;
  beforeAll(() => {
    root = makeRepo({
      "src/a.tsx": "const a = '#ff0000';\n", //                 colour 1
      "src/ok.tsx": "export const ok = 1;\n", //                clean
      "lib/b.tsx": "const b = 'rgb(1,2,3)'; const p = '2px';\n", // colour 1, px 1
      "app/c.tsx": "export const c = 1;\n", //                  clean
      "-odd/z.ts": "const z = 'hsl(0 0% 0%)';\n", //            colour 1
      "README.md": "# not source\n",
      "x.ts": "const x = '8px';\n", //                          px 1, at the root
      "node_modules/dep/index.js": "const d = '#aa00aa';\n",
      ".hidden/h.ts": "const h = '#bb00bb';\n",
    });
  });
  afterAll(() => removeRepo(root));

  const scan = async (args) => {
    const r = await capture(() => drift(["scan", "--dry-run", ...args], { projectRoot: root, now: NOW }));
    return { snapshot: r.result, err: r.err.join("\n"), exitCode: r.exitCode };
  };

  test("with no folder named the default list is scanned, and its missing folders are not nagged about", async () => {
    const { snapshot, err, exitCode } = await scan([]);
    // default list = src app components lib packages -> src, app, lib exist: a, ok, b, c
    expect(snapshot.dirs).toEqual(["src", "app", "lib"]);
    expect(snapshot.componentsAudited).toBe(4);
    expect(snapshot.critical).toBe(2);
    expect(snapshot.warnings).toBe(1);
    expect(snapshot.score).toBe(50); // 2 colour files of 4: round(100 × (1 − 2/4))
    expect(err).toBe("");
    expect(exitCode).toBeUndefined();
  });

  test.each([
    ["a positional folder", ["src"]],
    ["--dirs <value>", ["--dirs", "src"]],
    ["--dirs=<value>", ["--dirs=src"]],
    ["the folder twice, spelled differently", ["src", "./src", "--dirs", "src"]],
  ])("%s scans exactly that folder", async (_name, args) => {
    const { snapshot } = await scan(args);
    expect(snapshot.dirs).toEqual(["src"]);
    expect(snapshot.componentsAudited).toBe(2); // a.tsx, ok.tsx — not lib/, not packages/
    expect(snapshot.critical).toBe(1);
    expect(snapshot.warnings).toBe(0);
    expect(snapshot.score).toBe(50); // 1 colour file of 2
  });

  test.each([
    ["two positionals", ["src", "lib"]],
    ["a comma-separated positional", ["src,lib"]],
    ["a repeated --dirs", ["--dirs", "src", "--dirs", "lib"]],
    ["repeated --dirs=", ["--dirs=src", "--dirs=lib"]],
    ["--dirs with a list", ["--dirs", "src,lib"]],
    ["--dirs plus a positional", ["--dirs=src", "lib"]],
  ])("%s are unioned", async (_name, args) => {
    const { snapshot } = await scan(args);
    expect(snapshot.dirs).toEqual(["src", "lib"]);
    expect(snapshot.componentsAudited).toBe(3);
    expect(snapshot.critical).toBe(2);
    expect(snapshot.warnings).toBe(1);
    expect(snapshot.score).toBe(33); // 2 colour files of 3: round(33.3)
  });

  test("a folder that is a file scans that one file", async () => {
    const { snapshot } = await scan(["lib/b.tsx"]);
    expect(snapshot.dirs).toEqual(["lib/b.tsx"]);
    expect(snapshot.componentsAudited).toBe(1);
    expect(snapshot.critical).toBe(1);
    expect(snapshot.warnings).toBe(1);
  });

  test("a file that is not source is nothing to audit: refused, with the reason", async () => {
    const { snapshot, err, exitCode } = await scan(["README.md"]);
    expect(snapshot).toBeNull();
    expect(exitCode).toBe(1);
    expect(err).toContain("nothing to audit — no source files");
    expect(err).toContain("README.md");
  });

  test("`.` scans the whole project but never node_modules or dot folders", async () => {
    const { snapshot } = await scan(["."]);
    expect(snapshot.dirs).toEqual(["."]);
    // src(2) + lib(1) + app(1) + -odd(1) + x.ts(1) = 6
    expect(snapshot.componentsAudited).toBe(6);
    expect(snapshot.critical).toBe(3); // a.tsx, b.tsx, z.ts
    expect(snapshot.warnings).toBe(2); // b.tsx, x.ts
  });

  test("an absolute path inside the project is the same as the relative one", async () => {
    const { snapshot } = await scan([path.join(root, "src")]);
    expect(snapshot.dirs).toEqual(["src"]);
    expect(snapshot.componentsAudited).toBe(2);
  });

  test("a folder you named that is missing is reported; the others still scan", async () => {
    const { snapshot, err } = await scan(["src", "nope"]);
    expect(err).toContain("nope not found — skipped");
    expect(snapshot.dirs).toEqual(["src"]);
    expect(snapshot.componentsAudited).toBe(2);
  });

  test("a folder outside the project is refused by name, never scanned", async () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "sx-outside-"));
    fs.writeFileSync(path.join(outside, "leak.ts"), "const leak = '#123456';\n");
    try {
      for (const target of ["../" + path.basename(outside), outside]) {
        const { snapshot, err } = await scan(["src", target]);
        expect(err).toContain(`${target} is outside the project root — skipped`);
        expect(snapshot.componentsAudited).toBe(2);
        expect(snapshot.critical).toBe(1);
      }
      const only = await scan(["../" + path.basename(outside)]);
      expect(only.snapshot).toBeNull();
      expect(only.exitCode).toBe(1);
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  test("after `--` everything is a folder, even one that looks like a flag", async () => {
    const { snapshot } = await scan(["--", "-odd"]);
    expect(snapshot.dirs).toEqual(["-odd"]);
    expect(snapshot.componentsAudited).toBe(1);
    expect(snapshot.critical).toBe(1);
  });
});

describe("drift scan — arguments that are wrong are refused, never guessed at", () => {
  let root;
  beforeEach(() => {
    root = makeRepo({ "src/a.tsx": "const a = '#ff0000';\n", "src/ok.tsx": "export const ok = 1;\n" });
  });
  afterEach(() => removeRepo(root));

  const run = (args) => capture(() => drift(["scan", ...args], { projectRoot: root, now: NOW }));
  const wroteNothing = () => expect(fs.existsSync(path.join(root, ".systemix"))).toBe(false);

  test.each([
    ["--triggered-by with no value", ["--triggered-by"], "--triggered-by needs a value"],
    ["--triggered-by followed by another flag (the flag is not its value)", ["--triggered-by", "--dry-run"], "--triggered-by needs a value"],
    ["--triggered-by= (empty)", ["--triggered-by="], "--triggered-by needs a value"],
    ["--dirs with no value", ["--dirs"], "--dirs needs a value"],
    ["--dirs= (empty)", ["--dirs="], "--dirs needs a value"],
    ["--dirs followed by another flag", ["--dirs", "--json"], "--dirs needs a value"],
    ["a flag that takes no value given one", ["--dry-run=yes"], "--dry-run does not take a value"],
    ["an unknown flag (a typo of --dirs must not silently scan the default folders)", ["--dir", "src"], "unknown flag --dir"],
    ["an unknown short flag", ["-x"], "unknown flag -x"],
  ])("%s", async (_name, args, message) => {
    const { result, err, exitCode, out } = await run(args);
    expect(result).toBeNull();
    expect(exitCode).toBe(1);
    expect(err.join("\n")).toContain(message);
    expect(out).toEqual([]);
    wroteNothing();
  });

  test("--help prints the usage and scans nothing", async () => {
    for (const flag of ["--help", "-h"]) {
      const { result, out, exitCode } = await run([flag]);
      expect(result).toBeNull();
      expect(exitCode).toBeUndefined();
      expect(out.join("\n")).toContain("drift scan [dir…]");
      wroteNothing();
    }
  });

  test("--triggered-by takes its value in both spellings; the last one wins", async () => {
    expect((await run(["--dry-run", "--triggered-by", "ci"])).result.triggeredBy).toBe("ci");
    expect((await run(["--dry-run", "--triggered-by=ci"])).result.triggeredBy).toBe("ci");
    expect((await run(["--dry-run", "--triggered-by=a", "--triggered-by", "b"])).result.triggeredBy).toBe("b");
    expect((await run(["--dry-run"])).result.triggeredBy).toBe("cli");
  });

  test("an unknown subcommand is an error, not a silent success", async () => {
    const { result, err, out, exitCode } = await capture(() => drift(["scna"], { projectRoot: root }));
    expect(result).toBeNull();
    expect(exitCode).toBe(1);
    expect(err.join("\n")).toContain("unknown drift subcommand: scna");
    expect(out.join("\n")).toContain("Usage:");
  });

  test("no subcommand, `help` and `--help` print the usage and succeed", async () => {
    for (const args of [[], ["help"], ["--help"], ["-h"]]) {
      const { out, exitCode } = await capture(() => drift(args, { projectRoot: root }));
      expect(exitCode).toBeUndefined();
      expect(out.join("\n")).toContain("drift history [--last 10]");
    }
  });
});

describe("drift scan --dry-run", () => {
  let root;
  beforeEach(() => {
    root = makeRepo({ "src/a.tsx": "const a = '#ff0000'; const p = '4px';\n", "src/ok.tsx": "export const ok = 1;\n" });
  });
  afterEach(() => removeRepo(root));

  test("computes and prints the scan but writes nothing — not even the .systemix folder", async () => {
    const { result, out, exitCode } = await capture(() => drift(["scan", "--dry-run"], { projectRoot: root, now: NOW }));
    expect(exitCode).toBeUndefined();
    expect(fs.existsSync(path.join(root, ".systemix"))).toBe(false);
    expect(out.join("\n")).toContain("dry run, no snapshot written");
    expect(out.join("\n")).toContain("score 50 (1 critical, 1 warnings; 1 of 2 files have drift)");
    // the would-be snapshot is returned, so callers have one shape
    expect(result).toMatchObject({ score: 50, critical: 1, warnings: 1, componentsAudited: 2, triggeredBy: "cli", runAt: NOW.toISOString() });
  });

  test("leaves an existing history file byte-for-byte alone", async () => {
    const file = historyFile(root);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const before = JSON.stringify([legacySnapshot()]); // no trailing newline, bare array: a real write would change both
    fs.writeFileSync(file, before);
    await capture(() => drift(["scan", "--dry-run"], { projectRoot: root }));
    expect(fs.readFileSync(file, "utf8")).toBe(before);
    expect(fs.readdirSync(path.dirname(file))).toEqual(["drift-history.json"]);
  });

  test("still refuses when nothing is audited", async () => {
    const { result, exitCode } = await capture(() => drift(["scan", "--dry-run", "nope"], { projectRoot: root }));
    expect(result).toBeNull();
    expect(exitCode).toBe(1);
  });

  test("works on a history file a real scan would refuse to overwrite", async () => {
    const file = historyFile(root);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "<<<<<<< ours\n[]\n=======\n[]\n>>>>>>> theirs\n");
    const { result, exitCode } = await capture(() => drift(["scan", "--dry-run"], { projectRoot: root }));
    expect(exitCode).toBeUndefined();
    expect(result.score).toBe(50);
  });
});

describe("drift scan --json", () => {
  let root;
  beforeEach(() => {
    root = makeRepo({
      "design/tokens.css": ":root { --c: #111111; }\n",
      "src/b.tsx": "const b = '#bbbbbb'; const c = 'rgba(0,0,0,.5)'; const p = '2px';\n", // 2 colour + 1 px
      "src/a.tsx": "const a = '#aaaaaa'; const p = '2px';\n", //                          1 colour + 1 px
      "src/p.tsx": "const p = '2px'; const q = '4px';\n", //                               2 px only
      "src/ok.tsx": "export const ok = 1;\n",
    });
  });
  afterEach(() => removeRepo(root));

  test("prints the scan result as the only stdout; warnings go to stderr", async () => {
    const { result, out, err } = await capture(() => drift(["scan", "src", "nope", "--json", "--dry-run"], { projectRoot: root, now: NOW }));
    expect(result).not.toBeNull();
    expect(out).toHaveLength(1);
    const doc = JSON.parse(out[0]);
    expect(err.join("\n")).toContain("nope not found");
    expect(doc).toMatchObject({
      schema: "systemix.drift-scan/1",
      ok: true,
      dryRun: true,
      snapshotWritten: false,
      snapshotNumber: null,
      snapshot: null,
      scoreFormula: "clean-files/1",
      critical: 3,
      warnings: 4,
      componentsAudited: 4,
      filesWithDrift: 3,
      tokenSource: "design/tokens.css",
      tokenSourceVia: "design/tokens.css",
      dirs: ["src"],
      missingDirs: ["nope"],
      rejectedDirs: [],
      skipped: [],
      population: { census: 4, tests: 0, declarations: 0, audited: 4, scanned: 4, tokenSourceInCensus: false },
    });
    // 2 colour files, 1 px-only file, 1 clean file of 4: 100 × (1 − (2 + ½)/4) = 37.5 -> 38
    expect(doc.score).toBe(38);
    // total hits desc, then path: b (3), a (2) and p (2) -> a before p
    expect(doc.perFile).toEqual([
      { file: "src/b.tsx", c: 2, w: 1 },
      { file: "src/a.tsx", c: 1, w: 1 },
      { file: "src/p.tsx", c: 0, w: 2 },
    ]);
    expect(doc.topOffenders).toEqual(["src/b.tsx", "src/a.tsx", "src/p.tsx"]);
  });

  test("a dry-run document is byte-identical from run to run — no clock in it, even a different one", async () => {
    jest.useFakeTimers();
    try {
      jest.setSystemTime(new Date("2020-01-01T00:00:00Z"));
      const a = await capture(() => drift(["scan", "--json", "--dry-run"], { projectRoot: root, now: new Date("2020-01-01T00:00:00Z") }));
      jest.setSystemTime(new Date("2031-12-31T23:59:59Z"));
      const b = await capture(() => drift(["scan", "--json", "--dry-run"], { projectRoot: root, now: new Date("2031-12-31T23:59:59Z") }));
      expect(a.out).toHaveLength(1);
      expect(a.out).toEqual(b.out);
      expect(a.out[0]).not.toMatch(/20\d\d-\d\d-\d\dT/); // no timestamp anywhere in it
    } finally {
      jest.useRealTimers();
    }
  });

  test("a real scan reports the snapshot it wrote", async () => {
    const { result, out } = await capture(() => drift(["scan", "src", "--json", "--triggered-by", "ci"], { projectRoot: root, now: NOW }));
    expect(out).toHaveLength(1);
    const doc = JSON.parse(out[0]);
    expect(doc).toMatchObject({ ok: true, dryRun: false, snapshotWritten: true, snapshotNumber: 1 });
    expect(doc.snapshot).toEqual(result);
    expect(doc.snapshot).toMatchObject({ runAt: NOW.toISOString(), triggeredBy: "ci", score: 38, critical: 3, warnings: 4, componentsAudited: 4 });
    expect(readJsonFile(historyFile(root)).snapshots).toEqual([doc.snapshot]);
  });

  test("a refused scan still prints one document, with ok:false, and exits 1", async () => {
    const { out, exitCode } = await capture(() => drift(["scan", "nope", "--json"], { projectRoot: root }));
    expect(exitCode).toBe(1);
    expect(out).toHaveLength(1);
    expect(JSON.parse(out[0])).toMatchObject({ ok: false, score: null, missingDirs: ["nope"] });
  });

  test("a history file it cannot write to is an error in the document too, and the file is untouched", async () => {
    const file = historyFile(root);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "{ not json");
    const { out, exitCode } = await capture(() => drift(["scan", "--json"], { projectRoot: root }));
    expect(exitCode).toBe(1);
    expect(out).toHaveLength(1);
    const doc = JSON.parse(out[0]);
    expect(doc.ok).toBe(false);
    expect(doc.snapshotWritten).toBe(false);
    expect(doc.error).toContain("is not valid JSON");
    expect(fs.readFileSync(file, "utf8")).toBe("{ not json");
  });
});

describe("drift history file", () => {
  let root;
  beforeEach(() => {
    root = makeRepo({ "src/a.tsx": "const a = '#ff0000';\n", "src/ok.tsx": "export const ok = 1;\n" });
    fs.mkdirSync(path.join(root, ".systemix"), { recursive: true });
  });
  afterEach(() => removeRepo(root));

  const scan = (args = []) => capture(() => drift(["scan", ...args], { projectRoot: root, now: NOW }));
  const write = (value) => fs.writeFileSync(historyFile(root), typeof value === "string" ? value : JSON.stringify(value));

  test("appends to an older history (bare list) without touching the old snapshots", async () => {
    const old = [legacySnapshot(), legacySnapshot({ runAt: "2026-07-09T10:00:00.000Z", score: 70 })];
    write(old);
    const { result } = await scan();
    const file = readJsonFile(historyFile(root));
    expect(Object.keys(file)).toEqual(["snapshots"]); // the app and `readHistory` read this shape
    expect(file.snapshots).toHaveLength(3);
    expect(file.snapshots.slice(0, 2)).toEqual(old);
    expect(file.snapshots[2]).toEqual(result);
    // an old snapshot has no formula tag, a new one does
    expect(file.snapshots[0].scoreFormula).toBeUndefined();
    expect(file.snapshots[2].scoreFormula).toBe("clean-files/1");
  });

  test("keeps other top-level keys of an object-shaped file", async () => {
    write({ note: "keep me", snapshots: [legacySnapshot()] });
    await scan();
    const file = readJsonFile(historyFile(root));
    expect(file.note).toBe("keep me");
    expect(file.snapshots).toHaveLength(2);
  });

  test("an empty file is an empty history", async () => {
    write("");
    const { exitCode } = await scan();
    expect(exitCode).toBeUndefined();
    expect(readJsonFile(historyFile(root)).snapshots).toHaveLength(1);
  });

  test.each([
    ["is not valid JSON", "<<<<<<< HEAD\n[]\n>>>>>>> branch\n"],
    ["has a `snapshots` field that is not a list", JSON.stringify({ snapshots: "oops" })],
    ["is not a snapshot list", "42"],
    ["is not a snapshot list", "null"],
  ])("a file that %s is never overwritten (a conflict marker must not eat the timeline)", async (problem, content) => {
    write(content);
    const { result, err, exitCode } = await scan();
    expect(result).toBeNull();
    expect(exitCode).toBe(1);
    expect(err.join("\n")).toContain(`.systemix/drift-history.json ${problem} — not overwriting it`);
    expect(fs.readFileSync(historyFile(root), "utf8")).toBe(content);
  });

  test("a write that fails leaves the old history untouched and no temp file behind", async () => {
    write([legacySnapshot()]);
    const before = fs.readFileSync(historyFile(root), "utf8");
    const spy = jest.spyOn(fs, "renameSync").mockImplementation(() => {
      throw Object.assign(new Error("EXDEV: cross-device link not permitted"), { code: "EXDEV" });
    });
    try {
      const { result, err, exitCode } = await scan();
      expect(result).toBeNull();
      expect(exitCode).toBe(1);
      expect(err.join("\n")).toContain("EXDEV");
    } finally {
      spy.mockRestore();
    }
    expect(fs.readFileSync(historyFile(root), "utf8")).toBe(before);
    expect(fs.readdirSync(path.join(root, ".systemix"))).toEqual(["drift-history.json"]);
  });

  test("leaves no temp file behind", async () => {
    await scan();
    await scan();
    expect(fs.readdirSync(path.join(root, ".systemix"))).toEqual(["drift-history.json"]);
  });

  test("readHistory reads both shapes and tolerates a missing or broken file", () => {
    expect(readHistory(root).snapshots).toEqual([]);
    write([legacySnapshot()]);
    expect(readHistory(root).snapshots).toHaveLength(1);
    write({ snapshots: [legacySnapshot(), legacySnapshot()] });
    expect(readHistory(root).snapshots).toHaveLength(2);
    write("{ broken");
    expect(readHistory(root).snapshots).toEqual([]);
  });
});

describe("drift history", () => {
  let root;
  const snap = (i, over = {}) => ({
    runAt: `2026-07-${String(i).padStart(2, "0")}T10:00:00.000Z`,
    triggeredBy: `run-${i}`,
    score: i,
    critical: i,
    warnings: 2 * i,
    componentsAudited: 10,
    topOffenders: [],
    scoreFormula: "clean-files/1",
    ...over,
  });
  beforeEach(() => {
    root = makeRepo({ ".systemix/drift-history.json": JSON.stringify({ snapshots: Array.from({ length: 12 }, (_, i) => snap(i + 1)) }) });
  });
  afterEach(() => removeRepo(root));

  const history = (args = []) => capture(() => drift(["history", ...args], { projectRoot: root }));

  test("prints the last 10 by default, oldest first, in the original line format", async () => {
    const { result, out } = await history();
    expect(result.map((s) => s.triggeredBy)).toEqual(Array.from({ length: 10 }, (_, i) => `run-${i + 3}`));
    expect(out).toHaveLength(12); // blank, 10 lines, blank
    expect(out[0]).toBe("");
    expect(out[1]).toBe("  2026-07-03T10:00:00.000Z  score   3  critical 3  warnings 6  (run-3)");
    expect(out[10]).toBe("  2026-07-12T10:00:00.000Z  score  12  critical 12  warnings 24  (run-12)");
  });

  test.each([
    [["--last", "3"], ["run-10", "run-11", "run-12"]],
    [["--last=2"], ["run-11", "run-12"]],
    [["--last", "50"], Array.from({ length: 12 }, (_, i) => `run-${i + 1}`)],
  ])("%j limits the window", async (args, expected) => {
    expect((await history(args)).result.map((s) => s.triggeredBy)).toEqual(expected);
  });

  test.each([["0"], ["-3"], ["abc"], ["1.5"], ["1e2"]])("--last %s is refused, not read as 'everything'", async (value) => {
    const { result, err, exitCode, out } = await history(["--last", value]);
    expect(result).toBeNull();
    expect(exitCode).toBe(1);
    expect(err.join("\n")).toContain("--last needs a positive whole number");
    expect(out).toEqual([]);
  });

  test("--last with no value is refused", async () => {
    const { exitCode, err } = await history(["--last"]);
    expect(exitCode).toBe(1);
    expect(err.join("\n")).toContain("--last needs a value");
  });

  test("--json prints the window as the only stdout", async () => {
    const { result, out } = await history(["--last", "2", "--json"]);
    expect(out).toHaveLength(1);
    expect(JSON.parse(out[0])).toEqual(result);
    expect(result.map((s) => s.triggeredBy)).toEqual(["run-11", "run-12"]);
  });

  test("with no history it says so (and --json prints an empty list)", async () => {
    fs.rmSync(historyFile(root));
    const text = await history();
    expect(text.result).toEqual([]);
    expect(text.out.join("\n")).toContain("no drift history yet — run: npx @getsystemix/cli drift scan");
    const json = await history(["--json"]);
    expect(JSON.parse(json.out[0])).toEqual([]);
  });

  test("a history file it cannot read is reported on stderr and shown as empty", async () => {
    fs.writeFileSync(historyFile(root), "{ broken");
    const { result, err, exitCode } = await history();
    expect(result).toEqual([]);
    expect(exitCode).toBeUndefined();
    expect(err.join("\n")).toContain("is not valid JSON");
  });

  test("a bare list and entries that are not objects are tolerated", async () => {
    fs.writeFileSync(historyFile(root), JSON.stringify([7, null, "x", snap(1), [], snap(2)]));
    const { result } = await history();
    expect(result.map((s) => s.triggeredBy)).toEqual(["run-1", "run-2"]);
  });

  test("snapshots from before the clean-files score are marked when they share a window with new ones", async () => {
    fs.writeFileSync(historyFile(root), JSON.stringify({ snapshots: [legacySnapshot({ triggeredBy: "manual" }), snap(5)] }));
    const mixed = await history();
    expect(mixed.out.some((l) => l.endsWith("(manual) *"))).toBe(true);
    expect(mixed.out.some((l) => l.endsWith("(run-5)"))).toBe(true);
    expect(mixed.out.join("\n")).toContain("* no scoreFormula: written before the clean-files score");

    // a history that is all old (or all new) prints exactly as it always did
    fs.writeFileSync(historyFile(root), JSON.stringify({ snapshots: [legacySnapshot({ triggeredBy: "manual" })] }));
    const old = await history();
    expect(old.out.join("\n")).not.toContain("*");
  });
  describe("a snapshot with a missing or mistyped field", () => {
    const write = (snapshots) => fs.writeFileSync(historyFile(root), JSON.stringify({ snapshots }));

    test("prints '-' for what it lacks, never 'undefined' or '[object Object]'", async () => {
      write([
        {},
        { runAt: "2026-01-01T00:00:00Z" },
        { score: null, runAt: "2026-01-02" },
        { runAt: "2026-01-03", score: "high", critical: { a: 1 }, warnings: [1], triggeredBy: null },
      ]);
      const { out, exitCode } = await history();
      expect(exitCode).toBeUndefined();
      expect(out).toEqual([
        "",
        "  -  score   -  critical -  warnings -  (-)",
        "  2026-01-01T00:00:00Z  score   -  critical -  warnings -  (-)",
        "  2026-01-02  score   -  critical -  warnings -  (-)",
        "  2026-01-03  score   -  critical -  warnings -  (-)",
        "",
      ]);
      for (const line of out) expect(line).not.toMatch(/undefined|\[object|NaN|null/);
    });

    test("only a finite number is a number; an empty or non-text label is '-'", async () => {
      write([
        snap(1, { score: "68", critical: true, warnings: 7.5, runAt: 12345, triggeredBy: "" }),
        snap(2, { score: 100, critical: 0, warnings: 0 }),
      ]);
      const { out } = await history();
      expect(out[1]).toBe("  -  score   -  critical -  warnings 7.5  (-)");
      expect(out[2]).toBe("  2026-07-02T10:00:00.000Z  score 100  critical 0  warnings 0  (run-2)");
    });

    test("a field-poor snapshot among new ones is still marked as written before the formula tag", async () => {
      write([{ runAt: "2026-01-01" }, snap(3)]);
      const { out } = await history();
      expect(out[1]).toBe("  2026-01-01  score   -  critical -  warnings -  (-) *");
    });

    test("--json is not reformatted: the raw snapshots come out as they were stored", async () => {
      write([{}, { score: "high", critical: { a: 1 } }]);
      const { result, out } = await history(["--json"]);
      expect(result).toEqual([{}, { score: "high", critical: { a: 1 } }]);
      expect(JSON.parse(out[0])).toEqual(result);
    });
  });

  describe("arguments that are wrong are refused (as `scan` does), not ignored", () => {
    test.each([
      [["--bogus"], "unknown flag --bogus"],
      [["--lst", "3"], "unknown flag --lst"],
      [["-x"], "unknown flag -x"],
      [["extra"], "unexpected argument extra"],
      [["3"], "unexpected argument 3"],
      [["--last", "2", "stray"], "unexpected argument stray"],
      [["--json=yes"], "--json does not take a value"],
      [["--", "x"], "unexpected argument x"],
    ])("%j", async (args, message) => {
      const { result, out, err, exitCode } = await history(args);
      expect(result).toBeNull();
      expect(exitCode).toBe(1);
      expect(out).toEqual([]); // nothing on stdout, not even the default window
      expect(err.join("\n")).toContain(message);
    });

    test("every problem is named, not just the first", async () => {
      const { err, exitCode } = await history(["--lst", "3", "--bogus"]);
      expect(exitCode).toBe(1);
      const text = err.join("\n");
      expect(text).toContain("unknown flag --lst");
      expect(text).toContain("unknown flag --bogus");
      expect(text).toContain("unexpected argument 3");
    });

    test("--help still prints the usage, whatever else is on the line", async () => {
      const { out, exitCode } = await history(["--bogus", "--help"]);
      expect(exitCode).toBeUndefined();
      expect(out.join("\n")).toContain("drift history [--last 10] [--json]");
    });

    test("the valid spellings are unaffected", async () => {
      expect((await history(["--last", "2", "--json"])).result).toHaveLength(2);
      expect((await history(["--last=2"])).result).toHaveLength(2);
    });
  });
});
