"use client";

import { HitlQueue } from "@/components/systemix/HitlQueue";
import type { ActiveRun } from "@/lib/state/runtime-state";

// Format an ISO timestamp as "YYYY-MM-DD · HH:MM" with plain string ops — no
// Date()/locale, so server and client markup match (no hydration mismatch).
function fmt(ts: string | null): string {
  if (!ts) return "—";
  const m = ts.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return m ? `${m[1]} · ${m[2]}` : ts.slice(0, 16);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="truncate text-sm font-medium leading-none text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

// The operational panel content (runtime overview + active runs + Hermes HITL
// queue). Rendered as a docked rail (lg+) and inside a Sheet (below lg).
export function RuntimeContent({
  lastUpdated,
  activeRuns,
  autonomy,
  unwiredSignals = [],
}: {
  lastUpdated: string | null;
  activeRuns: ActiveRun[];
  autonomy: string;
  unwiredSignals?: string[];
}) {
  return (
    <div className="flex flex-col gap-6 p-4">
      {unwiredSignals.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-2.5">
          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-500" />
          <p className="text-xs text-muted-foreground">
            {unwiredSignals.join(", ")} not connected — run{" "}
            <code className=" text-foreground">/connect-signal</code> to gather live evidence.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Stat label="Last updated" value={fmt(lastUpdated)} />
        <Stat label="Active runs" value={String(activeRuns.length)} />
        <Stat label="Autonomy" value={autonomy} />
        <Stat label="Status" value={activeRuns.length ? "running" : "idle"} />
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Active runs</h3>
        {activeRuns.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            No active runs — the pipeline is idle. Skill and agent runs appear here while they execute.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {activeRuns.map((r, i) => (
              <div key={r.id ?? i} className="rounded-lg border p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-foreground">{r.skill ?? r.label ?? r.id ?? "run"}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{r.status ?? "running"}</span>
                </div>
                {r.startedAt && <span className="text-xs text-muted-foreground">{fmt(r.startedAt)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Decision queue</h3>
        <HitlQueue className="w-full" hideDemo />
      </div>
    </div>
  );
}
