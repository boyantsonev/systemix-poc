"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  GitCommit,
  FileCode2,
  BarChart2,
  BookOpen,
  Rocket,
  Eye,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HitlTask, HitlTaskType } from "@/lib/data/pipeline";
import { useHitlQueue, type HitlTask as LiveHitlTask } from "@/hooks/useHitlQueue";

// ── Color maps ─────────────────────────────────────────────────────────────────

const PERSONA_COLORS: Record<string, {
  dot: string;
  badge: string;
  border: string;
}> = {
  violet:  { dot: "bg-violet-500 dark:bg-violet-400",  badge: "text-violet-700 bg-violet-100 border-violet-300 dark:text-violet-300 dark:bg-violet-950/40 dark:border-violet-500/30",  border: "border-violet-400 dark:border-violet-500/40"  },
  teal:    { dot: "bg-teal-500 dark:bg-teal-400",    badge: "text-teal-700 bg-teal-100 border-teal-300 dark:text-teal-300 dark:bg-teal-950/40 dark:border-teal-500/30",        border: "border-teal-400 dark:border-teal-500/40"    },
  amber:   { dot: "bg-amber-500 dark:bg-amber-400",   badge: "text-amber-700 bg-amber-100 border-amber-300 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-500/30",     border: "border-amber-400 dark:border-amber-500/40"   },
  rose:    { dot: "bg-rose-500 dark:bg-rose-400",    badge: "text-rose-700 bg-rose-100 border-rose-300 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-500/30",        border: "border-rose-400 dark:border-rose-500/40"    },
  blue:    { dot: "bg-blue-500 dark:bg-blue-400",    badge: "text-blue-700 bg-blue-100 border-blue-300 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-500/30",        border: "border-blue-400 dark:border-blue-500/40"    },
  emerald: { dot: "bg-emerald-500 dark:bg-emerald-400", badge: "text-emerald-700 bg-emerald-100 border-emerald-300 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-500/30", border: "border-emerald-400 dark:border-emerald-500/40" },
  slate:   { dot: "bg-slate-500 dark:bg-slate-400",   badge: "text-slate-700 bg-slate-100 border-slate-300 dark:text-slate-300 dark:bg-slate-800/60 dark:border-slate-600/30",     border: "border-slate-400 dark:border-slate-500/40"   },
};

function colorFor(color: string) {
  return PERSONA_COLORS[color] ?? PERSONA_COLORS.slate;
}

const PRIORITY_CONFIG = {
  high:   { label: "high",   class: "text-red-700 bg-red-100 border-red-300 dark:text-red-400 dark:bg-red-950/30 dark:border-red-500/20"     },
  medium: { label: "medium", class: "text-amber-700 bg-amber-100 border-amber-300 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-500/20" },
  low:    { label: "low",    class: "text-slate-600 bg-slate-100 border-slate-300 dark:text-slate-400 dark:bg-slate-800/40 dark:border-slate-600/20" },
};

const TYPE_CONFIG: Record<HitlTaskType | string, { Icon: React.ElementType; label: string }> = {
  "token-diff":       { Icon: GitCommit,  label: "Token Diff"     },
  "code-review":      { Icon: FileCode2,  label: "Code Review"    },
  "drift-report":     { Icon: BarChart2,  label: "Drift Report"   },
  "docs-review":      { Icon: BookOpen,   label: "Docs Review"    },
  "deploy-preview":   { Icon: Rocket,     label: "Deploy Preview" },
  "storybook-verify": { Icon: Eye,        label: "Story Verify"   },
  "approve":          { Icon: CheckCircle2, label: "Approval"     },
  "reject":           { Icon: XCircle,    label: "Rejection"      },
  "input":            { Icon: FileCode2,  label: "Input Required" },
  "review":           { Icon: Eye,        label: "Review"         },
};

// ── Relative time ──────────────────────────────────────────────────────────────

function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  return `${Math.round(diff / 3600)}h ago`;
}

// ── Single HITL task card ──────────────────────────────────────────────────────

