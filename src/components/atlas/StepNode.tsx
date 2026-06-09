"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AGENT_LABEL, type StepKind } from "@/lib/ports/atlas";
import type { StepNodeData } from "@/lib/adapters/flow-layout";
import { cn } from "@/lib/utils";

// Monochrome by design: kind is conveyed through glyph + shape + border style,
// never colour. The single accent (primary) appears only when selected.
// Ported from the Connecta `StepNode` (Tamagui → Tailwind/shadcn).
const GLYPH: Record<StepKind, string> = {
  input: "▷",
  agent: "✦",
  router: "⋔",
  parallel: "≣",
  tool: "⌗",
  human: "⊙",
  output: "✓",
};

interface ShapeStyle {
  radius: number;
  dashed: boolean;
  filled: boolean;
  mono: boolean;
}

const SHAPE: Record<StepKind, ShapeStyle> = {
  input: { radius: 12, dashed: false, filled: false, mono: false },
  agent: { radius: 14, dashed: false, filled: false, mono: false },
  router: { radius: 6, dashed: false, filled: false, mono: false },
  parallel: { radius: 6, dashed: false, filled: false, mono: false },
  tool: { radius: 8, dashed: false, filled: false, mono: true },
  human: { radius: 14, dashed: true, filled: false, mono: false },
  output: { radius: 999, dashed: false, filled: true, mono: false },
};

const HANDLE = {
  width: 7,
  height: 7,
  background: "var(--background)",
  border: "1px solid var(--border)",
} as const;

export function StepNode({ data, selected }: NodeProps) {
  const d = data as StepNodeData;
  const shape = SHAPE[d.kind];

  return (
    <div
      className={cn(
        "w-[172px] px-3 py-2.5 flex flex-col gap-1 transition-colors",
        shape.filled ? "bg-muted" : "bg-card",
        shape.dashed ? "border-dashed" : "border-solid",
        selected ? "border-primary" : "border-border",
        d.hasScreen ? "cursor-pointer hover:border-foreground/60" : "cursor-default",
      )}
      style={{
        borderRadius: shape.radius,
        borderWidth: selected ? 2 : 1,
        // double top edge hints at a stacked/parallel coordinator
        borderTopWidth: d.kind === "parallel" ? 4 : selected ? 2 : 1,
      }}
    >
      <Handle type="target" position={Position.Left} style={HANDLE} />

      <div className="flex items-center gap-2">
        <span className="text-[13px] leading-none text-muted-foreground">{GLYPH[d.kind]}</span>
        <span
          className={cn(
            "flex-1 text-[13px] font-bold leading-tight text-foreground",
            shape.mono && "font-mono",
          )}
        >
          {d.label}
        </span>
        {d.hasScreen && <span className="text-[11px] text-muted-foreground">↗</span>}
      </div>

      <p className="text-[11px] leading-[15px] text-muted-foreground">{d.note}</p>

      {d.agent && (
        <span className="self-start mt-0.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
          {AGENT_LABEL[d.agent]}
        </span>
      )}

      <Handle type="source" position={Position.Right} style={HANDLE} />
    </div>
  );
}
