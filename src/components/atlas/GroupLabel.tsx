"use client";

import { type NodeProps } from "@xyflow/react";
import { PATTERN_LABEL, SURFACE_LABEL } from "@/lib/ports/atlas";
import type { GroupNodeData } from "@/lib/adapters/flow-layout";

// Band title for one workflow. Non-interactive, monochrome; the surface badge
// makes "where the prototype sits" visible at a glance.
export function GroupLabel({ data }: NodeProps) {
  const d = data as GroupNodeData;
  return (
    <div className="w-[210px] pr-4 flex flex-col gap-2">
      <span className="text-[17px] font-black leading-[21px] text-foreground">{d.title}</span>
      <div className="flex flex-wrap gap-1.5">
        <Badge>{PATTERN_LABEL[d.pattern]}</Badge>
        <Badge>{SURFACE_LABEL[d.surface]}</Badge>
      </div>
      <p className="text-[11px] leading-4 text-muted-foreground">{d.problem}</p>
    </div>
  );
}

function Badge({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-border px-2.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
      {children}
    </span>
  );
}
