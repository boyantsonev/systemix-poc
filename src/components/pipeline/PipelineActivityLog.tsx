"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ── API run shape (as returned by /api/runs) ─────────────────────────────────

type ApiRun = {
  runId: string;
  skill: string;
  status: "running" | "success" | "error";
  startedAt: string;
  completedAt?: string;
  exitCode?: number;
  summary?: string;
};

type ApiRunsResponse = {
  runs: ApiRun[];
  total: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function durationLabel(start: string, end?: string) {
  if (!end) return "";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

const statusDot: Record<ApiRun["status"], string> = {
  success: "bg-emerald-500",
  error: "bg-red-500",
  running: "bg-amber-400 animate-pulse",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function PipelineActivityLog() {
  const { data, error, isLoading } = useSWR<ApiRunsResponse>(
    "/api/runs",
    fetcher,
    {
      refreshInterval: (data) =>
        data?.runs?.some((r) => r.status === "running") ? 3000 : 0,
    }
  );

  const runs = data?.runs ?? [];
  const hasLive = runs.some((r) => r.status === "running");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">Run History</CardTitle>
          {hasLive && (
            <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Live
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <p className="text-xs text-muted-foreground">Loading runs…</p>
        )}

        {error && (
          <p className="text-xs text-red-500">Failed to load run history.</p>
        )}

        {!isLoading && !error && runs.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No runs yet. Trigger a workflow from the Figma plugin.
          </p>
        )}

        {!isLoading && !error && runs.length > 0 && (
          <div className="space-y-1.5">
            {runs.map((run) => (
              <div
                key={run.runId}
                className="flex items-start gap-3 p-2.5 rounded-md hover:bg-muted transition-colors"
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${statusDot[run.status]}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      {run.skill}
                    </Badge>
                    <span className="ml-auto text-muted-foreground text-xs">
                      {formatDate(run.startedAt)}
                    </span>
                    {run.completedAt && (
                      <span className="text-muted-foreground text-xs">
                        {durationLabel(run.startedAt, run.completedAt)}
                      </span>
                    )}
                  </div>
                  {run.summary && (
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {run.summary}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
