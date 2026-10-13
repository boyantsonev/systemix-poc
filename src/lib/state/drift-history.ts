/**
 * drift-history.ts
 * Reader/writer utility for .systemix/drift-history.json.
 *
 * Intended for use in Next.js API routes or server components — not safe to
 * import directly in client bundles (uses Node `fs`).
 *
 * Reads and writes .systemix/drift-history.json relative to the project root
 * (process.cwd()). The file is maintained as a 90-snapshot rolling log.
 */

import fs from "fs";
import path from "path";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DriftSnapshot {
  runAt: string;           // ISO-8601 timestamp
  triggeredBy: string;     // e.g. "manual", "ci", "/drift-report"
  score: number;           // 0-100
  critical: number;
  warnings: number;
  componentsAudited: number;
  topOffenders: string[];  // file paths
  /**
   * Which formula produced `score`. Absent on snapshots written before the
   * clean-files score ("clean-files/1"); their scores are not comparable with it.
   */
  scoreFormula?: string;
}

export interface DriftHistory {
  snapshots: DriftSnapshot[];
}

// ── Internal helpers ──────────────────────────────────────────────────────────

const HISTORY_PATH = path.join(
  process.cwd(),
  ".systemix",
  "drift-history.json"
);

const MAX_SNAPSHOTS = 90;

function readFile(): DriftHistory {
  if (!fs.existsSync(HISTORY_PATH)) {
    return { snapshots: [] };
  }
  const raw = fs.readFileSync(HISTORY_PATH, "utf-8");
  return JSON.parse(raw) as DriftHistory;
}

function writeFile(history: DriftHistory): void {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), "utf-8");
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the full contents of .systemix/drift-history.json.
 * Throws if the file is missing or malformed.
 */
export function getDriftHistory(): DriftHistory {
  return readFile();
}

/**
 * Appends a new DriftSnapshot to the history file.
 * Enforces a rolling cap of 90 snapshots — oldest entries are dropped first.
 * Writes the updated history back to disk.
 */
export function appendDriftSnapshot(snapshot: DriftSnapshot): void {
  const history = readFile();
  history.snapshots.push(snapshot);

  if (history.snapshots.length > MAX_SNAPSHOTS) {
    history.snapshots = history.snapshots.slice(
      history.snapshots.length - MAX_SNAPSHOTS
    );
  }

  writeFile(history);
}

/**
 * Returns the most recent DriftSnapshot, or null if none exist.
 */
export function getLatestSnapshot(): DriftSnapshot | null {
  const { snapshots } = readFile();
  if (snapshots.length === 0) return null;
  return snapshots[snapshots.length - 1];
}

/**
 * Returns the last N snapshots in chronological order (oldest → newest).
 * Useful for rendering sparkline / trend charts.
 * If N exceeds the available count, returns all snapshots.
 */
export function getTrend(n: number): DriftSnapshot[] {
  const { snapshots } = readFile();
  return snapshots.slice(-n);
}

/**
 * The formula a snapshot's score was computed with. Snapshots without the tag
 * were written by the older per-hit CLI score or by scripts/drift-report.ts; they
 * are all "legacy" here, which is enough to know they cannot be compared with a
 * tagged one.
 */
export function scoreFormulaOf(s: Pick<DriftSnapshot, "scoreFormula">): string {
  return s.scoreFormula || "legacy";
}

/**
 * The newest run of snapshots whose scores can be compared with the latest one:
 * the same scoreFormula, contiguous up to the latest. Oldest → newest. A trend,
 * a delta or a sparkline over anything longer would draw a jump that is only a
 * change of formula.
 */
export function comparableRun<T extends Pick<DriftSnapshot, "scoreFormula">>(snapshots: T[]): T[] {
  if (snapshots.length === 0) return [];
  const formula = scoreFormulaOf(snapshots[snapshots.length - 1]);
  let start = snapshots.length - 1;
  while (start > 0 && scoreFormulaOf(snapshots[start - 1]) === formula) start--;
  return snapshots.slice(start);
}

/**
 * Like getTrend, but only the part that shares the latest snapshot's score
 * formula — what a score trend or "vs previous" arrow may honestly show.
 */
export function getComparableTrend(n: number): DriftSnapshot[] {
  return comparableRun(getTrend(n));
}
