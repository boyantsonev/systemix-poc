"use client";

import { useState } from "react";
import { Zap, Cpu, UserCheck, CheckCircle, Play, Check, X, Clock } from "lucide-react";
import type { WorkflowNodeDef, NodeStatus } from "@/lib/data/workflows";

const TYPE_CONFIG = {
  trigger: {
    icon: Zap,
    badge: "TRIGGER",
    accentBorder:   "border-violet-500",
    accentText:     "text-violet-700 dark:text-violet-400",
    runningBorder:  "border-violet-400",
    doneBorder:     "border-violet-600",
    runBtn:         "text-violet-700 hover:text-violet-900 dark:text-violet-400 dark:hover:text-violet-300",
  },
  skill: {
    icon: Cpu,
    badge: "SKILL",
    accentBorder:   "border-teal-600",
    accentText:     "text-teal-700 dark:text-teal-400",
    runningBorder:  "border-teal-400",
    doneBorder:     "border-teal-600",
    runBtn:         "",
  },
  hitl: {
    icon: UserCheck,
    badge: "HUMAN",
    accentBorder:   "border-amber-600",
    accentText:     "text-amber-700 dark:text-amber-400",
    runningBorder:  "border-amber-400",
    doneBorder:     "border-amber-600",
    runBtn:         "",
  },
  output: {
    icon: CheckCircle,
    badge: "OUTPUT",
    accentBorder:   "border-gray-600",
    accentText:     "text-gray-500",
    runningBorder:  "border-gray-400",
    doneBorder:     "border-emerald-600",
    runBtn:         "",
  },
} as const;

const STATUS_DOT: Record<NodeStatus, string> = {
  idle:                "bg-muted-foreground/30",
  pending:             "bg-muted-foreground/30",
  running:             "bg-blue-500 animate-pulse",
  done:                "bg-emerald-500",
  error:               "bg-red-500",
  "awaiting-approval": "bg-amber-400 animate-pulse",
  approved:            "bg-emerald-500",
  rejected:            "bg-red-500",
};

const STATUS_LABEL: Partial<Record<NodeStatus, string>> = {
  running:             "running",
  done:                "done",
  error:               "error",
  "awaiting-approval": "waiting",
  approved:            "approved",
  rejected:            "rejected",
};

// ── Status ring config ─────────────────────────────────────────────────────

type RingConfig = {
  ring: string;           // Tailwind ring/border classes
  icon?: React.ReactNode; // optional badge icon
};

function getStatusRing(status: NodeStatus): RingConfig | null {
  switch (status) {
    case "pending":
      return { ring: "ring-2 ring-muted-foreground/30" };
    case "running":
      return { ring: "ring-2 ring-blue-500 animate-pulse" };
    case "done":
    case "approved":
      return {
        ring: "ring-2 ring-emerald-500",
        icon: <Check size={7} strokeWidth={3} className="text-emerald-400" />,
      };
    case "error":
    case "rejected":
      return {
        ring: "ring-2 ring-red-500",
        icon: <X size={7} strokeWidth={3} className="text-red-400" />,
      };
    case "awaiting-approval":
      return {
        ring: "ring-2 ring-amber-400 animate-pulse",
        icon: <Clock size={7} className="text-amber-400" />,
      };
    default:
      return null;
  }
}

// ── Relative time helper ───────────────────────────────────────────────────

function relativeSeconds(ms: number): string {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  return `${Math.round(s / 60)}m ago`;
}

