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
