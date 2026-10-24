/**
 * habit.test.js — acceptance tests for the `habit` counters (drift-tooling
 * habit). Ages are measured to the HEAD commit date, never to today; most tests
 * hand the module a context with a chosen commit date, two build a real git
 * commit to prove the end-to-end path. Expectations are hand-computed.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { makeRepo, removeRepo, run, get, val } = require("./helpers");
const { createContext } = require("../../../src/lib/counters/context");
const habit = require("../../../src/lib/counters/habit");
const { isoToMs } = require("../../../src/lib/counters/util");

const HEAD = "2026-10-11T12:00:00+00:00";
const history = (...snaps) => JSON.stringify({ snapshots: snaps }, null, 2);
const snap = (runAt, extra = {}) => ({ runAt, triggeredBy: "manual", score: 50, critical: 1, warnings: 2, componentsAudited: 10, ...extra });

describe("habit counters", () => {
  const roots = [];
  const repo = (files) => {
    const root = makeRepo(files);
    roots.push(root);
    return root;
  };
  afterEach(() => {
    jest.useRealTimers();
    roots.splice(0).forEach(removeRepo);
  });

  /** Counters by id, with a chosen HEAD commit date (null = no git). */
  const counters = (root, commitDate = HEAD, opts = {}) => {
    const ctx = createContext(root, opts);
    const list = habit.run({ ...ctx, git: { commit: commitDate ? "abc" : null, commitDate, dirty: false } });
    const byId = Object.fromEntries(list.map((c) => [c.id, c]));
    return { list, byId, v: (id) => byId[id].value };
  };

  describe("date arithmetic", () => {
    test("isoToMs reads ISO dates by hand: zones, UTC default, invalid input", () => {
      expect(isoToMs("2026-07-08T18:47:17.145Z")).toBe(Date.UTC(2026, 6, 8, 18, 47, 17, 145));
      expect(isoToMs("2026-07-08")).toBe(Date.UTC(2026, 6, 8));
      expect(isoToMs("2026-07-08T01:30:00")).toBe(Date.UTC(2026, 6, 8, 1, 30)); // no zone → UTC, not local
      expect(isoToMs("2026-07-08T01:30:00+03:00")).toBe(Date.UTC(2026, 6, 7, 22, 30));
      expect(isoToMs("2026-07-08T01:30:00-0530")).toBe(Date.UTC(2026, 6, 8, 7, 0));
      for (const bad of ["2026-02-30", "2026-13-01", "2026-07-08T25:00:00Z", "July 8 2026", "yesterday", "", null, undefined, 20260708, "1899-12-31"]) {
        expect(isoToMs(bad)).toBeNull();
      }
      expect(isoToMs("2028-02-29")).toBe(Date.UTC(2028, 1, 29)); // leap day
      expect(isoToMs("2027-02-29")).toBeNull();
    });
  });

  describe("timezone independence", () => {
    // Jest cannot change the timezone of its own process, so the counters run in a child node
    // process with TZ set. Each fixture is built so that parsing a zone-less timestamp as LOCAL
    // time would move it across a UTC date boundary in every zone below.
    const COUNTERS_DIR = path.join(__dirname, "../../../src/lib/counters");
    const CHILD = `
      const [dir, root, commitDate] = process.argv.slice(1);
      const { createContext } = require(dir + "/context");
      const habit = require(dir + "/habit");
      const ctx = createContext(root);
      const list = habit.run({ ...ctx, git: { commit: "abc", commitDate, dirty: false } });
      const out = { offset: new Date(2026, 6, 8).getTimezoneOffset() };
      for (const c of list) out[c.id] = c.value;
      process.stdout.write(JSON.stringify(out));
    `;
    const inZone = (tz, root, commitDate) =>
      JSON.parse(execFileSync(process.execPath, ["-e", CHILD, COUNTERS_DIR, root, commitDate], { env: { ...process.env, TZ: tz }, encoding: "utf8" }));

    test("zone-less and date-only timestamps are read as UTC whatever the machine timezone", () => {
      const root = repo({ ".systemix/drift-history.json": history(snap("2026-10-09"), snap("2026-10-11T00:30:00")) });
      for (const tz of ["UTC", "America/Los_Angeles", "Pacific/Auckland", "Asia/Kolkata"]) {
        const out = inZone(tz, root, "2026-10-11T23:30:00");
        // the zone really took effect (UTC is the control)
        if (tz === "UTC") expect(out.offset).toBe(0);
        else expect(out.offset).not.toBe(0);
        expect(out["habit.snapshots.first_run_at"]).toBe("2026-10-09T00:00:00.000Z");
        expect(out["habit.snapshots.last_run_at"]).toBe("2026-10-11T00:30:00.000Z");
        expect(out["habit.snapshots.distinct_days"]).toBe(2);
        // 00:30 and 23:30 on the same UTC date: 0 days, in every zone
        expect(out["habit.snapshots.last_age_days"]).toBe(0);
      }
    });

    test("an offset in the timestamp wins over the machine timezone", () => {
      const root = repo({ ".systemix/drift-history.json": history(snap("2026-10-10T23:30:00-05:00")) }); // 2026-10-11T04:30Z
      for (const tz of ["UTC", "Pacific/Auckland"]) {
        const out = inZone(tz, root, "2026-10-12T01:00:00+03:00"); // 2026-10-11T22:00Z
        expect(out["habit.snapshots.last_run_at"]).toBe("2026-10-11T04:30:00.000Z");
        expect(out["habit.snapshots.last_age_days"]).toBe(0);
      }
    });
  });

  describe("snapshots", () => {
    const histRepo = (...snaps) => repo({ ".systemix/drift-history.json": history(...snaps) });

    test("count, days, first/last, last-snapshot fields and age to HEAD", () => {
      const root = histRepo(
        snap("2026-07-08T18:47:17.145Z", { score: 10, critical: 5, warnings: 6, componentsAudited: 50 }),
        snap("2026-07-08T23:59:59Z", { triggeredBy: "ci", score: 68, critical: 7, warnings: 4, componentsAudited: 182, scoreFormula: "clean-files/1" }),
        snap("2026-07-09T00:00:01+00:00", { score: 70, critical: 8, warnings: 9, componentsAudited: 190 })
      );
      const { v, byId } = counters(root);
      expect(v("habit.snapshots.file_exists")).toBe(true);
      expect(v("habit.snapshots.count")).toBe(3);
      expect(byId["habit.snapshots.count"].detail).toMatchObject({ shape: "snapshots", undated: 0, malformed: 0, byTriggeredBy: { ci: 1, manual: 2 } });
      expect(v("habit.snapshots.distinct_days")).toBe(2);
      expect(v("habit.snapshots.first_run_at")).toBe("2026-07-08T18:47:17.145Z");
      expect(v("habit.snapshots.last_run_at")).toBe("2026-07-09T00:00:01.000Z");
      // 2026-07-09 → 2026-10-11: 22 days left in July + 31 + 30 + 11 = 94
      expect(v("habit.snapshots.last_age_days")).toBe(94);
      expect(v("habit.snapshots.last_score")).toBe(70);
      expect(v("habit.snapshots.last_critical")).toBe(8);
      expect(v("habit.snapshots.last_warnings")).toBe(9);
      expect(v("habit.snapshots.last_files_audited")).toBe(190);
      expect(v("habit.snapshots.last_triggered_by")).toBe("manual");
      expect(v("habit.snapshots.last_score_formula")).toBeNull();
      expect(byId["habit.snapshots.last_score_formula"].notes.join(" ")).toMatch(/before the clean-files formula/);
    });

    test("a bare array reads the same as the {snapshots} shape", () => {
      const a = [snap("2026-07-08T10:00:00Z"), snap("2026-07-09T10:00:00Z", { score: 99 })];
      const asArray = counters(repo({ ".systemix/drift-history.json": JSON.stringify(a) }));
      const asObject = counters(histRepo(...a));
      expect(asArray.v("habit.snapshots.count")).toBe(2);
      expect(asArray.byId["habit.snapshots.count"].detail.shape).toBe("array");
      for (const id of ["habit.snapshots.last_score", "habit.snapshots.last_age_days", "habit.snapshots.distinct_days", "habit.snapshots.last_run_at"]) {
        expect(asArray.v(id)).toBe(asObject.v(id));
      }
      expect(asArray.v("habit.snapshots.last_score")).toBe(99);
    });

    test("age counts calendar days between UTC dates, not elapsed 24-hour spans", () => {
      // two seconds apart but on different UTC dates → 1 day
      expect(counters(histRepo(snap("2026-10-10T23:59:59Z")), "2026-10-11T00:00:01Z").v("habit.snapshots.last_age_days")).toBe(1);
      // 23 hours apart on the same UTC date → 0 days
      expect(counters(histRepo(snap("2026-10-11T00:30:00Z")), "2026-10-11T23:30:00Z").v("habit.snapshots.last_age_days")).toBe(0);
      // HEAD at 01:00+03:00 is 22:00Z the day before → UTC date 10-10
      expect(counters(histRepo(snap("2026-10-10T23:00:00Z")), "2026-10-11T01:00:00+03:00").v("habit.snapshots.last_age_days")).toBe(0);
      // exactly 30 days
      expect(counters(histRepo(snap("2026-07-01T10:00:00Z")), "2026-07-31T09:00:00Z").v("habit.snapshots.last_age_days")).toBe(30);
    });

    test("a snapshot dated after HEAD gives a negative age and says why", () => {
      const { v, byId } = counters(histRepo(snap("2026-10-12T10:00:00Z")));
      expect(v("habit.snapshots.last_age_days")).toBe(-1);
      expect(byId["habit.snapshots.last_age_days"].notes.join(" ")).toMatch(/after the HEAD commit/);
    });

    test("no git history: the age is null with a note, never measured to today", () => {
      const { v, byId } = counters(histRepo(snap("2026-07-08T10:00:00Z")), null);
      expect(v("habit.snapshots.count")).toBe(1);
      expect(v("habit.snapshots.last_run_at")).toBe("2026-07-08T10:00:00.000Z");
      expect(v("habit.snapshots.last_age_days")).toBeNull();
      expect(byId["habit.snapshots.last_age_days"].notes.join(" ")).toMatch(/no git history/);
    });

    test("the result does not depend on the clock", () => {
      const root = histRepo(snap("2026-07-08T10:00:00Z"));
      jest.useFakeTimers({ now: new Date("2031-05-05T00:00:00Z") });
      const later = counters(root).v("habit.snapshots.last_age_days");
      jest.setSystemTime(new Date("2020-01-01T00:00:00Z"));
      const earlier = counters(root).v("habit.snapshots.last_age_days");
      expect(later).toBe(95); // 07-08 → 10-11
      expect(earlier).toBe(95);
    });

    test("a missing history file: zeros and nulls with a note", () => {
      const { v, byId } = counters(repo({ "README.md": "x" }));
      expect(v("habit.snapshots.file_exists")).toBe(false);
      expect(v("habit.snapshots.count")).toBe(0);
      expect(v("habit.snapshots.distinct_days")).toBe(0);
      for (const id of ["first_run_at", "last_run_at", "last_age_days", "last_score", "last_critical", "last_warnings", "last_files_audited", "last_triggered_by", "last_score_formula"]) {
        expect(v(`habit.snapshots.${id}`)).toBeNull();
      }
      expect(byId["habit.snapshots.count"].notes.join(" ")).toMatch(/not found/);
    });

    test("invalid JSON, an unrecognised shape, bad entries and undated entries are tolerated", () => {
      const invalid = counters(repo({ ".systemix/drift-history.json": "{not json" }));
      expect(invalid.v("habit.snapshots.file_exists")).toBe(true);
      expect(invalid.v("habit.snapshots.count")).toBe(0);
      expect(invalid.byId["habit.snapshots.count"].notes.join(" ")).toMatch(/not valid JSON/);

      const odd = counters(repo({ ".systemix/drift-history.json": JSON.stringify({ foo: [1, 2] }) }));
      expect(odd.v("habit.snapshots.count")).toBe(0);
      expect(odd.byId["habit.snapshots.count"].notes.join(" ")).toMatch(/unrecognised shape/);

      const mixed = counters(repo({
        ".systemix/drift-history.json": JSON.stringify([
          "garbage",
          null,
          { runAt: "July 8 2026", score: 1 }, // not ISO → undated
          { score: 2 }, // no runAt
          snap("2026-07-08T10:00:00Z", { score: 3 }),
        ]),
      }));
      expect(mixed.v("habit.snapshots.count")).toBe(3); // the three objects
      expect(mixed.byId["habit.snapshots.count"].detail).toMatchObject({ undated: 2, malformed: 2 });
      expect(mixed.v("habit.snapshots.last_score")).toBe(3); // undated entries are never "last"
      expect(mixed.v("habit.snapshots.distinct_days")).toBe(1);

      const none = counters(repo({ ".systemix/drift-history.json": JSON.stringify([{ score: 1 }]) }));
      expect(none.v("habit.snapshots.count")).toBe(1);
      expect(none.v("habit.snapshots.last_run_at")).toBeNull();
      expect(none.v("habit.snapshots.last_score")).toBeNull();
      expect(none.byId["habit.snapshots.last_age_days"].notes.join(" ")).toMatch(/no snapshot has a parseable ISO runAt/);
    });

    test("the newest snapshot is the greatest runAt, not the last entry; a tie goes to the later entry", () => {
      const reordered = counters(histRepo(
        snap("2026-07-09T10:00:00Z", { score: 90 }),
        snap("2026-07-08T10:00:00Z", { score: 10 })
      ));
      expect(reordered.v("habit.snapshots.last_score")).toBe(90);
      expect(reordered.v("habit.snapshots.first_run_at")).toBe("2026-07-08T10:00:00.000Z");

      const tied = counters(histRepo(
        snap("2026-07-08T10:00:00Z", { score: 1 }),
        snap("2026-07-08T10:00:00Z", { score: 2 })
      ));
      expect(tied.v("habit.snapshots.last_score")).toBe(2);
    });

    test("a snapshot with a non-numeric score reports null for it, not 0", () => {
      const { v, byId } = counters(histRepo(snap("2026-07-08T10:00:00Z", { score: "high", critical: null })));
      expect(v("habit.snapshots.last_score")).toBeNull();
      expect(v("habit.snapshots.last_critical")).toBeNull();
      expect(v("habit.snapshots.last_warnings")).toBe(2);
      expect(byId["habit.snapshots.last_score"].notes.join(" ")).toMatch(/no numeric score/);
    });

    test("end to end with a real commit: the age is to the HEAD commit date (UTC dates)", () => {
      const root = histRepo(snap("2026-07-01T10:00:00Z"));
      commitAll(root, "2026-07-31T01:30:00+03:00"); // 2026-07-30T22:30Z → UTC date 07-30
      const r = run(root, { groups: ["habit"] });
      expect(r.repo.commitDate).toBe("2026-07-31T01:30:00+03:00");
      expect(val(r, "habit.snapshots.last_age_days")).toBe(29);
      expect(get(r, "habit.snapshots.last_age_days").detail).toEqual({ lastRunDay: "2026-07-01", headCommitDay: "2026-07-30" });
    });
  });

  describe("workflows", () => {
    test("only direct yml/yaml files; drift mentions are case-insensitive; comment-only mentions are split out", () => {
      const root = repo({
        ".github/workflows/ci.yml": "name: ci\njobs:\n  drift:\n    steps:\n      - run: npx systemix drift scan\n",
        ".github/workflows/b.yaml": "# Drift check disabled for now\nname: nightly\n",
        ".github/workflows/c.yml": "env:\n  DRIFT_TRIGGER: ci  # drifted?\n",
        ".github/workflows/nested/d.yml": "run: drift\n",
        ".github/workflows/README.md": "drift drift drift\n",
      });
      const { v, byId } = counters(root);
      expect(v("habit.workflows.files")).toBe(3);
      expect(byId["habit.workflows.files"].detail.names).toEqual(["b.yaml", "c.yml", "ci.yml"]);
      // ci.yml: "drift:" + "drift scan" = 2 · b.yaml: "Drift" = 1 · c.yml: "DRIFT_TRIGGER" + "drifted" = 2
      expect(v("habit.workflows.drift_mentions")).toBe(5);
      expect(byId["habit.workflows.drift_mentions"].perFile).toEqual([
        { file: ".github/workflows/c.yml", count: 2 },
        { file: ".github/workflows/ci.yml", count: 2 },
        { file: ".github/workflows/b.yaml", count: 1 },
      ]);
      expect(v("habit.workflows.files_mentioning_drift")).toBe(3);
      // whole-line # comments excluded: ci.yml 2 lines, b.yaml 0, c.yml 1 (a trailing comment still counts)
      expect(v("habit.workflows.drift_noncomment_lines")).toBe(3);
    });

    test("no workflows directory → zeros and a note", () => {
      const { v, byId } = counters(repo({ "README.md": "x" }));
      expect(v("habit.workflows.files")).toBe(0);
      expect(v("habit.workflows.drift_mentions")).toBe(0);
      expect(byId["habit.workflows.files"].notes.join(" ")).toMatch(/no workflow files/);
    });

    test("CRLF workflow files count the same", () => {
      const root = repo({ ".github/workflows/ci.yml": "name: ci\r\n# drift\r\nrun: drift\r\n" });
      const { v } = counters(root);
      expect(v("habit.workflows.drift_mentions")).toBe(2);
      expect(v("habit.workflows.drift_noncomment_lines")).toBe(1);
    });
  });

  describe("npm scripts and scripts/*drift*", () => {
    test("a root script mentions drift by name or by command", () => {
      const root = repo({
        "package.json": JSON.stringify({ scripts: { drift: "tsx scripts/drift-report.ts", lint: "eslint", check: "npm run Drift:scan", test: "jest" } }),
        "packages/cli/package.json": JSON.stringify({ scripts: { drift: "x" } }), // workspace packages are not read
      });
      const { v, byId } = counters(root);
      expect(v("habit.npm_scripts.drift")).toBe(2);
      expect(byId["habit.npm_scripts.drift"].detail).toEqual({ names: ["check", "drift"], scriptsTotal: 4 });
    });

    test("no scripts, no package.json, invalid package.json", () => {
      expect(counters(repo({ "package.json": "{}" })).v("habit.npm_scripts.drift")).toBe(0);
      const none = counters(repo({ "README.md": "x" }));
      expect(none.v("habit.npm_scripts.drift")).toBe(0);
      expect(none.byId["habit.npm_scripts.drift"].notes.join(" ")).toMatch(/no package.json/);
      const bad = counters(repo({ "package.json": "{oops" }));
      expect(bad.v("habit.npm_scripts.drift")).toBe(0);
      expect(bad.byId["habit.npm_scripts.drift"].notes.join(" ")).toMatch(/not valid JSON/);
    });

    test("scripts/*drift* matches one level, any extension, case-insensitively", () => {
      const root = repo({
        "scripts/drift-report.ts": "x",
        "scripts/run-Drift.sh": "x",
        "scripts/drift.png": "x",
        "scripts/other.ts": "x",
        "scripts/sub/drift.ts": "x", // nested: not scripts/*drift*
        "scripts/drift/inner.ts": "x", // a directory named drift is not a file
      });
      const { v, byId } = counters(root);
      expect(v("habit.scripts.drift_files")).toBe(3);
      expect(byId["habit.scripts.drift_files"].detail.names).toEqual(["scripts/drift-report.ts", "scripts/drift.png", "scripts/run-Drift.sh"]);
    });
  });

  describe("the drift script's exit behaviour", () => {
    test("a script that states exit 0 and never exits non-zero", () => {
      const root = repo({
        "scripts/drift-report.ts": "// Exit code 0 always: drift is a report, not a gate\nmain();\nprocess.exit(0);\nprocess.exit( 0 );\nprocess.exitCode = 0;\nprocess.exit();\n",
      });
      const { v } = counters(root);
      expect(v("habit.drift_script.nonzero_exit_statements")).toBe(0);
      expect(v("habit.drift_script.exits_nonzero")).toBe(false);
      expect(v("habit.drift_script.exit_zero_claims")).toBe(1); // one line holds both "Exit code 0" and "not a gate"
    });

    test("non-zero exits in JS, shell and python are found; literal 0 and bare exit() are not", () => {
      const root = repo({
        "scripts/drift-report.ts": "process.exit(1);\nprocess.exitCode = 2;\nfunction f(code) { process.exit(code); }\nprocess.exit(0);\nprocess.exit();\nprocess.exitCode = 0;\n",
        "scripts/run-Drift.sh": "#!/bin/sh\nnpx systemix drift scan || exit 2\nexit 0\n",
        "scripts/drift-check.py": "import sys\nsys.exit(3)\nsys.exit(0)\n",
        "scripts/drift.png": "process.exit(1)", // not a script extension: never searched
      });
      const { v, byId } = counters(root);
      expect(v("habit.scripts.drift_files")).toBe(4);
      // drift-report.ts: exit(1), exitCode = 2, exit(code) = 3 · run-Drift.sh: "|| exit 2" = 1 · .py: sys.exit(3) = 1
      expect(v("habit.drift_script.nonzero_exit_statements")).toBe(5);
      expect(byId["habit.drift_script.nonzero_exit_statements"].perFile).toEqual([
        { file: "scripts/drift-report.ts", count: 3 },
        { file: "scripts/drift-check.py", count: 1 },
        { file: "scripts/run-Drift.sh", count: 1 },
      ]);
      expect(v("habit.drift_script.exits_nonzero")).toBe(true);
      expect(byId["habit.drift_script.exits_nonzero"].detail.scriptsSearched).toBe(3);
      expect(v("habit.drift_script.exit_zero_claims")).toBe(1); // only the shell "exit 0" line
    });

    // one single-line script per row, in a repo of its own: [source, extension, expected nonzero-exit statements]
    const oneLine = (ext, body) => counters(repo({ [`scripts/drift-check.${ext}`]: body + "\n" })).v("habit.drift_script.nonzero_exit_statements");

    test.each([
      ["if [ -n \"$X\" ]; then exit 1; fi", "sh", 1],
      ["if a; then b; else exit 3; fi", "sh", 1],
      ["( exit 5 )", "sh", 1],
      ["(exit 5)", "sh", 1],
      ["{ exit 4; }", "sh", 1],
      ["while x; do exit 2; done", "sh", 1],
      ["case $1 in bad) exit 2 ;; esac", "sh", 1],
      ["foo && exit 2", "sh", 1],
      ["foo || { echo no; exit 4; }", "sh", 1],
      ["foo | exit 6", "sh", 1],
      ["exit 1", "sh", 1],
      ["\texit 7", "sh", 1],
      ["exit 01", "sh", 1],
      ["exit $rc", "sh", 1],
      ["exit \"$?\"", "sh", 1],
      ["exit '$code'", "sh", 1],
      ["exit ${rc}", "sh", 1],
      ["exit $((n + 1))", "sh", 1],
      ["a && exit 1 || exit 2", "sh", 2],
      ["exit(1)", "py", 1],
      ["quit(2)", "py", 1],
      ["raise SystemExit(1)", "py", 1],
      ["raise SystemExit('bad')", "py", 1],
      ["sys.exit('bad')", "py", 1],
      ["os._exit(3)", "py", 1],
      ["process.exit(1)", "js", 1],
      ["Deno.exit(2)", "ts", 1],
    ])("detected: %s", (body, ext, expected) => {
      expect(oneLine(ext, body)).toBe(expected);
    });

    test.each([
      ["exit 0", "sh"],
      ["exit  0", "sh"],
      ["if a; then exit 0; fi", "sh"],
      ["exit", "sh"],
      ["exit # nothing", "sh"],
      ["exits 1", "sh"],
      ["exit1", "sh"],
      ["doexit 1", "sh"],
      ["myexit 1", "sh"],
      ["echo exit 1", "sh"],
      ["set -e", "sh"],
      ["exit()", "py"],
      ["exit(0)", "py"],
      ["quit()", "py"],
      ["raise SystemExit", "py"],
      ["raise SystemExit(0)", "py"],
      ["sys.exit(0)", "py"],
      ["sys.exit()", "py"],
      ["os._exit(0)", "py"],
      ["app.quit(1)", "js"],
      ["this.exit(1)", "js"],
      ["myexit(1)", "js"],
      ["process.exit(0)", "js"],
      ["process.exit()", "js"],
      ["throw new Error('x')", "js"],
    ])("not detected (zero, bare or another mechanism): %s", (body, ext) => {
      expect(oneLine(ext, body)).toBe(0);
    });

    test("the exit-zero claim rule: each of its three alternatives counts a line on its own, case-insensitively", () => {
      const root = repo({
        "scripts/drift-report.ts": [
          "// drift is not a gate", // 1: only "not a gate"
          "// Exit Code 0 always", // 2: only "exit code 0"
          "console.info('done'); // EXITS 0 on success", // 3: only "exits 0"
          "// drift is a gate", // none: "a gate" alone is not the claim
          "// exit 10 means drift", // none: exit 10 is not exit 0
          "",
        ].join("\n"),
      });
      expect(counters(root).v("habit.drift_script.exit_zero_claims")).toBe(3);
    });

    test("no drift script: false/0 with a note, not a crash", () => {
      const { v, byId } = counters(repo({ "README.md": "x" }));
      expect(v("habit.drift_script.exits_nonzero")).toBe(false);
      expect(v("habit.drift_script.nonzero_exit_statements")).toBe(0);
      expect(v("habit.drift_script.exit_zero_claims")).toBe(0);
      expect(v("habit.drift_script.exclude_patterns")).toBe(0);
      expect(byId["habit.drift_script.exits_nonzero"].notes.join(" ")).toMatch(/no scripts\/\*drift\* file/);
    });
  });

  describe("the drift script's exclusions", () => {
    const SCRIPT = [
      "const EXCLUDE = [",
      "  /src[\\/\\\\]app[\\/\\\\]globals\\.css$/,",
      "  /DeepDiveMockups\\.tsx$/,",
      "  /brand-nodes\\.tsx$/,          // brand mark",
      "  /\\.test\\.(ts|tsx)$/,",
      "  /\\.d\\.ts$/,",
      "  /[^/]+\\.stories\\.tsx$/,",
      "  \"lib/data/brands.ts\",",
      "  /* a block comment, with a / and [ in it */",
      "];",
      "const OTHER = [/ignored\\.ts$/, 1];",
      "",
    ].join("\n");
    const GUARDRAILS = "Exceptions: the token source (`globals.css`) and product mockups (`DeepDiveMockups.tsx`).\n";

    test("counts the entries of an EXCLUDE array and the ones the guardrails never name", () => {
      const root = repo({ "scripts/drift-report.ts": SCRIPT, "design/guardrails.mdx": GUARDRAILS });
      const { v, byId } = counters(root);
      expect(v("habit.drift_script.exclude_patterns")).toBe(7);
      expect(byId["habit.drift_script.exclude_patterns"].detail.patterns.map((p) => p.tail)).toEqual([
        "globals.css", "DeepDiveMockups.tsx", "brand-nodes.tsx", ".test.", ".d.ts", ".stories.tsx", "brands.ts",
      ]);
      // globals.css and DeepDiveMockups.tsx are named; the other five are tooling-only
      expect(v("habit.drift_script.exclusions_not_named_in_guardrails")).toBe(5);
      expect(byId["habit.drift_script.exclusions_not_named_in_guardrails"].detail.unnamed.map((p) => p.tail))
        .toEqual(["brand-nodes.tsx", ".test.", ".d.ts", ".stories.tsx", "brands.ts"]);
    });

    test("without a guardrails file the comparison is null, not a made-up number", () => {
      const root = repo({ "scripts/drift-report.ts": SCRIPT });
      const { v, byId } = counters(root);
      expect(v("habit.drift_script.exclude_patterns")).toBe(7);
      expect(v("habit.drift_script.exclusions_not_named_in_guardrails")).toBeNull();
      expect(byId["habit.drift_script.exclusions_not_named_in_guardrails"].notes.join(" ")).toMatch(/not found/);
    });

    test("nested arrays, calls and arrow functions inside the array do not derail the scan", () => {
      const root = repo({
        "scripts/drift-report.ts": "export const EXCLUDE: RegExp[] = [ /a\\.ts$/, (f) => f.includes('x'), [1, 2, /nested\\.ts$/], /b\\.ts$/ ];\nconst after = [/c\\.ts$/];\n",
      });
      const { v } = counters(root);
      expect(v("habit.drift_script.exclude_patterns")).toBe(2); // a.ts and b.ts; nested and arrow items are not counted
    });

    test("a hostile pattern is only read as text and an unterminated array cannot hang the scan", () => {
      const root = repo({
        "scripts/drift-report.ts": `const EXCLUDE = [ /(a+)+$/, /(x*)*y$/, ${"/a/, ".repeat(10)}\n` + "// never closed\n" + "z".repeat(200000),
      });
      const t0 = Date.now();
      const { v } = counters(root);
      expect(Date.now() - t0).toBeLessThan(2000);
      expect(v("habit.drift_script.exclude_patterns")).toBe(12);
    });

    test("what counts as named: case-sensitive, and a tail under 3 characters is never named", () => {
      const root = repo({
        "scripts/drift-report.ts": "const EXCLUDE = [/ab$/, /abc$/, /globals\\.css$/, /Foo\\.tsx$/, /^$/];\n",
        "design/guardrails.mdx": "Exceptions: abcd about ab. GLOBALS.CSS and Foo.tsx.\n",
      });
      const { v, byId } = counters(root);
      expect(byId["habit.drift_script.exclude_patterns"].detail.patterns.map((p) => p.tail)).toEqual(["ab", "abc", "globals.css", "Foo.tsx", ""]);
      expect(v("habit.drift_script.exclude_patterns")).toBe(5);
      // "ab" is 2 chars (never named); "abc" is in "abcd"; "globals.css" differs in case from "GLOBALS.CSS"; "Foo.tsx" is named; "" is never named
      expect(v("habit.drift_script.exclusions_not_named_in_guardrails")).toBe(3);
      expect(byId["habit.drift_script.exclusions_not_named_in_guardrails"].detail.unnamed.map((p) => p.tail)).toEqual(["ab", "globals.css", ""]);
    });

    test("an array longer than any scan cap is counted in full (no silent lower bound), and so is the array after it", () => {
      const big = "const EXCLUDE = [\n" + "/abcd\\.ts$/,\n".repeat(5000) + "];\n"; // ~70 KB
      const root = repo({ "scripts/drift-report.ts": big + "const EXCLUDE_MORE = [/z\\.ts$/, 'q.ts'];\n" });
      const { v, byId } = counters(root);
      expect(v("habit.drift_script.exclude_patterns")).toBe(5002);
      expect(byId["habit.drift_script.exclude_patterns"].detail.patterns).toHaveLength(50); // the detail is capped, the count is not
      expect(byId["habit.drift_script.exclude_patterns"].detail.unclosedArrays).toEqual([]);
      expect(byId["habit.drift_script.exclude_patterns"].notes.join(" ")).not.toMatch(/never close/);
    });

    test("an array that never closes is counted to the end of the file and says so; a declaration after it is part of it", () => {
      const root = repo({ "scripts/drift-report.ts": "const EXCLUDE = [ /a\\.ts$/, /b\\.ts$/,\nconst EXCLUDE_B = [/c\\.ts$/];\n" });
      const { v, byId } = counters(root);
      expect(v("habit.drift_script.exclude_patterns")).toBe(2);
      expect(byId["habit.drift_script.exclude_patterns"].detail.unclosedArrays).toEqual([{ file: "scripts/drift-report.ts", variable: "EXCLUDE" }]);
      expect(byId["habit.drift_script.exclude_patterns"].notes.join(" ")).toMatch(/1 EXCLUDE array\(s\) never close.*lower bound/);
    });

    test("repeated unclosed declarations cost one pass: 50000 of them finish at once, whatever their number", () => {
      const root = repo({ "scripts/drift-report.ts": "const EXCLUDE=[".repeat(50000) });
      const t0 = Date.now();
      const { v, byId } = counters(root);
      expect(Date.now() - t0).toBeLessThan(2000); // quadratic rescanning took ~8 s here
      expect(v("habit.drift_script.exclude_patterns")).toBe(0);
      expect(byId["habit.drift_script.exclude_patterns"].detail.unclosedArrays).toHaveLength(1); // the first declaration swallows the rest
    });

    test("many closed declarations are each read", () => {
      const root = repo({ "scripts/drift-report.ts": "const EXCLUDE=[/a/];\n".repeat(20000) });
      const t0 = Date.now();
      expect(counters(root).v("habit.drift_script.exclude_patterns")).toBe(20000);
      expect(Date.now() - t0).toBeLessThan(2000);
    });

    test("a class that never closes, repeated at every item, costs a fixed amount per item (one line or many)", () => {
      // each `,/[\\]` starts a regex literal whose class never closes; reading each to the end of the
      // line made the scan quadratic (320 KB took 33 s)
      const item = ",/[\\\\]";
      for (const [label, body] of [["one line", item.repeat(50000)], ["many lines", (item + "\n").repeat(50000)]]) {
        const root = repo({ "scripts/drift-report.ts": "const EXCLUDE=[" + body + "];" });
        const t0 = Date.now();
        const { byId } = counters(root);
        expect([label, Date.now() - t0 < 2000]).toEqual([label, true]);
        expect(byId["habit.drift_script.exclude_patterns"].detail.unclosedArrays).toEqual([]); // the array does close
      }
    });

    test("a regex literal longer than the read cap is 'other', one just under it is read", () => {
      const under = "a".repeat(400);
      const over = "a".repeat(600);
      const root = repo({ "scripts/drift-report.ts": `const EXCLUDE = [/${under}$/, /${over}$/, /z\\.ts$/];\n` });
      const { v, byId } = counters(root);
      expect(v("habit.drift_script.exclude_patterns")).toBe(2); // the 600-character literal is not read as a pattern
      expect(byId["habit.drift_script.exclude_patterns"].detail.patterns.map((p) => p.source.length)).toEqual([401, 6]);
    });

    test("no EXCLUDE array → 0", () => {
      const root = repo({ "scripts/drift-report.ts": "const files = [/a\\.ts$/];\n", "design/guardrails.mdx": GUARDRAILS });
      const { v } = counters(root);
      expect(v("habit.drift_script.exclude_patterns")).toBe(0);
      expect(v("habit.drift_script.exclusions_not_named_in_guardrails")).toBe(0);
    });
  });

  describe("symlinks that leave the repo", () => {
    const outside = (files) => repo(files);
    const link = (target, at) => {
      fs.mkdirSync(path.dirname(at), { recursive: true });
      fs.symlinkSync(target, at);
    };
    const warned = (root, group = "habit") => run(root, { groups: [group] }).warnings;

    test("a symlinked .github/workflows, scripts/ or .github is not read: zeros, a note and a warning", () => {
      const out = outside({
        "wf/ci.yml": "run: drift\n# drift\n",
        "scripts/drift-check.sh": "exit 1\nnot a gate\n",
        "gh/workflows/ci.yml": "run: drift\n",
      });
      const viaWorkflows = repo({ "README.md": "x" });
      link(path.join(out, "wf"), path.join(viaWorkflows, ".github/workflows"));
      const w = counters(viaWorkflows);
      expect(w.v("habit.workflows.files")).toBe(0);
      expect(w.v("habit.workflows.drift_mentions")).toBe(0);
      expect(w.byId["habit.workflows.files"].notes).toEqual([".github/workflows is a symlink that resolves outside the repo and was ignored"]);
      expect(warned(viaWorkflows)).toContain("symlink resolves outside the repo: .github/workflows");

      const viaParent = repo({ "README.md": "x" }); // the link is higher up the path
      link(path.join(out, "gh"), path.join(viaParent, ".github"));
      expect(counters(viaParent).v("habit.workflows.files")).toBe(0);

      const viaScripts = repo({ "README.md": "x" });
      link(path.join(out, "scripts"), path.join(viaScripts, "scripts"));
      const s = counters(viaScripts);
      expect(s.v("habit.scripts.drift_files")).toBe(0);
      expect(s.v("habit.drift_script.exits_nonzero")).toBe(false);
      expect(s.v("habit.drift_script.exit_zero_claims")).toBe(0);
      expect(s.byId["habit.scripts.drift_files"].notes).toEqual(["scripts is a symlink that resolves outside the repo and was ignored"]);
      expect(s.byId["habit.drift_script.nonzero_exit_statements"].notes.join(" ")).toMatch(/scripts is a symlink that resolves outside/);
    });

    test("a symlinked drift history, package.json, guardrails and config read as absent", () => {
      const out = outside({
        "history.json": history(snap("2026-07-08T10:00:00Z")),
        "package.json": JSON.stringify({ scripts: { drift: "x" } }),
        "guardrails.mdx": "globals.css\n",
        "config.yaml": "design:\n  source: src/theme.css\n",
      });
      const root = repo({ "scripts/drift-report.ts": "const EXCLUDE = [/globals\\.css$/];\n" });
      link(path.join(out, "history.json"), path.join(root, ".systemix/drift-history.json"));
      link(path.join(out, "package.json"), path.join(root, "package.json"));
      link(path.join(out, "guardrails.mdx"), path.join(root, "design/guardrails.mdx"));
      link(path.join(out, "config.yaml"), path.join(root, "systemix.config.yaml"));
      const { v, byId } = counters(root);
      expect(v("habit.snapshots.file_exists")).toBe(false);
      expect(v("habit.snapshots.count")).toBe(0);
      expect(byId["habit.snapshots.count"].notes).toEqual([".systemix/drift-history.json is a symlink that resolves outside the repo and was ignored"]);
      expect(v("habit.npm_scripts.drift")).toBe(0);
      expect(byId["habit.npm_scripts.drift"].notes).toEqual(["package.json is a symlink that resolves outside the repo and was ignored"]);
      expect(v("habit.drift_script.exclude_patterns")).toBe(1);
      expect(v("habit.drift_script.exclusions_not_named_in_guardrails")).toBeNull(); // the guardrails it would be compared with are outside
      expect(byId["habit.drift_script.exclusions_not_named_in_guardrails"].notes.join(" ")).toMatch(/design\/guardrails.mdx is a symlink that resolves outside the repo/);
      expect(v("habit.config.design_source")).toBeNull();
      expect(byId["habit.config.design_keys"].notes).toEqual(["systemix.config.yaml is a symlink that resolves outside the repo and was ignored"]);
      expect(warned(root)).toEqual(expect.arrayContaining([
        "symlink resolves outside the repo: .systemix/drift-history.json",
        "symlink resolves outside the repo: package.json",
      ]));
    });

    test("a symlink that stays inside the repo is read; a dangling or self-looping one is just missing", () => {
      const root = repo({
        "tools/scripts/drift-check.sh": "exit 3\n",
        "tools/history.json": history(snap("2026-07-08T10:00:00Z")),
      });
      link(path.join(root, "tools/scripts"), path.join(root, "scripts")); // a symlinked directory, inside
      link("../tools/history.json", path.join(root, ".systemix/drift-history.json")); // a symlinked file, inside
      const inside = counters(root);
      expect(inside.v("habit.scripts.drift_files")).toBe(1);
      expect(inside.v("habit.drift_script.exits_nonzero")).toBe(true);
      expect(inside.v("habit.snapshots.count")).toBe(1);
      expect(inside.byId["habit.snapshots.count"].notes).toBeUndefined();

      const broken = repo({ "README.md": "x" });
      link("nowhere.json", path.join(broken, ".systemix/drift-history.json"));
      link("loop", path.join(broken, "scripts"));
      const b = counters(broken);
      expect(b.v("habit.snapshots.file_exists")).toBe(false);
      expect(b.v("habit.scripts.drift_files")).toBe(0);
      expect(warned(broken).filter((w) => /symlink/.test(w))).toEqual([]); // nothing left the repo, so there is nothing to warn about
    });

    test("nothing is written to the repo or to the place the symlink points at", () => {
      const out = outside({ "wf/ci.yml": "run: drift\n" });
      const root = repo({ "README.md": "x" });
      link(path.join(out, "wf"), path.join(root, ".github/workflows"));
      const tree = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? tree(path.join(dir, e.name)).map((f) => `${e.name}/${f}`) : [e.name])).sort();
      const before = { out: tree(out), root: tree(root) };
      run(root, { groups: ["habit"] });
      expect({ out: tree(out), root: tree(root) }).toEqual(before);
      expect(fs.readFileSync(path.join(out, "wf/ci.yml"), "utf8")).toBe("run: drift\n");
    });
  });

  describe("design.* in the config", () => {
    test("leaf keys under design: and design.source", () => {
      const root = repo({
        "systemix.config.yaml": "version: 1\ndesign:\n  source: src/theme.css\n  mode: scaffold\n  drift:\n    schedule: weekly\nsurfaces:\n  - a\n",
        "src/theme.css": ":root {\n  --a: 1;\n  --b: 2;\n  --c: 3;\n  --d: 4;\n  --e: 5;\n}\n",
      });
      const { v, byId } = counters(root);
      expect(v("habit.config.design_keys")).toBe(3);
      expect(byId["habit.config.design_keys"].detail.keys).toEqual(["design.drift.schedule", "design.mode", "design.source"]);
      expect(v("habit.config.design_source")).toBe("src/theme.css");
    });

    test("a scalar design:, an empty design: and no config at all", () => {
      const scalar = counters(repo({ "systemix.config.yaml": "version: 1\ndesign: existing\n" }));
      expect(scalar.v("habit.config.design_keys")).toBe(1);
      expect(scalar.byId["habit.config.design_keys"].detail.keys).toEqual(["design"]);
      expect(scalar.v("habit.config.design_source")).toBeNull();

      const empty = counters(repo({ "systemix.config.yaml": "version: 1\ndesign:\nsurfaces:\n  - a\n" }));
      expect(empty.v("habit.config.design_keys")).toBe(0);

      const none = counters(repo({ "README.md": "x" }));
      expect(none.v("habit.config.design_keys")).toBe(0);
      expect(none.v("habit.config.design_source")).toBeNull();
      expect(none.byId["habit.config.design_keys"].notes).toContain("no systemix.config.yaml");
    });
  });

  describe("robustness", () => {
    test("same tree, same bytes; ids start with the group and are unique; the report validates", () => {
      const root = repo({
        ".systemix/drift-history.json": history(snap("2026-07-08T10:00:00Z")),
        ".github/workflows/ci.yml": "run: drift\n",
        "scripts/drift-report.ts": "process.exit(1)\n",
        "package.json": JSON.stringify({ scripts: { drift: "x" } }),
      });
      const a = run(root, { groups: ["habit"] }); // runCounters validates the report and throws on a bad counter
      const b = run(root, { groups: ["habit"] });
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      expect(a.counters.every((c) => c.id.startsWith("habit."))).toBe(true);
      expect(new Set(a.counters.map((c) => c.id)).size).toBe(a.counters.length);
      expect(a.counters.map((c) => c.id)).toEqual([
        "habit.config.design_keys",
        "habit.config.design_source",
        "habit.drift_script.exclude_patterns",
        "habit.drift_script.exclusions_not_named_in_guardrails",
        "habit.drift_script.exit_zero_claims",
        "habit.drift_script.exits_nonzero",
        "habit.drift_script.nonzero_exit_statements",
        "habit.npm_scripts.drift",
        "habit.scripts.drift_files",
        "habit.snapshots.count",
        "habit.snapshots.distinct_days",
        "habit.snapshots.file_exists",
        "habit.snapshots.first_run_at",
        "habit.snapshots.last_age_days",
        "habit.snapshots.last_critical",
        "habit.snapshots.last_files_audited",
        "habit.snapshots.last_run_at",
        "habit.snapshots.last_score",
        "habit.snapshots.last_score_formula",
        "habit.snapshots.last_triggered_by",
        "habit.snapshots.last_warnings",
        "habit.workflows.drift_mentions",
        "habit.workflows.drift_noncomment_lines",
        "habit.workflows.files",
        "habit.workflows.files_mentioning_drift",
      ]); // ids are API: this list only grows on purpose
    });

    test("an empty repo and non-UTF-8 bytes do not crash", () => {
      const empty = run(repo({}), { groups: ["habit"] });
      expect(val(empty, "habit.snapshots.count")).toBe(0);
      const odd = run(repo({
        "scripts/drift-report.ts": Buffer.from([0xff, 0xfe, 0x70, 0x72, 0x6f, 0x63, 0x65, 0x73, 0x73, 0x2e, 0x65, 0x78, 0x69, 0x74, 0x28, 0x31, 0x29]),
        ".systemix/drift-history.json": Buffer.from([0xef, 0xbb, 0xbf, ...Buffer.from(history(snap("2026-07-08T10:00:00Z")))]), // BOM
      }), { groups: ["habit"] });
      expect(val(odd, "habit.drift_script.nonzero_exit_statements")).toBe(1); // "process.exit(1)" after two junk bytes
      expect(val(odd, "habit.snapshots.count")).toBe(1);
    });

    test("a drift script over 5 MB is skipped with a warning, not parsed", () => {
      const root = repo({ "scripts/drift-report.ts": "process.exit(1);\n".repeat(400000) });
      const r = run(root, { groups: ["habit"] });
      expect(val(r, "habit.scripts.drift_files")).toBe(1);
      expect(val(r, "habit.drift_script.nonzero_exit_statements")).toBe(0);
      expect(r.warnings.join(" ")).toMatch(/skipped \(over 5 MB\)/);
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
