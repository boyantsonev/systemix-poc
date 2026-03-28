"use client";

import { Zap, Cpu, UserCheck, CheckCircle, Play } from "lucide-react";
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

type Props = {
  node: WorkflowNodeDef;
  status: NodeStatus;
  isSelected: boolean;
  onClick: (id: string) => void;
  onRun?: () => void;
  width: number;
  height: number;
};

export function WorkflowNode({
  node, status, isSelected, onClick, onRun, width, height,
}: Props) {
  const cfg = TYPE_CONFIG[node.type];
  const Icon = cfg.icon;

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

  return (
    <div
      style={{ position: "absolute", left: node.position.x, top: node.position.y, width, height }}
      onClick={() => onClick(node.id)}
      className={[
        "rounded-xl border-2 bg-card cursor-pointer transition-all duration-200",
        "flex flex-col p-2.5 gap-0.5 select-none",
        borderClass,
        isSelected && status === "pending" ? "shadow-lg shadow-black/20" : "",
        !isSelected ? "hover:border-muted-foreground/30" : "",
      ].join(" ")}
    >
      {/* Type badge + icon */}
      <div className="flex items-center justify-between mb-0.5">
        <span className={`text-[9px] font-black tracking-widest uppercase ${cfg.accentText}`}>
          {cfg.badge}
        </span>
        <Icon size={11} className={cfg.accentText} />
      </div>

      {/* Label */}
      <p className="text-foreground text-[11px] font-semibold leading-tight truncate">
        {node.label}
      </p>

      {/* Sublabel */}
      {node.sublabel && (
        <p className="text-muted-foreground text-[10px] font-mono leading-tight truncate">
          {node.sublabel}
        </p>
      )}

      {/* Footer: run button or status indicator */}
      <div className="mt-auto flex items-center justify-between">
        {node.type === "trigger" && onRun && (status === "idle" || status === "pending") && (
          <button
            onClick={(e) => { e.stopPropagation(); onRun(); }}
            className={`flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase transition-colors ${cfg.runBtn}`}
          >
            <Play size={7} fill="currentColor" />
            Run
          </button>
        )}

        {showDot && (
          <div className="flex items-center gap-1 ml-auto">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} />
            {dotLabel && (
              <span className="text-[9px] text-muted-foreground">{dotLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
