// The instance topology — source of truth for the Config-layer force graph.
// Blank-slate: the nodes/links are empty until the runtime feeds them (Phase 5
// repurposes this to a pipeline-runtime topology). The 7-type taxonomy + colors
// are kept so the graph + legend render consistently once populated.

export type NodeType = "source" | "skill" | "agent" | "artifact" | "infra" | "concept" | "tool";

export type NodeSize = "sm" | "md" | "lg";

export interface SystemNode {
  id: string;
  label: string;
  sub?: string;
  type: NodeType;
  size: NodeSize;
}

export interface SystemLink {
  source: string;
  target: string;
}

// ── Colors ──────────────────────────────────────────────────────────────────────
// Full sets (stroke / fill / text / glow) drive the node-info panel; the force graph
// colors nodes and links by the per-type `stroke` hex.

export interface ColorTriplet {
  stroke: string;
  fill: string;
  text: string;
  glow: string;
}

export type ColorSet = Record<NodeType, ColorTriplet>;

export const TYPE_COLOR_DARK: ColorSet = {
  source:   { stroke: "#7c3aed", fill: "#1a0f2e", text: "#c4b5fd", glow: "rgba(124,58,237,0.3)" },
  skill:    { stroke: "#059669", fill: "#0a1f15", text: "#6ee7b7", glow: "rgba(5,150,105,0.3)" },
  agent:    { stroke: "#d97706", fill: "#1c1407", text: "#fcd34d", glow: "rgba(217,119,6,0.3)" },
  artifact: { stroke: "#2563eb", fill: "#0c1628", text: "#93c5fd", glow: "rgba(37,99,235,0.5)" },
  infra:    { stroke: "#e11d48", fill: "#1a080f", text: "#fda4af", glow: "rgba(225,29,72,0.4)" },
  concept:  { stroke: "#64748b", fill: "#0f1520", text: "#94a3b8", glow: "rgba(71,85,105,0.2)" },
  tool:     { stroke: "#0891b2", fill: "#031a1f", text: "#67e8f9", glow: "rgba(8,145,178,0.3)" },
};

export const TYPE_COLOR_LIGHT: ColorSet = {
  source:   { stroke: "#7c3aed", fill: "#f5f0ff", text: "#5b21b6", glow: "rgba(124,58,237,0.12)" },
  skill:    { stroke: "#059669", fill: "#ecfdf5", text: "#065f46", glow: "rgba(5,150,105,0.12)" },
  agent:    { stroke: "#d97706", fill: "#fffbeb", text: "#92400e", glow: "rgba(217,119,6,0.12)" },
  artifact: { stroke: "#2563eb", fill: "#eff6ff", text: "#1e40af", glow: "rgba(37,99,235,0.15)" },
  infra:    { stroke: "#e11d48", fill: "#fff1f2", text: "#9f1239", glow: "rgba(225,29,72,0.12)" },
  concept:  { stroke: "#64748b", fill: "#f8fafc", text: "#334155", glow: "rgba(71,85,105,0.08)" },
  tool:     { stroke: "#0891b2", fill: "#ecfeff", text: "#155e75", glow: "rgba(8,145,178,0.12)" },
};

export const TYPE_LABEL: Record<NodeType, string> = {
  source:   "Data source",
  skill:    "Skill (slash command)",
  agent:    "Agent / runtime",
  artifact: "Artifact",
  infra:    "Infrastructure",
  concept:  "Concept / UI",
  tool:     "AI tool",
};

// Relative node volume for `nodeVal` in the force graph.
export const SIZE_VAL: Record<NodeSize, number> = { sm: 2, md: 4.5, lg: 10 };

// ── Topology data lives in src/lib/state/instance-topology.ts ─────────────────────
// The force graph is fed its nodes/links by the topology builder (ADR-021). This
// module keeps only the shared shape the graph + cards render against: the node /
// link types (above), the 7-type palette, and the labels.
