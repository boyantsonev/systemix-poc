"use client";

import React, { forwardRef, useRef } from "react";
import { cn } from "@/lib/utils";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import { FigmaLogo } from "@/components/ui/figma-logo";

// ── MCP badge ────────────────────────────────────────────────────────────────

type McpType = "console" | "official" | "both" | "none";

const MCP_LABELS: Record<McpType, { label: string; className: string } | null> = {
  console:  { label: "Console MCP",  className: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  official: { label: "Figma MCP",    className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  both:     { label: "Both MCPs",    className: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  none:     null,
};

function McpBadge({ type }: { type: McpType }) {
  const config = MCP_LABELS[type];
  if (!config) return null;
  return (
    <span className={cn(
      "inline-flex items-center rounded border px-1 py-0.5 font-mono text-[8px] leading-none mt-1",
      config.className,
    )}>
      {config.label}
    </span>
  );
}

// ── Pole node (Figma / Shipped) ───────────────────────────────────────────────

const PoleNode = forwardRef<
  HTMLDivElement,
  { label: string; icon: React.ReactNode; className?: string }
>(({ label, icon, className }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative z-10 flex flex-col items-center gap-1.5 rounded-xl border border-border bg-background px-5 py-4 shadow-sm min-w-[88px]",
      className,
    )}
  >
    <span className="leading-none">{icon}</span>
    <span className="text-xs font-semibold text-foreground whitespace-nowrap">{label}</span>
  </div>
));
PoleNode.displayName = "PoleNode";

// ── Step node ─────────────────────────────────────────────────────────────────

const StepNode = forwardRef<
  HTMLDivElement,
  { step: number; command: string; mcp: McpType }
>(({ step, command, mcp }, ref) => (
  <div
    ref={ref}
    className="relative z-10 flex flex-col items-center gap-0.5 rounded-lg border border-teal-500/20 bg-card px-3 py-2 shadow-sm"
  >
    <div className="flex items-center gap-1.5">
      <span className="text-[8px] font-black text-teal-500/30 tabular-nums leading-none">{step}</span>
      <code className="font-mono text-[10px] font-semibold text-teal-400 whitespace-nowrap">
        {command}
      </code>
    </div>
    <McpBadge type={mcp} />
  </div>
));
StepNode.displayName = "StepNode";

// ── Pipeline steps ────────────────────────────────────────────────────────────

const PIPELINE: { command: string; mcp: McpType }[] = [
  { command: "/figma",     mcp: "official" },
  { command: "/tokens",    mcp: "official" },
  { command: "/component", mcp: "official" },
  { command: "/storybook", mcp: "none"     },
  { command: "/deploy",    mcp: "none"     },
];

// Beam colour shifts from violet (Figma origin) → teal (pipeline) → blue (shipped)
const BEAM_COLORS = [
  { start: "#a855f7", stop: "#14b8a6" }, // figma → /figma
  { start: "#14b8a6", stop: "#14b8a6" }, // /figma → /tokens
  { start: "#14b8a6", stop: "#14b8a6" }, // /tokens → /component
  { start: "#14b8a6", stop: "#0ea5e9" }, // /component → /storybook
  { start: "#0ea5e9", stop: "#0ea5e9" }, // /storybook → /deploy
  { start: "#0ea5e9", stop: "#6366f1" }, // /deploy → shipped
];

// ── Main diagram ──────────────────────────────────────────────────────────────

export function PipelineBeam() {
  const containerRef = useRef<HTMLDivElement>(null);
  const figmaRef     = useRef<HTMLDivElement>(null);
  const shippedRef   = useRef<HTMLDivElement>(null);

  const stepRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ] as const;

  // Sequential chain: figma → step0 → step1 → step2 → step3 → step4 → shipped
  const chain = [figmaRef, ...stepRefs, shippedRef] as const;

  return (
    <div
      ref={containerRef}
      className="relative flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-8 overflow-hidden min-h-[320px]"
    >
      {/* ── Left pole: Figma ── */}
      <PoleNode ref={figmaRef} label="Figma" icon={<FigmaLogo size={28} />} />

      {/* ── Pipeline steps (single column) ── */}
      <div className="flex flex-col gap-2 items-center flex-1">
        <span className="text-[8px] font-black tracking-widest uppercase text-teal-500/50 mb-1">
          Pipeline
        </span>
        {PIPELINE.map((s, i) => (
          <StepNode
            key={s.command}
            ref={stepRefs[i]}
            step={i + 1}
            command={s.command}
            mcp={s.mcp}
          />
        ))}
      </div>

      {/* ── Right pole: Shipped ── */}
      <PoleNode ref={shippedRef} label="Shipped" icon="▲" />

      {/* ── Sequential beams ── */}
      {BEAM_COLORS.map((colors, i) => (
        <AnimatedBeam
          key={i}
          containerRef={containerRef}
          fromRef={chain[i]}
          toRef={chain[i + 1]}
          curvature={0}
          gradientStartColor={colors.start}
          gradientStopColor={colors.stop}
          pathColor={colors.start}
          pathOpacity={0.15}
          duration={4 + i * 0.3}
          delay={i * 0.6}
        />
      ))}
    </div>
  );
}