function HitlCard({
  task,
  onDecision,
}: {
  task: HitlTask;
  onDecision: (id: string, decision: "approve" | "reject") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const color    = colorFor(task.skillColor);
  const typeCfg  = TYPE_CONFIG[task.type];
  const priCfg   = PRIORITY_CONFIG[task.priority];
  const Icon     = typeCfg.Icon;

  return (
    <div className={`rounded-lg border ${color.border} bg-card overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color.dot} animate-pulse`} />
        <Icon size={11} className="text-muted-foreground flex-shrink-0" />
        <span className="text-[10px] font-semibold text-foreground/80 flex-1 truncate">
          {typeCfg.label}
        </span>
        <span className={`text-[10px] font-mono border rounded px-1.5 py-0.5 ${priCfg.class}`}>
          {priCfg.label}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 space-y-1.5">
        {/* Agent + title */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] font-semibold font-mono border rounded px-1.5 py-0.5 ${color.badge}`}>
            {task.skill}
          </span>
          <span className="text-xs font-medium text-foreground/90 truncate">
            {task.title}
          </span>
        </div>

        {/* Description */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-left w-full group"
        >
          <p className={`text-[11px] text-muted-foreground leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
            {task.description}
          </p>
          {!expanded && (
            <span className="text-[10px] text-muted-foreground/40 group-hover:text-muted-foreground/70 flex items-center gap-0.5 mt-0.5 transition-colors">
              <ChevronDown size={9} /> more
            </span>
          )}
        </button>

        {/* Meta chips */}
        {task.meta && Object.keys(task.meta).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {Object.entries(task.meta).map(([k, v]) => (
              <span key={k} className="text-[10px] font-mono text-muted-foreground/60 bg-muted/50 rounded px-1.5 py-0.5">
                {k}: {String(v)}
              </span>
            ))}
          </div>
        )}

        {/* Time */}
        <p className="text-[10px] text-muted-foreground/40 tabular-nums">
          {relativeTime(task.createdAt)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-3 pb-3">
        <Button
          size="sm"
          className="flex-1 h-7 text-xs gap-1 bg-emerald-700 hover:bg-emerald-600 text-white border-0"
          onClick={() => onDecision(task.id, "approve")}
        >
          <CheckCircle2 size={11} />
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-7 text-xs gap-1 text-red-400 border-red-500/30 hover:bg-red-950/30 hover:text-red-300"
          onClick={() => onDecision(task.id, "reject")}
        >
          <XCircle size={11} />
          Reject
        </Button>
      </div>
    </div>
  );
}

// ── Normalise a live task to the shape HitlCard expects ──────────────────────

function normalizeLiveTask(t: LiveHitlTask): HitlTask {
  const priorityMap: Record<string, "high" | "medium" | "low"> = {
    critical: "high",
    high: "high",
    normal: "medium",
    low: "low",
  };
  return {
    id: t.id,
    agentId: t.agent ?? "unknown",
    skill: t.agent ?? "unknown",
    skillColor: "slate",
    title: t.title,
    type: (t.type as HitlTaskType) ?? "code-review",
    description: t.description,
    priority: priorityMap[t.priority] ?? "medium",
    createdAt: t.createdAt,
    meta: undefined,
  };
}

// ── Main component ─────────────────────────────────────────────────────────────

type Props = { tasks: HitlTask[]; useLive?: boolean };

export function HitlPanel({ tasks: initialTasks, useLive = false }: Props) {
  // Mock-mode state
  const [mockTasks, setMockTasks] = useState<HitlTask[]>(initialTasks);
  const [resolved, setResolved] = useState<{ id: string; decision: "approve" | "reject" }[]>([]);

  // Live-mode state
  const { tasks: liveTasks, pendingCount: livePendingCount, resolve: liveResolve } = useHitlQueue(3000);

  async function handleDecision(id: string, decision: "approve" | "reject") {
    if (useLive) {
      await liveResolve(id, decision === "approve" ? "approved" : "rejected");
    } else {
      setMockTasks(prev => prev.filter(t => t.id !== id));
      setResolved(prev => [...prev, { id, decision }]);
    }
  }

  const tasks = useLive
    ? liveTasks.filter(t => t.status === "pending").map(normalizeLiveTask)
    : mockTasks;

  const highCount   = tasks.filter(t => t.priority === "high").length;
  const pendingCount = useLive ? livePendingCount : tasks.length;

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Clock size={13} className="text-amber-400" />
          <span className="text-xs font-semibold text-foreground">Awaiting Review</span>
          {pendingCount > 0 && (
            <span className="bg-amber-100 text-amber-700 border border-amber-400 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 text-[10px] font-mono rounded-full px-1.5 py-0.5 leading-none">
              {pendingCount}
            </span>
          )}
        </div>
        {highCount > 0 && (
          <span className="text-[10px] text-red-700 border border-red-400 bg-red-100 dark:text-red-400 dark:border-red-500/20 dark:bg-red-950/20 rounded px-1.5 py-0.5">
            {highCount} high priority
          </span>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {tasks.length === 0 && resolved.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 size={24} className="text-muted-foreground/20 mb-2" />
            <p className="text-xs text-muted-foreground/40">No tasks pending.</p>
          </div>
        )}

        {/* Pending tasks — high priority first */}
        {[...tasks]
          .sort((a, b) => {
            const order = { high: 0, medium: 1, low: 2 };
            return order[a.priority] - order[b.priority];
          })
          .map(task => (
            <HitlCard key={task.id} task={task} onDecision={handleDecision} />
          ))
        }

        {/* Resolved */}
        {resolved.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 px-1">
              Resolved
            </p>
            {resolved.map(r => (
              <div
                key={r.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/30"
              >
                {r.decision === "approve" ? (
                  <CheckCircle2 size={11} className="text-emerald-400 flex-shrink-0" />
                ) : (
                  <XCircle size={11} className="text-red-400 flex-shrink-0" />
                )}
                <span className="text-[10px] font-mono text-muted-foreground/50 truncate">
                  {r.id}
                </span>
                <span className={`text-[10px] ml-auto flex-shrink-0 ${r.decision === "approve" ? "text-emerald-400" : "text-red-400"}`}>
                  {r.decision}d
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
