"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { CSSProperties } from "react";
import type { StepNodeData } from "./flow-layout";
import type { StepKind } from "./atlas.types";

// Monochrome by design: `kind` is conveyed through glyph + shape + border
// style, never colour. All colour comes from --atlas-* tokens (see atlas.css),
// so the node inherits whatever your design system defines. The one accent
// (--atlas-accent) marks prototype nodes and the selected state.
const GLYPH: Record<StepKind, string> = {
  input: "▷",
  agent: "✦",
  router: "⋔",
  parallel: "≣",
  tool: "⌗",
  human: "⊙",
  output: "✓",
};

const SHAPE: Record<StepKind, { radius: number; dashed: boolean; filled: boolean; mono: boolean }> = {
  input: { radius: 12, dashed: false, filled: false, mono: false },
  agent: { radius: 14, dashed: false, filled: false, mono: false },
  router: { radius: 6, dashed: false, filled: false, mono: false },
  parallel: { radius: 6, dashed: false, filled: false, mono: false },
  tool: { radius: 8, dashed: false, filled: false, mono: true },
  human: { radius: 14, dashed: true, filled: false, mono: false },
  output: { radius: 999, dashed: false, filled: true, mono: false },
};

const HANDLE: CSSProperties = {
  width: 7,
  height: 7,
  background: "var(--atlas-handle-bg)",
  border: "1px solid var(--atlas-border)",
};

export function StepNode({ data, selected }: NodeProps) {
  const d = data as StepNodeData;
  const shape = SHAPE[d.kind];
  const accent = Boolean(selected) || d.hasScreen;
  const borderWidth = selected ? 2 : 1.5;

  return (
    <div
      onClick={() => d.hasScreen && d.screen && window.open(d.screen, "_blank", "noopener")}
      style={{
        width: 172,
        padding: "9px 11px",
        display: "flex",
        flexDirection: "column",
        gap: 3,
        background: shape.filled ? "var(--atlas-node-fill)" : "var(--atlas-node-bg)",
        color: "var(--atlas-fg)",
        borderStyle: shape.dashed ? "dashed" : "solid",
        borderColor: accent ? "var(--atlas-accent)" : "var(--atlas-border)",
        borderWidth,
        // double top edge hints at a stacked/parallel coordinator
        borderTopWidth: d.kind === "parallel" ? 4 : borderWidth,
        borderRadius: shape.radius,
        cursor: d.hasScreen ? "pointer" : "default",
        transition: "border-color 120ms ease",
      }}
    >
      <Handle type="target" position={Position.Left} style={HANDLE} />

      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ fontSize: 13, lineHeight: 1, color: "var(--atlas-muted)" }}>{GLYPH[d.kind]}</span>
        <span
          style={{
            flex: 1,
            fontSize: 12.5,
            fontWeight: 700,
            lineHeight: 1.15,
            fontFamily: shape.mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit",
          }}
        >
          {d.label}
        </span>
        {d.hasScreen && <span style={{ fontSize: 11, color: "var(--atlas-accent)" }}>↗</span>}
      </div>

      {d.note && (
        <p
          style={{
            margin: 0,
            fontSize: 10.5,
            lineHeight: 1.32,
            color: "var(--atlas-muted)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {d.note}
        </p>
      )}

      {d.owner && (
        <span
          style={{
            alignSelf: "flex-start",
            marginTop: 1,
            fontSize: 8.5,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--atlas-muted)",
          }}
        >
          {d.owner}
        </span>
      )}

      <Handle type="source" position={Position.Right} style={HANDLE} />
    </div>
  );
}
