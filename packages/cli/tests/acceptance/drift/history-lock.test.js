/**
 * history-lock.test.js — overlapping scans all land in .systemix/drift-history.json.
 *
 * The history is read, appended to and written back. Without a lock two scans that
 * overlap both read the same list and the second write silently drops the first
 * snapshot (8 parallel `drift scan` left 7). The write is atomic (rename), so nothing
 * was ever corrupted — updates were lost. These tests run real processes against one
 * repo, because the race is between processes, not inside one.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const { drift } = require("../../../src/commands/drift");
const { makeRepo, removeRepo, capture, historyFile, readJsonFile } = require("./helpers");

const PKG = path.resolve(__dirname, "../../..");
const BIN = path.join(PKG, "bin", "cli.js");
const DRIFT = path.join(PKG, "src", "commands", "drift.js");

const lockFile = (root) => `${historyFile(root)}.lock`;

/** Run a node process and resolve with { code, err } when it exits. */
function child(args, { cwd }) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, args, { cwd, env: { PATH: process.env.PATH, NO_COLOR: "1" } });
    let err = "";
    p.stderr.on("data", (d) => { err += d; });
    p.on("error", reject);
    p.on("close", (code) => resolve({ code, err }));
  });
}

// appendSnapshot in a tight loop: the shortest possible window between read and write
const WORKER = `
  const { appendSnapshot } = require(${JSON.stringify(DRIFT)});
  const [root, id, count] = process.argv.slice(1);
  for (let i = 0; i < Number(count); i++) {
    appendSnapshot(root, { runAt: "2026-07-11T10:00:00.000Z", triggeredBy: id + "-" + i, score: 1, critical: 0, warnings: 0, componentsAudited: 1, topOffenders: [] });
  }
`;

describe("overlapping writers", () => {
  let root;
  beforeEach(() => {
    root = makeRepo({ "src/a.ts": 'export const a = "#ff0000";\n' });
  });
  afterEach(() => removeRepo(root));

  test("6 processes appending 10 snapshots each in a tight loop lose none", async () => {
    const workers = ["w1", "w2", "w3", "w4", "w5", "w6"];
    const results = await Promise.all(workers.map((id) => child(["-e", WORKER, root, id, "10"], { cwd: root })));
    for (const r of results) expect(r).toEqual({ code: 0, err: "" });

    const { snapshots } = readJsonFile(historyFile(root));
    expect(snapshots).toHaveLength(60);
    expect(new Set(snapshots.map((s) => s.triggeredBy)).size).toBe(60);
    // each writer's own snapshots stay in the order it wrote them
    for (const id of workers) {
      expect(snapshots.filter((s) => s.triggeredBy.startsWith(`${id}-`)).map((s) => s.triggeredBy)).toEqual(
        Array.from({ length: 10 }, (_, i) => `${id}-${i}`),
      );
    }
    expect(fs.readdirSync(path.join(root, ".systemix"))).toEqual(["drift-history.json"]);
  }, 60000);

  test("8 parallel `drift scan` runs of the real bin leave 8 snapshots (7 before the lock)", async () => {
    const ids = Array.from({ length: 8 }, (_, i) => `p${i + 1}`);
    const results = await Promise.all(ids.map((id) => child([BIN, "drift", "scan", "src", "--triggered-by", id], { cwd: root })));
    for (const r of results) expect(r).toEqual({ code: 0, err: "" });

    const { snapshots } = readJsonFile(historyFile(root));
    expect(snapshots.map((s) => s.triggeredBy).sort()).toEqual([...ids].sort());
    expect(fs.readdirSync(path.join(root, ".systemix"))).toEqual(["drift-history.json"]);
  }, 60000);
});

