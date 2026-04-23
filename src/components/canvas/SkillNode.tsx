"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

export type SkillNodeData = {
  command: string;
  name: string;
  description: string;
  mcp: "official" | "console" | "both" | "none";
  step?: number;
  status: "idle" | "running" | "success" | "error" | "awaiting";
  hitl: boolean;
  selected?: boolean;
};

const MCP_BADGE: Record<SkillNodeData["mcp"], { label: string; className: string } | null> = {
  official: { label: "Figma MCP",   className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  console:  { label: "Console MCP", className: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  both:     { label: "Both MCPs",   className: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  none:     null,
};

const STATUS_DOT: Record<SkillNodeData["status"], string> = {
  idle:     "bg-muted-foreground/30",
  running:  "bg-teal-400 animate-pulse",
  success:  "bg-emerald-400",
  error:    "bg-red-400",
  awaiting: "bg-amber-400 animate-pulse",
};

export const SkillNode = memo(function SkillNode({ data, selected }: NodeProps) {
  const d = data as SkillNodeData;
  const badge = MCP_BADGE[d.mcp];

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1 rounded-xl border bg-card px-4 py-3 shadow-sm transition-all min-w-[160px] max-w-[220px]",
        selected
          ? "border-teal-500/60 shadow-teal-500/10 shadow-lg ring-1 ring-teal-500/20"
          : "border-border hover:border-border/80",
      )}
    >
      {/* Step number */}
      {d.step !== undefined && (
        <span className="absolute -top-2.5 -left-1 text-[10px] font-black text-teal-500/40 tabular-nums">
          {d.step}
        </span>
      )}

      {/* Status + HITL */}
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", STATUS_DOT[d.status])} />
        {d.hitl && (
          <span
            title="Human-in-the-Loop: agent pauses here and waits for your approval before continuing"
            className="text-[8px] font-black tracking-widest uppercase text-amber-500/70 border border-amber-500/20 rounded px-1 py-0.5 cursor-help"
          >
            HITL
          </span>
        )}
      </div>

      {/* Command */}
      <code className="font-mono text-[11px] font-semibold text-teal-400 whitespace-nowrap">
        {d.command}
      </code>

      {/* Description */}
      <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
        {d.description}
      </p>

      {/* MCP badge */}
      {badge && (
        <span className={cn(
          "self-start inline-flex items-center rounded border px-1 py-0.5 font-mono text-[8px] leading-none mt-0.5",
          badge.className,
        )}>
          {badge.label}
        </span>
      )}

      <Handle type="target" position={Position.Left}  className="!w-2 !h-2 !bg-border !border-muted-foreground/30" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-teal-500/60 !border-teal-500/30" />
    </div>
  );
});
