import { NextResponse } from "next/server";
import { loadInstanceConfig } from "@/lib/state/instance-config";
import { readQueueCards } from "@/lib/queue-store";

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

  const signals = Object.entries(cfg?.signals ?? {}).map(([id, s]) => ({
    id,
    enabled: !!s?.enabled,
    // posthog is the only signal whose wiring is knowable from the app env;
    // null = wiring not verifiable from here.
    wired: id === "posthog" ? !!process.env.NEXT_PUBLIC_POSTHOG_KEY : null,
  }));

  return NextResponse.json({
    autonomy: cfg?.hermes?.autonomy ?? null,
    trust: cfg?.trust ?? null,
    signals,
    pending,
    lastAction,
  });
}