describe("the lock file", () => {
  let root;
  const scan = () => capture(() => drift(["scan", "src"], { projectRoot: root, now: new Date("2026-07-11T10:00:00Z") }));
  beforeEach(() => {
    root = makeRepo({ "src/a.ts": 'export const a = "#ff0000";\n' });
    fs.mkdirSync(path.join(root, ".systemix"));
  });
  afterEach(() => removeRepo(root));

  test("is gone after a scan, and after a scan that failed", async () => {
    await scan();
    expect(fs.existsSync(lockFile(root))).toBe(false);

    fs.writeFileSync(historyFile(root), "<<<<<<< HEAD\n");
    const { exitCode } = await scan();
    expect(exitCode).toBe(1);
    expect(fs.existsSync(lockFile(root))).toBe(false);
    expect(fs.readFileSync(historyFile(root), "utf8")).toBe("<<<<<<< HEAD\n");
  });

  test("is gone after a write that failed", async () => {
    const spy = jest.spyOn(fs, "renameSync").mockImplementation(() => {
      throw Object.assign(new Error("EXDEV: cross-device link not permitted"), { code: "EXDEV" });
    });
    try {
      expect((await scan()).exitCode).toBe(1);
    } finally {
      spy.mockRestore();
    }
    expect(fs.readdirSync(path.join(root, ".systemix"))).toEqual([]);
  });

  test("a --dry-run never takes it", async () => {
    const spy = jest.spyOn(fs, "openSync");
    try {
      await capture(() => drift(["scan", "src", "--dry-run"], { projectRoot: root }));
      expect(spy.mock.calls.filter(([file]) => String(file).endsWith(".lock"))).toEqual([]);
    } finally {
      spy.mockRestore();
    }
  });

  test("one left by a process that died (older than 30 s) is taken over", async () => {
    fs.writeFileSync(lockFile(root), "99999");
    const old = new Date(Date.now() - 60000);
    fs.utimesSync(lockFile(root), old, old);

    const { exitCode } = await scan();
    expect(exitCode).toBeUndefined();
    expect(readJsonFile(historyFile(root)).snapshots).toHaveLength(1);
    expect(fs.existsSync(lockFile(root))).toBe(false);
  });

  test("one that stays held makes the scan fail with the file to remove, and is left alone", async () => {
    fs.writeFileSync(lockFile(root), "99999"); // fresh: a live holder, as far as anyone can tell
    fs.writeFileSync(historyFile(root), JSON.stringify({ snapshots: [] }));
    const before = fs.readFileSync(historyFile(root), "utf8");

    // jump the clock 11 s after the first reading: past the 10 s wait, inside the 30 s staleness
    const realNow = Date.now.bind(Date);
    let reads = 0;
    const spy = jest.spyOn(Date, "now").mockImplementation(() => realNow() + (reads++ === 0 ? 0 : 11000));
    let outcome;
    try {
      outcome = await scan();
    } finally {
      spy.mockRestore();
    }

    expect(outcome.exitCode).toBe(1);
    expect(outcome.err.join("\n")).toContain("drift-history.json is locked by another drift scan (drift-history.json.lock)");
    expect(outcome.err.join("\n")).toContain("remove that file if no scan is running");
    expect(fs.existsSync(lockFile(root))).toBe(true); // not ours: never removed by the scan that gave up
    expect(fs.readFileSync(historyFile(root), "utf8")).toBe(before);
  });

  test("a lock that is released while a scan waits lets it through, and the scan really waited", async () => {
    fs.writeFileSync(lockFile(root), "99999");
    const append = `require(${JSON.stringify(DRIFT)}).appendSnapshot(${JSON.stringify(root)}, { runAt: "t", triggeredBy: "late", score: 1, critical: 0, warnings: 0, componentsAudited: 1, topOffenders: [] })`;
    const t0 = Date.now();
    const release = setTimeout(() => fs.rmSync(lockFile(root), { force: true }), 400);
    let result;
    try {
      result = await child(["-e", append], { cwd: root });
    } finally {
      clearTimeout(release);
    }
    expect(result).toEqual({ code: 0, err: "" });
    // a scan that ignored the lock would be done in well under 400 ms
    expect(Date.now() - t0).toBeGreaterThanOrEqual(350);
    expect(readJsonFile(historyFile(root)).snapshots.map((s) => s.triggeredBy)).toEqual(["late"]);
    expect(fs.existsSync(lockFile(root))).toBe(false);
  });
});
