"use client";

import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { FigmaLogo } from "@/components/ui/figma-logo";

export function HeroRow() {
  return (
    <section className="relative overflow-hidden rounded-xl border border-border/60 bg-background min-h-[220px] flex flex-col justify-center px-8 py-8 mb-6">
      {/* FlickeringGrid background */}
      <FlickeringGrid
        className="absolute inset-0 z-0 opacity-30 dark:opacity-20"
        squareSize={14}
        gridGap={6}
        flickerChance={0.2}
        maxOpacity={0.5}
        color="rgb(139, 92, 246)"
      />

      {/* Gradient fade at bottom to blend with page */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent z-[1]" />

      {/* Content on top */}
      <div className="relative z-[2]">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            {/* Figma logo badge */}
            <div className="flex items-center gap-2 mb-4">
              <FigmaLogo size={16} />
              <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">Figma ↔ Code</span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-foreground leading-tight">
              Design ↔ Code. Always in sync.
            </h1>
            <p className="text-[13px] text-muted-foreground max-w-[520px] mt-1">
              Agent-driven workflow that keeps Figma tokens, components, and live code in continuous alignment.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground border border-border/60 bg-card rounded-md px-2.5 py-1 shrink-0">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            7 agents active
          </span>
        </div>
      </div>
    </section>
  );
}