function durationLabel(startMs: number, endMs: number): string {
  const ms = endMs - startMs;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

type Props = {
  node: WorkflowNodeDef;
  status: NodeStatus;
  isSelected: boolean;
  onClick: (id: string) => void;
  onRun?: () => void;
  width: number;
  height: number;
  startedAt?: number;
  completedAt?: number;
};

export function WorkflowNode({
  node, status, isSelected, onClick, onRun, width, height, startedAt, completedAt,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const cfg = TYPE_CONFIG[node.type];
  const Icon = cfg.icon;
  const ring = getStatusRing(status);

  // Border class based on status
  const borderClass =
    status === "running"
      ? `${cfg.runningBorder} animate-pulse`
      : status === "awaiting-approval"
      ? "border-amber-400 animate-pulse"
      : status === "done" || status === "approved"
      ? cfg.doneBorder
      : status === "error" || status === "rejected"
      ? "border-red-500"
      : isSelected
      ? cfg.accentBorder
      : "border-border";

  const showDot = status !== "idle" && status !== "pending";
  const dotLabel = STATUS_LABEL[status];

  // Tooltip timing line
  let timingLine: string | null = null;
  if (status === "running" && startedAt) {
    timingLine = `Started ${relativeSeconds(startedAt)}`;
  } else if ((status === "done" || status === "approved") && startedAt && completedAt) {
    timingLine = `Duration: ${durationLabel(startedAt, completedAt)}`;
  }

  return (
    <div
      style={{ position: "absolute", left: node.position.x, top: node.position.y, width, height }}
      onClick={() => onClick(node.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group"
    >
      {/* ── Status ring overlay ──────────────────────────────────────── */}
      {ring && (
        <div
          className={[
            "absolute inset-0 rounded-md pointer-events-none z-10",
            ring.ring,
          ].join(" ")}
        />
      )}

      {/* ── Status ring badge icon (top-right corner) ─────────────────── */}
      {ring?.icon && (
        <div className="absolute -top-1.5 -right-1.5 z-20 w-4 h-4 rounded-full bg-card border border-border flex items-center justify-center pointer-events-none">
          {ring.icon}
        </div>
      )}

      {/* ── Hover tooltip ─────────────────────────────────────────────── */}
      {hovered && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          style={{ top: height + 6 }}
        >
          <div className="bg-card border border-border/60 rounded-md px-2.5 py-2 min-w-[130px] max-w-[190px]">
            <p className="text-[11px] font-mono font-semibold text-foreground truncate">{node.label}</p>
            {node.agentName && (
              <p className="text-[10px] text-teal-400 font-mono mt-0.5 truncate">{node.agentName}</p>
            )}
            {status !== "idle" && (
              <div className="flex items-center gap-1 mt-1.5">
                <span className={`size-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} />
                <span className="text-[10px] font-mono text-muted-foreground/60">
                  {STATUS_LABEL[status] ?? status}
                </span>
              </div>
            )}
            {timingLine && (
              <p className="text-[10px] font-mono text-muted-foreground/50 mt-0.5">{timingLine}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Node card ─────────────────────────────────────────────────── */}
      <div
        className={[
          "rounded-md border bg-card cursor-pointer transition-all duration-150",
          "flex flex-col px-3 py-2 gap-0.5 select-none w-full h-full",
          borderClass,
          isSelected && status === "pending" ? "" : "",
          !isSelected ? "hover:border-border/80" : "",
        ].join(" ")}
      >
        {/* Type badge + icon */}
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-[10px] uppercase tracking-wide font-mono ${cfg.accentText} opacity-60`}>
            {cfg.badge}
          </span>
          <Icon size={10} className={`${cfg.accentText} opacity-50`} />
        </div>

        {/* Label */}
        <p className="text-foreground text-[11px] font-mono font-semibold leading-tight truncate">
          {node.label}
        </p>

        {/* Sublabel */}
        {node.sublabel && (
          <p className="text-muted-foreground/50 text-[10px] font-mono leading-tight truncate">
            {node.sublabel}
          </p>
        )}

        {/* Footer: run button or status indicator */}
        <div className="mt-auto flex items-center justify-between">
          {node.type === "trigger" && onRun && (status === "idle" || status === "pending") && (
            <button
              onClick={(e) => { e.stopPropagation(); onRun(); }}
              className={`flex items-center gap-1 text-[10px] font-mono font-medium tracking-wider uppercase transition-colors ${cfg.runBtn}`}
            >
              <Play size={7} fill="currentColor" />
              run
            </button>
          )}

          {showDot && (
            <div className="flex items-center gap-1 ml-auto">
              <span className={`size-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} />
              {dotLabel && (
                <span className="text-[10px] font-mono text-muted-foreground/60">{dotLabel}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
