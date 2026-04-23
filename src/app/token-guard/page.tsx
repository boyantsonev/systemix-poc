"use client";

import { AppShell } from "@/components/systemix/AppShell";
import { Badge } from "@/components/ui/badge";
import { mockRuns, mockStats, mockAlerts } from "@/lib/data/token-guard";
import type { AnchorItem } from "@/components/systemix/RightAnchorNav";

const anchorItems: AnchorItem[] = [
  { id: "stats",   label: "Stats"            },
  { id: "history", label: "Run History"      },
  { id: "alerts",  label: "Regression Alerts"},
  { id: "cache",   label: "Cache Efficiency" },
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TokenGuardPage() {
  return (
    <AppShell anchorItems={anchorItems}>

      {/* Hero */}
      <div>
        <h1 className="text-2xl font-black tracking-tight mb-1">Token Guard</h1>
        <p className="text-[13px] text-muted-foreground mb-6">
          Monitor token usage across workflow runs. Local-first — no telemetry.
        </p>
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 mb-6 flex items-center gap-3">
        <div className="size-1.5 rounded-full bg-[--color-stale] shrink-0" />
        <p className="text-[12px] text-muted-foreground">
          Token Guard is in development — the data below is illustrative. Available in a future release.
        </p>
      </div>

      {/* Stats Row */}
      <section id="stats">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border/60 bg-card px-4 py-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Total Runs</p>
            <p className="text-2xl font-black tabular-nums">{mockStats.totalRuns}</p>
          </div>

          <div className="rounded-lg border border-border/60 bg-card px-4 py-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Total Tokens Used</p>
            <p className="text-2xl font-black tabular-nums">{formatNumber(mockStats.totalTokens)}</p>
          </div>

          <div className="rounded-lg border border-border/60 bg-card px-4 py-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Avg Cache Hit Ratio</p>
            <p className="text-2xl font-black tabular-nums">{Math.round(mockStats.avgCacheHitRatio * 100)}%</p>
            <div className="mt-2 h-[3px] rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${mockStats.avgCacheHitRatio * 100}%`, background: "var(--agent-flux)" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Run History */}
      <section id="history">
        <h2 className="text-[13px] font-semibold text-foreground mb-3">Run History</h2>
        <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left pl-4 py-2 text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium">Run ID</th>
                <th className="text-left py-2 text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium">Date</th>
                <th className="text-left py-2 text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium">Skills</th>
                <th className="text-right py-2 text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium">Tokens</th>
                <th className="text-right py-2 text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium">Cache Hit</th>
                <th className="text-right pr-4 py-2 text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {mockRuns.map((run) => (
                <tr key={run.runId} className="border-b border-border/30 last:border-0">
                  <td className="pl-4 py-2">
                    <code className="text-[11px] font-mono text-muted-foreground">
                      {run.runId}
                    </code>
                  </td>
                  <td className="py-2">
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {formatDate(run.date)}
                    </span>
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {run.skills.map((s) => (
                        <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 text-right">
                    <span className="text-[11px] font-mono tabular-nums">{formatNumber(run.totalTokens)}</span>
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-12 h-[3px] rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${run.cacheHitRatio * 100}%`, background: "var(--agent-flux)" }}
                        />
                      </div>
                      <span className="text-[11px] font-mono tabular-nums w-7 text-right">
                        {Math.round(run.cacheHitRatio * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="pr-4 py-2 text-right">
                    <Badge
                      variant={run.status === 'completed' ? 'default' : 'destructive'}
                      className="text-[10px] px-1.5 py-0 font-mono"
                    >
                      {run.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Regression Alerts */}
      <section id="alerts">
        <h2 className="text-[13px] font-semibold text-foreground mb-3">Regression Alerts</h2>
        <div className="space-y-2">
          {mockAlerts.map((alert, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3"
            >
              <span className="mt-0.5 text-yellow-500 text-[11px]">⚠</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <code className="text-[11px] font-mono font-semibold text-foreground">
                    {alert.skill}
                  </code>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-500/40 text-yellow-600 dark:text-yellow-400">
                    {alert.severity}
                  </Badge>
                </div>
                <p className="text-[12px] text-muted-foreground">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cache Efficiency */}
      <section id="cache">
        <h2 className="text-[13px] font-semibold text-foreground mb-3">Cache Efficiency</h2>
        <div className="rounded-lg border border-border/60 bg-card px-4 py-4">
          <p className="text-[13px] font-semibold mb-1">
            Cache saved{" "}
            <span className="text-primary font-black tabular-nums">
              {formatNumber(mockStats.tokensSavedByCache)}
            </span>{" "}
            tokens this week
          </p>
          <p className="text-[12px] text-muted-foreground mb-4">
            Prompt caching reuses prior context across skill invocations — reducing
            cost and latency for repeated Figma reads and token syncs.
          </p>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-[3px] rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${mockStats.avgCacheHitRatio * 100}%`, background: "var(--agent-flux)" }}
              />
            </div>
            <span className="text-[11px] font-mono tabular-nums text-foreground">
              {Math.round(mockStats.avgCacheHitRatio * 100)}% avg hit rate
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Based on {mockStats.totalRuns} runs. Live data available at{" "}
            <code className="bg-muted rounded-md px-3 py-2 text-[11px] font-mono border border-border/60 inline-block mt-1">
              GET /api/token-guard/runs
            </code>
          </p>
        </div>
      </section>

    </AppShell>
  );
}
