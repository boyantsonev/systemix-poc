import fs from "fs";
import path from "path";

/**
 * Reads the runtime slice of .systemix/systemix.json — what the orchestrator is
 * doing right now. Server-only (uses fs). The HITL queue is read separately via
 * /api/queue (see HitlQueue); this covers the activity feed + freshness.
 */

export interface ActiveRun {
  id?: string;
  skill?: string;
  status?: string;
  startedAt?: string;
  label?: string;
}

export interface RuntimeState {
  lastUpdated: string | null;
  activeRuns: ActiveRun[];
}

export function loadRuntimeState(projectRoot?: string): RuntimeState {
  const p = path.join(projectRoot || process.cwd(), ".systemix", "systemix.json");
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, unknown>;
    return {
      lastUpdated: typeof raw.lastUpdated === "string" ? raw.lastUpdated : null,
      activeRuns: Array.isArray(raw.activeRuns) ? (raw.activeRuns as ActiveRun[]) : [],
    };
  } catch {
    return { lastUpdated: null, activeRuns: [] };
  }
}
