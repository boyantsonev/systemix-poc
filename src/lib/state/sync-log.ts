// Server-side only — do NOT import in client bundles.
// Reads and writes .systemix/sync-log.json for skill run history.

import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export interface SyncEntry {
  id: string;
  skill: string;
  triggeredAt: string;
  direction: "figma-to-code" | "code-to-figma" | "bidirectional";
  changes: Array<{ token: string; from: string; to: string; collection: string }>;
  approvedBy?: "human" | "auto";
  approvedAt?: string;
}

export interface SyncLog {
  entries: SyncEntry[];
}

const SYNC_LOG_PATH = path.join(process.cwd(), ".systemix", "sync-log.json");
const MAX_ENTRIES = 500;

/** Read .systemix/sync-log.json and return a parsed SyncLog. */
export async function getSyncLog(): Promise<SyncLog> {
  if (!existsSync(SYNC_LOG_PATH)) {
    return { entries: [] };
  }
  const raw = await fs.readFile(SYNC_LOG_PATH, "utf-8");
  return JSON.parse(raw) as SyncLog;
}

/**
 * Append a new SyncEntry to the log.
 * Enforces a rolling cap of 500 entries (oldest dropped first) and writes back.
 */
export async function appendSyncEntry(entry: SyncEntry): Promise<void> {
  const log = await getSyncLog();
  log.entries.push(entry);
  if (log.entries.length > MAX_ENTRIES) {
    log.entries = log.entries.slice(log.entries.length - MAX_ENTRIES);
  }
  await fs.writeFile(SYNC_LOG_PATH, JSON.stringify(log, null, 2), "utf-8");
}

/**
 * Return the last N entries, newest-first.
 * @param n Number of entries to return.
 */
export async function getRecentEntries(n: number): Promise<SyncEntry[]> {
  const log = await getSyncLog();
  return log.entries.slice(-n).reverse();
}
