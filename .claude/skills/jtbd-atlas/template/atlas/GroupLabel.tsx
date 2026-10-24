"use client";

import { type NodeProps } from "@xyflow/react";
import { PATTERN_LABEL, SURFACE_LABEL } from "./atlas.types";
import type { GroupNodeData } from "./flow-layout";

// Band title for one workflow. Non-interactive, monochrome; the badges make the
// pattern + surface ("where the prototype sits") visible at a glance. All colour
// comes from --atlas-* tokens.
export function GroupLabel({ data }: NodeProps) {
  const d = data as GroupNodeData;
  return (
    <div style={{ width: 210, paddingRight: 16, display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: 17, fontWeight: 900, lineHeight: "21px", color: "var(--atlas-fg)" }}>
        {d.title}
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {d.pattern && <Badge>{PATTERN_LABEL[d.pattern]}</Badge>}
        {d.surface && <Badge>{SURFACE_LABEL[d.surface]}</Badge>}
      </div>
      {d.problem && (
        <p style={{ margin: 0, fontSize: 11, lineHeight: "16px", color: "var(--atlas-muted)" }}>{d.problem}</p>
      )}
    </div>
  );
}

function Badge({ children }: { children: string }) {
  return (
    <span
      style={{
        borderRadius: 999,
        border: "1px solid var(--atlas-border)",
        padding: "1px 10px",
        fontSize: 9,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "var(--atlas-muted)",
      }}
    >
      {children}
    </span>
  );
}
