"use strict";

const fs = require("fs");
const path = require("path");
const { cli, tmpRepo } = require("./helpers/cli");
const { materialize } = require("./helpers/fixtures");

const GOLDEN = path.join(__dirname, "golden", "admin");
const LOG = "design/.studio/runs.jsonl";

/** Compare with a golden file; UPDATE_GOLDEN=1 rewrites it. */
function golden(name, actual) {
  const file = path.join(GOLDEN, name);
  if (process.env.UPDATE_GOLDEN === "1") {
    fs.mkdirSync(GOLDEN, { recursive: true });
    fs.writeFileSync(file, actual);
  }
  expect(actual).toBe(fs.readFileSync(file, "utf8"));
}

/** The digest without its signals: the counts, which depend on the run log alone. */
const counts = ({ signals, ...rest }) => rest;
const rawRows = (root) => fs.readFileSync(path.join(root, LOG), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));

const T1_RUNS = ["r-20260106-090500-53d7", "r-20260107-091000-b44c", "r-20260109-092000-fb85", "r-20260112-160000-c90d"];
const BRIEF_DOWN = ["r-20260105-110000-6d13", "r-20260107-112000-2dfd", "r-20260112-093000-e249"];
const ERROR_RUNS = ["r-20260106-130000-4739", "r-20260107-140000-215f"];
const ERROR = "rules eval failed: review-cases.json does not parse";

describe("admin digest on F6", () => {
  let root;
  let d;
  beforeAll(async () => {
    root = materialize("F6-runlog");
    const r = await cli(["admin", "digest", "--json"], { root });
    expect(r.code).toBe(0);
    d = r.json;
  });

  test("the counts match the golden", () => {
    golden("F6-digest-counts.json", JSON.stringify(counts(d), null, 2) + "\n");
  });

  test("the counts equal a scripted aggregation of the raw log", () => {
    const rows = rawRows(root);
    const runs = rows.filter((r) => r.kind === "run");
    const downs = new Set(rows.filter((r) => r.kind === "rating" && r.rating === "down").map((r) => r.ref));
    const byCommand = {};
    for (const r of runs) {
      const c = (byCommand[r.command] = byCommand[r.command] || { runs: 0, up: 0, down: 0 });
      c.runs++;
      if (downs.has(r.run)) c.down++;
    }
    expect(d.runs).toBe(runs.length);
    expect(d.runs).toBe(37);
    for (const [cmd, c] of Object.entries(byCommand)) expect(d.byCommand[cmd]).toEqual({ ...c, downShare: Math.round((c.down / c.runs) * 100) / 100 });
    const fps = runs.flatMap((r) => r.false_positives.map((f) => f.rule));
    expect(d.falsePositives).toEqual({ T1: fps.filter((x) => x === "T1").length });
    expect(d.falsePositives.T1).toBe(4);
    expect(d.byCommand.brief).toEqual({ runs: 6, up: 0, down: 3, downShare: 0.5 });
    expect(d.errors).toEqual({ [ERROR]: 2 });
    const checks = runs.filter((r) => r.command === "check");
    const sum = (s, k) => checks.filter((r) => r.surface === s).reduce((n, r) => n + r[k], 0);
    for (const s of ["product", "email", "marketing"]) expect(d.rulesCaught[s]).toEqual({ blocks: sum(s, "blocks"), flags: sum(s, "flags") });
    // src/features/pricing and src/features/share each fail then pass on the same args;
    // the --changed fail is followed by pass-with-fixes, which is not a pass or pass-with-flags
    expect(d.blocksFixed).toBe(2);
    expect(d.since).toBeNull();
    expect(d.proposalsCap).toBe(3);
  });

  test("the run-log signals, ranked by count, the top three marked", () => {
    const byKind = (k) => d.signals.find((s) => s.kind === k);
    expect(byKind("false-positive")).toEqual({ kind: "false-positive", subject: "T1", evidence: T1_RUNS, count: 4, threshold: 3, top: true });
    expect(byKind("down-share")).toEqual({ kind: "down-share", subject: "brief", evidence: BRIEF_DOWN, count: 3, threshold: 0.3, top: true });
    expect(byKind("error")).toEqual({ kind: "error", subject: ERROR, evidence: ERROR_RUNS, count: 2, threshold: 2, top: true });
    expect(byKind("trigger-miss")).toEqual({ kind: "trigger-miss", subject: "check", evidence: ["triggers:2026-01-14:1"], count: 1, threshold: 1, top: false });
    expect(d.signals.slice(0, 3).map((s) => s.kind)).toEqual(["false-positive", "down-share", "error"]);
    expect(d.signals.filter((s) => s.top)).toHaveLength(3);
    const c = d.signals.map((s) => s.count);
    expect(c).toEqual([...c].sort((a, b) => b - a));
  });

  test("with every command built, exactly those four signals (no failing eval check)", () => {
    expect(d.signals.map((s) => `${s.kind}:${s.subject}`)).toEqual(["false-positive:T1", "down-share:brief", `error:${ERROR}`, "trigger-miss:check"]);
  });

  test("the same log gives byte-identical output", async () => {
    const again = await cli(["admin", "digest", "--json"], { root });
    expect(again.stdout).toBe(JSON.stringify(d, null, 2));
  });

  test("--since narrows the window; the default starts after the last admin row", async () => {
    const since = (await cli(["admin", "digest", "--since", "2026-01-13", "--json"], { root })).json;
    expect(since.since).toBe("2026-01-13");
    expect(since.runs).toBe(rawRows(root).filter((r) => r.kind === "run" && r.at >= "2026-01-13").length);
    expect(since.signals.find((s) => s.kind === "false-positive")).toBeUndefined();
    expect((await cli(["admin", "digest", "--since", "last week"], { root })).code).toBe(2);

    const r2 = materialize("F6-runlog");
    const adminRow = { kind: "admin", command: "admin", args: "run", surface: null, depth: null, goal: null, result: "proposed", blocks: 0, flags: 0, false_positives: [], sources: [LOG], files_written: [], duration_s: null, rating: "none", note: "" };
    const logged = await cli(["runs", "log", "--json", "-"], { root: r2, stdin: JSON.stringify(adminRow), now: new Date("2026-01-14T15:00:00Z") });
    expect(logged.code).toBe(0);
    const after = (await cli(["admin", "digest", "--json"], { root: r2 })).json;
    expect(after.since).toBe("2026-01-14T15:00:00Z");
    expect(after.runs).toBe(0);
    expect(after.signals.map((s) => s.kind).filter((k) => k !== "eval-check")).toEqual(["trigger-miss"]);
  });
});

