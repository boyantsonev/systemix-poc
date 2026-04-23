"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/systemix/AppShell";
import { DiffViewer } from "@/components/pipeline/DiffViewer";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, AlertTriangle, CheckCheck, Info,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type AgentId = "token-sync" | "figma-to-code" | "drift-detector" | "doc-sync";
type RunStatus = "hitl" | "done" | "failed";

type HitlItem =
  | {
      type: "token-diff";
      added: { key: string; value: string }[];
      changed: { key: string; from: string; to: string }[];
      removed: { key: string; lastValue: string }[];
      affectedFiles: string[];
      affectedComponents: string[];
    }
  | {
      type: "drift-report";
      scope: string;
      componentsAudited: number;
      componentsDrifted: number;
      autoFixable: number;
      critical: { file: string; line: number; value: string; token: string }[];
    };

type QueueRun = {
  id: string;
  agent: AgentId;
  skill: string;
  status: RunStatus;
  startedAt: number;
  log: string;
  hitl?: HitlItem;
};

// ── Data ──────────────────────────────────────────────────────────────────────

const EXAMPLE_RUNS: QueueRun[] = [
  {
    id: "run-drift-01",
    agent: "drift-detector",
    skill: "/drift-report",
    status: "hitl",
    startedAt: Date.now() - 47_000,
    log: "Audited 24 components across 6 files. Found 3 drifted components with 7 critical hardcoded values.",
    hitl: {
      type: "drift-report",
      scope: "src/components/**",
      componentsAudited: 24,
      componentsDrifted: 3,
      autoFixable: 5,
      critical: [
        { file: "components/ui/button.tsx",  line: 18, value: "#3b82f6",    token: "--color-primary"        },
        { file: "components/ui/badge.tsx",   line: 9,  value: "font-bold",  token: "--font-weight-semibold" },
        { file: "components/cards/Hero.tsx", line: 34, value: "#f8fafc",    token: "--color-surface"        },
      ],
    },
  },
  {
    id: "run-token-01",
    agent: "token-sync",
    skill: "/tokens",
    status: "done",
    startedAt: Date.now() - 3_600_000,
    log: "Synced 174 tokens from Figma. 4 new tokens added, 1 value updated. globals.css written.",
  },
  {
    id: "run-ftc-01",
    agent: "figma-to-code",
    skill: "/figma",
    status: "done",
    startedAt: Date.now() - 7_200_000,
    log: "Generated Badge.tsx from Figma node 22:104. 47 lines, 6 tokens mapped. Drift score: 0.",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function elapsed(startedAt: number): string {
  const s = Math.floor((Date.now() - startedAt) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

// ── Components ────────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: RunStatus }) {
  if (status === "hitl")   return <AlertTriangle size={13} className="text-amber-600 dark:text-amber-400" />;
  if (status === "done")   return <CheckCheck size={13} className="text-muted-foreground" />;
  if (status === "failed") return <XCircle size={13} className="text-muted-foreground" />;
  return null;
}

function DriftReportHitl({
  payload,
  onDecision,
}: {
  payload: Extract<HitlItem, { type: "drift-report" }>;
  onDecision: (d: "approve" | "reject") => void;
}) {
  return (
    <div className="mt-3 rounded-lg border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted border-b border-border">
        <AlertTriangle size={11} className="text-amber-600 dark:text-amber-400" />
        <span className="text-xs font-semibold text-foreground">Drift Report — awaiting review</span>
      </div>
      <div className="px-3 py-2.5 space-y-2 bg-background">
        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
          <span className="text-[10px] text-muted-foreground">Scope: <span className="text-foreground/80 font-mono">{payload.scope}</span></span>
          <span className="text-[10px] text-muted-foreground">Audited: <span className="text-foreground/80">{payload.componentsAudited}</span></span>
          <span className="text-[10px] text-muted-foreground">Drifted: <span className="text-foreground/80 font-medium">{payload.componentsDrifted}</span></span>
          <span className="text-[10px] text-muted-foreground">Auto-fixable: <span className="text-foreground/80 font-medium">{payload.autoFixable}</span></span>
        </div>
        <div className="space-y-1">
          {payload.critical.map((item, i) => (
            <div key={i} className="flex items-baseline gap-2 bg-muted rounded px-2 py-1">
              <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">{item.file}:{item.line}</span>
              <span className="text-[10px] text-foreground/70 flex-shrink-0">{item.value}</span>
              <span className="text-[10px] text-muted-foreground">→</span>
              <span className="text-[10px] font-mono text-foreground min-w-0 truncate">{item.token}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2 px-3 pb-3 pt-2 bg-background">
        <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => onDecision("approve")}>
          <CheckCircle2 size={12} className="mr-1" /> Apply fixes
        </Button>
        <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => onDecision("reject")}>
          <XCircle size={12} className="mr-1" /> Reject
        </Button>
      </div>
    </div>
  );
}

function QueueCard({
  run,
  onDecision,
}: {
  run: QueueRun;
  onDecision: (id: string, d: "approve" | "reject") => void;
}) {
  const [expanded, setExpanded] = useState(run.status === "hitl");
  const isHitl = run.status === "hitl";
  const isDone = run.status === "done";

  return (
    <div className={`rounded-xl border overflow-hidden ${
      isHitl ? "border-amber-400/60 dark:border-amber-500/30" : "border-border opacity-75"
    }`}>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none bg-card"
        onClick={() => setExpanded(v => !v)}
      >
        <StatusIcon status={run.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground font-mono">{run.skill}</span>
            <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5 font-mono">{run.agent}</span>
            {isHitl && (
              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 border border-amber-400/60 dark:border-amber-500/30 px-1.5 py-0.5 rounded">
                Awaiting review
              </span>
            )}
            {isDone && (
              <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded">
                Complete
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
            <Clock size={10} /> {elapsed(run.startedAt)}
          </span>
          {expanded
            ? <ChevronUp size={14} className="text-muted-foreground" />
            : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border bg-card">
          <p className="text-[11px] text-muted-foreground font-mono mt-3 leading-relaxed">
            {run.log}
          </p>
          {isHitl && run.hitl?.type === "drift-report" && (
            <DriftReportHitl payload={run.hitl} onDecision={d => onDecision(run.id, d)} />
          )}
          {isHitl && run.hitl?.type === "token-diff" && (
            <div className="mt-3 rounded-lg border border-border overflow-hidden">
              <div className="px-3 py-2.5 bg-background">
                <DiffViewer
                  added={run.hitl.added}
                  changed={run.hitl.changed}
                  removed={run.hitl.removed}
                  affectedFiles={run.hitl.affectedFiles}
                  affectedComponents={run.hitl.affectedComponents}
                />
              </div>
              <div className="flex gap-2 px-3 py-2 border-t border-border bg-background">
                <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => onDecision(run.id, "approve")}>
                  <CheckCircle2 size={12} className="mr-1" /> Apply changes
                </Button>
                <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => onDecision(run.id, "reject")}>
                  <XCircle size={12} className="mr-1" /> Reject
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function QueuePage() {
  const [runs, setRuns] = useState<QueueRun[]>(EXAMPLE_RUNS);

  useEffect(() => {
    fetch("/api/hitl")
      .then(res => res.json())
      .then((data: { tasks?: QueueRun[] } | QueueRun[]) => {
        const tasks = Array.isArray(data) ? data : (data.tasks ?? []);
        if (tasks.length > 0) setRuns(tasks);
      })
      .catch(() => {/* keep example runs on error */});
  }, []);

  async function handleDecision(id: string, decision: "approve" | "reject") {
    // Optimistic update
    setRuns(prev =>
      prev.map(r =>
        r.id !== id ? r : {
          ...r,
          status: decision === "approve" ? "done" : "failed",
          hitl: undefined,
          log: decision === "approve"
            ? r.log + " Changes approved and applied."
            : r.log + " Rejected by reviewer.",
        }
      )
    );

    try {
      const res = await fetch("/api/hitl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: id, action: decision }),
      });
      if (!res.ok) throw new Error("POST failed");
    } catch {
      // Revert on error
      setRuns(prev =>
        prev.map(r =>
          r.id !== id ? r : { ...r, status: "hitl" as const }
        )
      );
    }
  }

  const hitlCount = runs.filter(r => r.status === "hitl").length;

  return (
    <AppShell>
      <h1 className="text-2xl font-black text-foreground mb-1">Run Queue</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-prose">
        When a skill needs sign-off before writing to your codebase, the pending review appears here.
        Approve to apply the changes, reject to discard them.
      </p>

      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 mb-4">
        <Info size={12} className="text-muted-foreground/50 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground/70 leading-relaxed">
          Showing example output. In real use, agents write run results to{" "}
          <code className="font-mono">lib/data/pipeline.ts</code> and HITL tasks surface here automatically.
        </p>
      </div>

      {hitlCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-400/60 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/15 px-3 py-2.5 mb-4">
          <AlertTriangle size={13} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-xs text-foreground">
            <strong>{hitlCount} review{hitlCount > 1 ? "s" : ""} pending</strong> — approve or reject to continue.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {[...runs]
          .sort((a, b) => ({ hitl: 0, failed: 1, done: 2 }[a.status] - { hitl: 0, failed: 1, done: 2 }[b.status]))
          .map(run => (
            <QueueCard key={run.id} run={run} onDecision={handleDecision} />
          ))}
      </div>
    </AppShell>
  );
}
