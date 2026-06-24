import fs from "node:fs";
import path from "node:path";

export type QueueCard = {
  id: string;
  type: string;
  status: string;
  project?: string;
  // contract scoping — new in the contract rework; older cards may lack both
  goal?: string;
  subject?: string;
  experimentId?: string;
  // payload fields by card type
  token?: string;
  component?: string;
  filePath?: string;
  proposed?: string;
  proposal?: string;
  context?: string;
  hypothesis?: string;
  metric?: string;
  baselineRate?: number;
  variantRate?: number;
  confidenceLevel?: number;
  confidence?: number;
  sessions?: number;
  requestedAt?: string;
  resolvedAt?: string;
  resolution?: { action?: string; note?: string | null; resolvedBy?: string };
  _posthogData?: { fetched_at?: string; source?: string };
};

// Real queue only — no demo fallback. Accountability surfaces (the decisions
// ledger, the Now strip) must never render seeded data
// (docs/feature/contract-rework/ia-and-migration.md, risk #4).
export function readQueueCards(): QueueCard[] {
  const file = path.join(process.cwd(), ".systemix", "queue.json");
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as { cards?: QueueCard[] };
    return raw.cards ?? [];
  } catch {
    return [];
  }
}
