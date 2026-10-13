import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// drift-history.ts reads .systemix/drift-history.json relative to process.cwd() at import time,
// so each test points cwd at a temp project and imports a fresh copy.

const snap = (score: number, scoreFormula?: string) => ({
  runAt: `2026-07-${String(score % 28 + 1).padStart(2, "0")}T10:00:00.000Z`,
  triggeredBy: "test",
  score,
  critical: 0,
  warnings: 0,
  componentsAudited: 1,
  topOffenders: [],
  ...(scoreFormula ? { scoreFormula } : {}),
});

describe("drift-history comparability", () => {
  let dir: string;
  let cwd: string;
  beforeEach(() => {
    cwd = process.cwd();
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "sx-drift-history-"));
    fs.mkdirSync(path.join(dir, ".systemix"));
    process.chdir(dir);
    vi.resetModules();
  });
  afterEach(() => {
    process.chdir(cwd);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const write = (snapshots: unknown[]) =>
    fs.writeFileSync(path.join(dir, ".systemix", "drift-history.json"), JSON.stringify({ snapshots }));

  it("a snapshot without the tag is legacy", async () => {
    const { scoreFormulaOf } = await import("./drift-history");
    expect(scoreFormulaOf(snap(68))).toBe("legacy");
    expect(scoreFormulaOf(snap(83, "clean-files/1"))).toBe("clean-files/1");
  });

  it("the tracked history (0 x5 and 68, all untagged) followed by one new-formula scan is a run of one", async () => {
    const { comparableRun } = await import("./drift-history");
    const history = [snap(0), snap(0), snap(0), snap(0), snap(0), snap(68), snap(83, "clean-files/1")];
    // without this a "vs previous" arrow would read 83 - 68 = a +15 improvement that is only a new formula
    expect(comparableRun(history).map((s) => s.score)).toEqual([83]);
  });

  it("keeps the whole run once there are several new-formula scans", async () => {
    const { comparableRun } = await import("./drift-history");
    const history = [snap(68), snap(83, "clean-files/1"), snap(85, "clean-files/1"), snap(80, "clean-files/1")];
    expect(comparableRun(history).map((s) => s.score)).toEqual([83, 85, 80]);
  });

  it("an all-legacy history, a single snapshot and an empty one are returned as they are", async () => {
    const { comparableRun } = await import("./drift-history");
    expect(comparableRun([snap(0), snap(68)]).map((s) => s.score)).toEqual([0, 68]);
    expect(comparableRun([snap(5)]).map((s) => s.score)).toEqual([5]);
    expect(comparableRun([])).toEqual([]);
  });

  it("stops at the first change of formula, even when an older run shares the latest formula", async () => {
    const { comparableRun } = await import("./drift-history");
    const history = [snap(90, "clean-files/1"), snap(10), snap(70, "clean-files/1"), snap(75, "clean-files/1")];
    expect(comparableRun(history).map((s) => s.score)).toEqual([70, 75]);
  });

  it("getComparableTrend applies it to the last N snapshots; getTrend still returns them all", async () => {
    write([snap(0), snap(68), snap(83, "clean-files/1"), snap(85, "clean-files/1")]);
    const { getComparableTrend, getTrend } = await import("./drift-history");
    expect(getComparableTrend(30).map((s) => s.score)).toEqual([83, 85]);
    expect(getTrend(30).map((s) => s.score)).toEqual([0, 68, 83, 85]);
    // the window is taken first: with N = 1 there is nothing to compare, and nothing to mislead
    expect(getComparableTrend(1).map((s) => s.score)).toEqual([85]);
  });
});
