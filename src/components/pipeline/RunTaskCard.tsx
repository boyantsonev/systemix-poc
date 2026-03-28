"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Zap, Cpu, UserCheck, CheckCircle, Loader2 } from "lucide-react";
import type { WorkflowStep } from "@/lib/data/pipeline";
import type { WorkflowNodeDef } from "@/lib/data/workflows";

const NODE_ICON = {
  trigger: Zap,
  skill:   Cpu,
  hitl:    UserCheck,
  output:  CheckCircle,
};

const STATUS_CONFIG = {
  pending:             { dot: "bg-muted-foreground/30",          label: "pending",  labelClass: "text-muted-foreground" },
  running:             { dot: "bg-blue-500 animate-pulse",       label: "running",  labelClass: "text-blue-600 dark:text-blue-400"  },
  done:                { dot: "bg-emerald-500",                  label: "done",     labelClass: "text-emerald-600 dark:text-emerald-400" },
  error:               { dot: "bg-red-500",                      label: "error",    labelClass: "text-red-600 dark:text-red-400"   },
  "awaiting-approval": { dot: "bg-amber-500 animate-pulse",      label: "waiting",  labelClass: "text-amber-700 dark:text-amber-400" },
  approved:            { dot: "bg-emerald-500",                  label: "approved", labelClass: "text-emerald-600 dark:text-emerald-400" },
  rejected:            { dot: "bg-red-500",                      label: "rejected", labelClass: "text-red-600 dark:text-red-400"   },
} as const;

function formatDuration(startedAt?: number, completedAt?: number) {
  if (!startedAt) return null;
  const end = completedAt ?? Date.now();
  const ms = end - startedAt;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(ts?: number) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

type Props = {
  step: WorkflowStep;
  node: WorkflowNodeDef;
};

export function RunTaskCard({ step, node }: Props) {
  const [expanded, setExpanded] = useState(false);
  const Icon = NODE_ICON[node.type];
  const cfg = STATUS_CONFIG[step.status];
  const duration = formatDuration(step.startedAt, step.completedAt);
  const hasLog = step.log.length > 0;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden transition-all">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Icon size={13} className="text-muted-foreground flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground truncate">{node.label}</span>
            {step.status === "running" && (
              <Loader2 size={10} className="animate-spin text-blue-600 dark:text-blue-400 flex-shrink-0" />
            )}
          </div>
          {step.startedAt && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {formatTime(step.startedAt)}
              {duration && ` · ${duration}`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          <span className={`text-[10px] font-medium ${cfg.labelClass}`}>{cfg.label}</span>
        </div>

        {hasLog && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}
      </div>

      {/* Log output */}
      {expanded && hasLog && (
        <div className="border-t border-border bg-muted/40 px-3 py-2.5 max-h-36 overflow-y-auto">
          {step.log.map((line, i) => (
            <p key={i} className="text-[10px] font-mono text-muted-foreground leading-relaxed">
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
