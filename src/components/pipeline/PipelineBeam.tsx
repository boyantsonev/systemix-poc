"use client";

import { forwardRef, useRef } from "react";
import { cn } from "@/lib/utils";
import { AnimatedBeam } from "@/components/ui/animated-beam";

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
    <span className={cn("inline-flex items-center rounded border px-1 py-0.5 font-mono text-[8px] leading-none mt-1", config.className)}>
      {config.label}
    </span>
  );
}

// ── Pole node (Figma / Codebase) ─────────────────────────────────────────────

const PoleNode = forwardRef<
  HTMLDivElement,
  { label: string; icon: string; className?: string }
>(({ label, icon, className }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative z-10 flex flex-col items-center gap-1.5 rounded-xl border border-border bg-background px-5 py-4 shadow-sm min-w-[88px]",
      className,
    )}
  >
    <span className="text-xl leading-none">{icon}</span>
    <span className="text-xs font-semibold text-foreground whitespace-nowrap">{label}</span>
  </div>
));
PoleNode.displayName = "PoleNode";

// ── Skill node ───────────────────────────────────────────────────────────────

const SkillNode = forwardRef<
  HTMLDivElement,
  { command: string; mcp: McpType; dir: "dtc" | "ctd" }
>(({ command, mcp, dir }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative z-10 flex flex-col items-center gap-0.5 rounded-lg border bg-card px-2.5 py-2 shadow-sm",
      dir === "dtc"
        ? "border-violet-500/20"
        : "border-teal-500/20",
    )}
  >
    <code className={cn(
      "font-mono text-[10px] font-semibold whitespace-nowrap",
      dir === "dtc" ? "text-violet-400" : "text-teal-400",
    )}>
      {command}
    </code>
    <McpBadge type={mcp} />
  </div>
));
SkillNode.displayName = "SkillNode";

// ── Skill data ───────────────────────────────────────────────────────────────

// MCP classification based on skill promptContent:
// Design→Code skills use Official Figma MCP (get_design_context, get_variable_defs, get_screenshot)
// Code→Design skills: /push-tokens + /capture-to-figma use Console MCP (use_figma, figma_get_variables)
// /figma-inspect uses Official MCP (get_design_context, get_variable_defs)
// /sync orchestrates both

const DTC_SKILLS: { command: string; mcp: McpType }[] = [
  { command: "/sync-tokens",         mcp: "official" },
  { command: "/generate-from-figma", mcp: "official" },
  { command: "/apply-theme",         mcp: "official" },
  { command: "/drift-report",        mcp: "none"     },
];

const CTD_SKILLS: { command: string; mcp: McpType }[] = [
  { command: "/push-tokens",      mcp: "console"  },
  { command: "/capture-to-figma", mcp: "console"  },
  { command: "/figma-inspect",    mcp: "official" },
  { command: "/sync",             mcp: "both"     },
];

// ── Main diagram ─────────────────────────────────────────────────────────────

export function PipelineBeam() {
  const containerRef = useRef<HTMLDivElement>(null);
  const figmaRef     = useRef<HTMLDivElement>(null);
  const codebaseRef  = useRef<HTMLDivElement>(null);

  // DTC (Design→Code): Figma → node → Codebase
  const dtcRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];

  // CTD (Code→Design): Codebase → node → Figma
  const ctdRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];

  return (
    <div
      ref={containerRef}
      className="relative flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-8 overflow-hidden min-h-[320px]"
    >
      {/* ── Left pole: Figma ── */}
      <PoleNode ref={figmaRef} label="Figma" icon="✦" />

      {/* ── Middle columns ── */}
      <div className="flex flex-1 gap-2 justify-center items-center">

        {/* Design → Code column */}
        <div className="flex flex-col gap-2 items-center flex-1">
          <span className="text-[8px] font-black tracking-widest uppercase text-violet-500/60 mb-1">
            Design → Code
          </span>
          {DTC_SKILLS.map((s, i) => (
            <SkillNode key={s.command} ref={dtcRefs[i]} command={s.command} mcp={s.mcp} dir="dtc" />
          ))}
        </div>

        {/* Code → Design column */}
        <div className="flex flex-col gap-2 items-center flex-1">
          <span className="text-[8px] font-black tracking-widest uppercase text-teal-500/60 mb-1">
            Code → Design
          </span>
          {CTD_SKILLS.map((s, i) => (
            <SkillNode key={s.command} ref={ctdRefs[i]} command={s.command} mcp={s.mcp} dir="ctd" />
          ))}
        </div>

      </div>

      {/* ── Right pole: Codebase ── */}
      <PoleNode ref={codebaseRef} label="Codebase" icon="⟨/⟩" />

      {/* ── Design → Code beams (violet): Figma → skill → Codebase ── */}
      {dtcRefs.map((ref, i) => (
        <>
          <AnimatedBeam
            key={`dtc-in-${i}`}
            containerRef={containerRef}
            fromRef={figmaRef}
            toRef={ref}
            curvature={i % 2 === 0 ? -20 : 20}
            gradientStartColor="#a855f7"
            gradientStopColor="#818cf8"
            pathColor="#a855f7"
            pathOpacity={0.12}
            duration={6 + i * 0.5}
            delay={i * 0.7}
          />
          <AnimatedBeam
            key={`dtc-out-${i}`}
            containerRef={containerRef}
            fromRef={ref}
            toRef={codebaseRef}
            curvature={i % 2 === 0 ? -20 : 20}
            gradientStartColor="#818cf8"
            gradientStopColor="#a855f7"
            pathColor="#a855f7"
            pathOpacity={0.12}
            duration={6 + i * 0.5}
            delay={i * 0.7 + 0.25}
          />
        </>
      ))}

      {/* ── Code → Design beams (teal, reverse): Codebase → skill → Figma ── */}
      {ctdRefs.map((ref, i) => (
        <>
          <AnimatedBeam
            key={`ctd-in-${i}`}
            containerRef={containerRef}
            fromRef={codebaseRef}
            toRef={ref}
            curvature={i % 2 === 0 ? 20 : -20}
            reverse
            gradientStartColor="#14b8a6"
            gradientStopColor="#0ea5e9"
            pathColor="#14b8a6"
            pathOpacity={0.12}
            duration={7 + i * 0.5}
            delay={2 + i * 0.7}
          />
          <AnimatedBeam
            key={`ctd-out-${i}`}
            containerRef={containerRef}
            fromRef={ref}
            toRef={figmaRef}
            curvature={i % 2 === 0 ? 20 : -20}
            reverse
            gradientStartColor="#0ea5e9"
            gradientStopColor="#14b8a6"
            pathColor="#14b8a6"
            pathOpacity={0.12}
            duration={7 + i * 0.5}
            delay={2 + i * 0.7 + 0.25}
          />
        </>
      ))}
    </div>
  );
}
