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
      <span className="text-[12px] font-mono text-foreground/85 leading-none truncate">{value}</span>
      <span className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-wide">{label}</span>
    </div>
  );
}

export function RuntimePanel({
  lastUpdated,
  activeRuns,
  autonomy,
  onCollapse,
}: {
  lastUpdated: string | null;
  activeRuns: ActiveRun[];
  autonomy: string;
  onCollapse: () => void;
}) {
  return (
    <aside className="w-80 shrink-0 border-l border-border/30 overflow-y-auto bg-background">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/40">Runtime</span>
          <button
            onClick={onCollapse}
            className="text-[11px] font-mono text-muted-foreground/40 hover:text-foreground transition-colors leading-none p-1 -m-1"
            aria-label="Collapse runtime panel"
          >
            →
          </button>
        </div>

        {/* Overview */}
        <div className="grid grid-cols-2 gap-3 mb-5 pb-4 border-b border-border/30">
          <Stat label="last updated" value={fmt(lastUpdated)} />
          <Stat label="active runs" value={String(activeRuns.length)} />
          <Stat label="autonomy" value={autonomy} />
          <Stat label="status" value={activeRuns.length ? "running" : "idle"} />
        </div>

        {/* Active runs feed */}
        <div className="mb-5">
          <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-2">
            Active runs
          </div>
          {activeRuns.length === 0 ? (
            <p className="text-[11px] font-mono text-muted-foreground/40 leading-relaxed">
              No active runs — the pipeline is idle. Skill and agent runs appear here while they execute.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {activeRuns.map((r, i) => (
                <div key={r.id ?? i} className="p-2 rounded-lg border border-border/40">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-foreground/80 truncate">
                      {r.skill ?? r.label ?? r.id ?? "run"}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0">
                      {r.status ?? "running"}
                    </span>
                  </div>
                  {r.startedAt && (
                    <span className="text-[9px] font-mono text-muted-foreground/40">{fmt(r.startedAt)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* HITL decision queue (reuses the shared component + /api/queue) */}
        <div>
          <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-2">
            Decision queue
          </div>
          <HitlQueue className="w-full" hideDemo />
        </div>
      </div>
    </aside>
  );
}
