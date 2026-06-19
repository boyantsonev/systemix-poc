import { NextResponse } from "next/server";
import { loadInstanceConfig, signalStatus } from "@/lib/state/instance-config";
import { readQueueCards } from "@/lib/queue-store";
import { MATRIX_ROWS, tierLabel } from "@/lib/contract/write-policy";

export const dynamic = "force-dynamic";

// Live instance status for the contract Now strip. Real state only: autonomy
// and signals from systemix.config.yaml, queue depth from .systemix/queue.json,
// signal wiring from the environment. Degraded states are reported, not hidden.
export async function GET() {
  const cfg = loadInstanceConfig();
  const cards = readQueueCards();
  const pending = cards.filter((c) => c.status === "pending").length;
  const lastAction =
    cards
      .map((c) => c.resolvedAt ?? c.requestedAt ?? "")
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

  // Autonomy track record — the receipts behind the dial, from the queue
  // archive. Counts every decision a human has resolved, by outcome.
  const actionOf = (c: { resolution?: { action?: string }; status: string }) =>
    c.resolution?.action ?? c.status;
  const resolved = cards.filter((c) => c.status && c.status !== "pending");
  const trackRecord = {
    total: cards.length,
    pending,
    approved: resolved.filter((c) => actionOf(c) === "approved").length,
    rejected: resolved.filter((c) => actionOf(c) === "rejected").length,
    deferred: resolved.filter((c) => actionOf(c) === "deferred").length,
  };

  const signals = signalStatus(cfg);

  return NextResponse.json({
    // The level word is derived from the trust tier — one dial, one source.
    autonomy: tierLabel(cfg?.trust?.hermes_tier ?? 0),
    trust: cfg?.trust ?? null,
    currentTier: cfg?.trust?.hermes_tier ?? 0,
    matrix: MATRIX_ROWS,
    trackRecord,
    signals,
    pending,
    lastAction,
  });
}