describe("admin digest on F6 clean", () => {
  test("12 normal rows: the counts match the golden and nothing crosses a threshold", async () => {
    const root = materialize("F6-runlog", { variant: "clean" });
    const d = (await cli(["admin", "digest", "--json"], { root })).json;
    golden("F6-clean-digest-counts.json", JSON.stringify(counts(d), null, 2) + "\n");
    expect(d.signals.filter((s) => s.kind !== "eval-check")).toEqual([]);
    expect(d.signals).toEqual([]);
  });
});

describe("admin eval", () => {
  test("F6: every check runs and passes, and the results file is read", async () => {
    const root = materialize("F6-runlog");
    const r = await cli(["admin", "eval", "--json"], { root });
    expect(r.json.checks.map((c) => c.name)).toEqual(["rules-lint", "rules-eval", "tokens-lint", "docs-check", "loops-check", "proposals-lint", "runlog-lint"]);
    expect(r.json.checks.find((c) => c.name === "runlog-lint")).toEqual({ name: "runlog-lint", ok: true, skipped: false, detail: "40 rows, all valid and privacy-clean" });
    expect(r.json.checks.find((c) => c.name === "docs-check").skipped).toBe(true);
    expect(r.json.checks.find((c) => c.name === "proposals-lint").skipped).toBe(true);
    expect(r.json.results).toMatchObject({ file: "evals/results/2026-01-14.json", triggers: { misses: 1, negativeFirings: 0 }, cases: { ok: 30, total: 30, failed: [] } });
    const failing = r.json.checks.filter((c) => !c.ok && !c.skipped);
    expect(failing).toEqual([]);
    expect(r.json.ok).toBe(true);
    expect(r.code).toBe(0);
  });

  test("F6 clean: no results file, every check passes", async () => {
    const root = materialize("F6-runlog", { variant: "clean" });
    const r = await cli(["admin", "eval", "--json"], { root });
    expect(r.json.results).toBeNull();
    expect(r.json.checks.filter((c) => !c.ok && !c.skipped)).toEqual([]);
    expect(r.code).toBe(0);
  });

  test("the checks owned here: a bad run-log row and a bad proposal fail their checks and become signals", async () => {
    const root = materialize("F6-runlog", { variant: "clean" });
    fs.appendFileSync(path.join(root, LOG), '{"run":"r-20260115-090000-abcd","note":"mail ada@example.com"}\n');
    fs.mkdirSync(path.join(root, "design/proposals"), { recursive: true });
    fs.writeFileSync(path.join(root, "design/proposals/P-001-broken.md"), "---\nid: P-001\n---\n## Problem\nx\n");
    const r = await cli(["admin", "eval", "--json"], { root });
    expect(r.code).toBe(1);
    const by = Object.fromEntries(r.json.checks.map((c) => [c.name, c]));
    expect(by["runlog-lint"].ok).toBe(false);
    expect(by["runlog-lint"].detail).toMatch(/^\d+ problems: line 13: /);
    expect(JSON.stringify(r.json)).not.toContain("ada@example.com");
    expect(by["proposals-lint"]).toMatchObject({ ok: false, skipped: false });
    const d = (await cli(["admin", "digest", "--json"], { root })).json;
    expect(d.signals.filter((s) => s.kind === "eval-check").map((s) => s.subject)).toEqual(expect.arrayContaining(["proposals-lint", "runlog-lint"]));
  });

  test("a repo with no rules: rules checks fail, the rest are skipped, the empty log passes", async () => {
    const r = await cli(["admin", "eval", "--json"], { root: tmpRepo() });
    expect(r.code).toBe(1);
    const by = Object.fromEntries(r.json.checks.map((c) => [c.name, c]));
    expect(by["rules-lint"]).toEqual({ name: "rules-lint", ok: false, skipped: false, detail: "no design/rules.md" });
    for (const n of ["tokens-lint", "docs-check", "loops-check", "proposals-lint"]) expect(by[n].skipped).toBe(true);
    expect(by["runlog-lint"]).toEqual({ name: "runlog-lint", ok: true, skipped: false, detail: "no design/.studio/runs.jsonl yet" });
    expect(r.json.results).toBeNull();
  });

  test("a command that is not built yet is a failing check that says so", async () => {
    let admin;
    jest.isolateModules(() => {
      jest.doMock("../src/lib/invoke", () => ({
        invoke: async (ctx, argv) => (argv[0] === "loops" ? { code: 1, json: null, stdout: "", stderr: "  ✗ loops is not built yet" } : jest.requireActual("../src/lib/invoke").invoke(ctx, argv)),
      }));
      admin = require("../src/commands/admin");
    });
    const { makeCtx } = require("../src/lib/ctx");
    const root = materialize("F6-runlog", { variant: "clean" });
    const ctx = makeCtx({ cwd: root, now: new Date("2026-01-15T10:00:00Z"), env: {}, stdin: "", out: () => {}, err: () => {} });
    const ev = await admin.evaluate(ctx);
    expect(ev.checks.find((c) => c.name === "loops-check")).toEqual({ name: "loops-check", ok: false, skipped: false, detail: "loops check: loops is not built yet" });
    expect(ev.ok).toBe(false);
    jest.dontMock("../src/lib/invoke");
  });

  test("a trigger miss and a negative firing in the newest results file are signals", async () => {
    const root = materialize("F6-runlog", { variant: "clean" });
    const dir = path.join(root, "evals/results");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "2026-01-01.json"), JSON.stringify({ triggers: { misses: [{ ask: "old", expected: "brief", got: null }] }, cases: [] }));
    fs.writeFileSync(path.join(dir, "2026-01-15.json"), JSON.stringify({ date: "2026-01-15", triggers: { misses: [{ ask: "write a blog post", expected: null, got: "brief" }, { ask: "check my design", expected: "check", got: null }] }, cases: [{ id: "a", ok: false }] }));
    const ev = (await cli(["admin", "eval", "--json"], { root })).json;
    expect(ev.results).toMatchObject({ file: "evals/results/2026-01-15.json", triggers: { misses: 1, negativeFirings: 1 }, cases: { ok: 0, total: 1, failed: ["a"] } });
    const d = (await cli(["admin", "digest", "--json"], { root })).json;
    const sig = d.signals.filter((s) => s.kind !== "eval-check").map((s) => [s.kind, s.subject, s.evidence]);
    expect(sig).toEqual([
      ["trigger-miss", "check", ["triggers:2026-01-15:2"]],
      ["negative-firing", "brief", ["triggers:2026-01-15:1"]],
    ]);
  });
});
