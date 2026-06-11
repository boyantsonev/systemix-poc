"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Instance = {
  autonomy: string | null;
  trust: { orchestrator_tier?: number; hermes_tier?: number } | null;
  signals: { id: string; enabled: boolean; wired: boolean | null }[];
  pending: number;
  lastAction: string | null;
};

// Live status strip at the top of the root contract — the engine caught
// mid-stride. Renders only real instance state from /api/instance; nothing on
// this strip is hand-written (contract-rework delta #2: status is content).
export function NowStrip() {
  const [d, setD] = useState<Instance | null>(null);

  useEffect(() => {
    fetch("/api/instance")
      .then((r) => r.json())
      .then(setD)
      .catch(() => {});
  }, []);

  if (!d) return null;

  return (
    <div className="not-prose flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border bg-muted/10 px-4 py-3 text-[12px] font-mono">
      <span className="flex items-center gap-1.5">
        <span className="text-muted-foreground/50 uppercase tracking-wide text-[10px]">autonomy</span>
        <span className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-foreground">
          {d.autonomy ?? "—"}
        </span>
        {d.trust ? (
          <span className="text-muted-foreground/50">trust {d.trust.hermes_tier ?? 0}</span>
        ) : null}
      </span>

      <span className="flex items-center gap-2.5">
        <span className="text-muted-foreground/50 uppercase tracking-wide text-[10px]">signals</span>
        {d.signals.map((s) => (
          <span key={s.id} className="flex items-center gap-1 text-muted-foreground">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                !s.enabled
                  ? "bg-muted-foreground/30"
                  : s.wired === false
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              }`}
            />
            {s.id}
            {s.enabled && s.wired === false ? (
              <span className="text-amber-500/80">(no key)</span>
            ) : null}
          </span>
        ))}
      </span>

      <Link href="/config" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
        <span className="text-muted-foreground/50 uppercase tracking-wide text-[10px]">queue</span>
        {d.pending > 0 ? (
          <span className="text-amber-500">{d.pending} pending</span>
        ) : (
          <span>clear</span>
        )}
      </Link>

      <span className="flex items-center gap-1.5 text-muted-foreground/60">
        <span className="text-muted-foreground/50 uppercase tracking-wide text-[10px]">last action</span>
        {d.lastAction ? d.lastAction.slice(0, 16).replace("T", " · ") : "none recorded yet"}
      </span>
    </div>
  );
}
