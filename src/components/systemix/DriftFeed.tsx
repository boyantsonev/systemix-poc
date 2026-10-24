"use client";

import { cn } from "@/lib/utils";
import type { DriftSnapshot } from "@/lib/state/drift-history";

// The drift feed — Home's window into .systemix/drift-history.json. Renders
// whatever the snapshots say: score trend sparkline, the latest audit's
// numbers, and the top offending files. Honest empty state until the first
// Drift Report run.

function fmt(ts: string): string {
  const m = ts.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return m ? `${m[1]} · ${m[2]}` : ts.slice(0, 16);
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const w = 120;
  const h = 28;
  const max = 100;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - (p / max) * h).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="shrink-0">
      <path d={d} fill="none" stroke="var(--highlight)" strokeWidth="1.5" />
    </svg>
  );
}

export function DriftFeed({ trend, className }: { trend: DriftSnapshot[]; className?: string }) {
  const latest = trend.length > 0 ? trend[trend.length - 1] : null;
  const scoreTone =
    latest == null
      ? "text-muted-foreground"
      : latest.score >= 80
        ? "text-success"
        : latest.score >= 50
          ? "text-warning"
          : "text-destructive";

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-[var(--radius-screen)] border bg-card shadow-[var(--shadow-panel)]",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b px-5 py-3">
        <span className="tva-label text-[10px] text-muted-foreground">Drift feed</span>
        {latest && (
          <span className="font-mono text-[11px] text-muted-foreground">{fmt(latest.runAt)}</span>
        )}
      </div>

      {latest ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className={cn("text-3xl font-bold leading-none", scoreTone)}>
                {latest.score}
                <span className="ml-1 text-sm font-normal text-muted-foreground">/100</span>
              </p>
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                {latest.critical} critical · {latest.warnings} warnings ·{" "}
                {latest.componentsAudited} files
              </p>
            </div>
            <Sparkline points={trend.map((s) => s.score)} />
          </div>

          {latest.topOffenders.length > 0 && (
            <div>
              <p className="tva-label mb-2 text-[9px] text-muted-foreground">Top offenders</p>
              <ul className="flex flex-col gap-1.5">
                {latest.topOffenders.map((f) => (
                  <li
                    key={f}
                    className="truncate border-l-2 border-warning/60 pl-2.5 font-mono text-[11px] text-foreground"
                    title={f}
                  >
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-auto font-mono text-[11px] text-muted-foreground">
            {trend.length} comparable audit{trend.length === 1 ? "" : "s"} · triggered by{" "}
            {latest.triggeredBy}
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-5 text-center">
          <p className="text-sm font-medium text-foreground">No drift audits yet</p>
          <p className="max-w-[26ch] text-[12px] leading-relaxed text-muted-foreground">
            Play the <span className="font-mono">Drift Report</span> skill — the first snapshot
            lands here.
          </p>
        </div>
      )}
    </div>
  );
}
