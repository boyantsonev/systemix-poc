import type { StepKind } from "@/lib/ports/atlas";

// Mirrors the glyph language used by StepNode, so the canvas reads at a glance.
const ITEMS: { glyph: string; kind: StepKind; label: string }[] = [
  { glyph: "▷", kind: "input", label: "Input" },
  { glyph: "✦", kind: "agent", label: "Agent reasoning" },
  { glyph: "⋔", kind: "router", label: "Router (branches)" },
  { glyph: "≣", kind: "parallel", label: "Parallel coordinator" },
  { glyph: "⌗", kind: "tool", label: "Tool call" },
  { glyph: "⊙", kind: "human", label: "Human in the loop" },
  { glyph: "✓", kind: "output", label: "Output" },
];

export function PatternLegend() {
  return (
    <div className="w-[210px] flex flex-col gap-2 p-3.5 rounded-[14px] border border-border bg-card/95 backdrop-blur-sm">
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        Step types
      </span>
      {ITEMS.map((it) => (
        <div key={it.kind} className="flex items-center gap-2.5">
          <span className="w-[18px] text-center text-[12px] text-muted-foreground">{it.glyph}</span>
          <span className="text-[12px] text-foreground">{it.label}</span>
        </div>
      ))}
    </div>
  );
}
