// The Systemix instance topology — the single source of truth for the Config-layer
// 3D force graph. The 7-type taxonomy (Data source / Skill / Agent-runtime / Artifact /
// Infrastructure / Concept-UI / AI tool) mirrors the legacy 2D `SystemGraph.tsx`, which
// is still embedded in the marketing docs and intentionally left untouched. New work
// reads from here; consolidate the 2D copy when the docs embed is retired.

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
// Full sets (stroke / fill / text / glow) drive the node-info panel; the 3D graph
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

// Relative node volume for `nodeVal` in the 3D force graph.
export const SIZE_VAL: Record<NodeSize, number> = { sm: 2, md: 4.5, lg: 10 };

// ── Topology ────────────────────────────────────────────────────────────────────

export const systemNodes: SystemNode[] = [
  // Sources
  { id: "figma-src",     label: "Figma",         type: "source",   size: "md" },
  { id: "css-src",       label: "CSS / Globals", type: "source",   size: "sm" },
  { id: "storybook-src", label: "Storybook",     type: "source",   size: "sm" },

  // Skills
  { id: "s-figma",       label: "/figma",         type: "skill",   size: "sm" },
  { id: "s-tokens",      label: "/tokens",        type: "skill",   size: "sm" },
  { id: "s-component",   label: "/component",     type: "skill",   size: "sm" },
  { id: "s-storybook",   label: "/storybook",     type: "skill",   size: "sm" },
  { id: "s-deploy",      label: "/deploy",        type: "skill",   size: "sm" },
  { id: "s-drift",       label: "/drift-report",  type: "skill",   size: "sm" },
  { id: "s-sync-figma",  label: "/sync-to-figma", type: "skill",   size: "sm" },

  // Agents
  { id: "ada",   label: "Figma → Code",   type: "agent", size: "md" },
  { id: "flux",  label: "Token Sync",     type: "agent", size: "md" },
  { id: "sage",  label: "Storybook",      type: "agent", size: "sm" },
  { id: "ship",  label: "Deploy",         type: "agent", size: "sm" },
  { id: "scout", label: "Drift Detector", type: "agent", size: "sm" },

  // Artifacts
  { id: "contract",      label: "MDX Contracts", type: "artifact", size: "lg" },
  { id: "tokens-bridge", label: "tokens.bridge", type: "artifact", size: "sm" },
  { id: "components",    label: "Components",     type: "artifact", size: "sm" },

  // Infrastructure / runtime
  { id: "hermes",      label: "Hermes",        type: "agent",   size: "md", sub: "Ollama / local" },
  { id: "mdx-indexer", label: "MDX Indexer",   type: "infra",   size: "sm" },
  { id: "quality",     label: "Quality Score", type: "concept", size: "sm" },
  { id: "hitl",        label: "Decision Queue", type: "concept", size: "sm", sub: "HITL" },
  { id: "contract-ui", label: "/contract UI",  type: "concept", size: "sm" },

  // Tools
  { id: "claude-code", label: "Claude Code", type: "tool", size: "sm" },
  { id: "cursor",      label: "Cursor",      type: "tool", size: "sm" },
  { id: "posthog",     label: "PostHog",     type: "tool", size: "sm" },
];

export const systemLinks: SystemLink[] = [
  { source: "figma-src",     target: "s-figma" },
  { source: "figma-src",     target: "s-tokens" },
  { source: "css-src",       target: "s-tokens" },
  { source: "figma-src",     target: "s-sync-figma" },
  { source: "storybook-src", target: "s-storybook" },

  { source: "s-figma",      target: "ada" },
  { source: "s-tokens",     target: "flux" },
  { source: "s-component",  target: "ada" },
  { source: "s-storybook",  target: "sage" },
  { source: "s-deploy",     target: "ship" },
  { source: "s-drift",      target: "scout" },
  { source: "s-sync-figma", target: "flux" },

  { source: "ada",   target: "contract" },
  { source: "flux",  target: "contract" },
  { source: "scout", target: "contract" },
  { source: "sage",  target: "contract" },

  { source: "ada",           target: "components" },
  { source: "flux",          target: "tokens-bridge" },
  { source: "tokens-bridge", target: "s-sync-figma" },

  { source: "hermes", target: "contract" },

  { source: "contract",    target: "mdx-indexer" },
  { source: "mdx-indexer", target: "quality" },
  { source: "quality",     target: "hitl" },
  { source: "contract",    target: "contract-ui" },
  { source: "posthog",     target: "contract" },
  { source: "hitl",        target: "contract" },

  { source: "hermes",   target: "claude-code" },
  { source: "hermes",   target: "cursor" },
  { source: "hermes",   target: "posthog" },
  { source: "s-deploy", target: "posthog" },
  { source: "s-drift",  target: "posthog" },
];

// ── Node metadata (detail panel) ──────────────────────────────────────────────────

export interface NodeMeta {
  desc: string;
  docHrefs?: { label: string; href: string }[];
  command?: string;
}

export const NODE_META: Record<string, NodeMeta> = {
  "figma-src": {
    desc: "Figma file — source of design variables, component specs, and variant definitions. Read via the official Figma REST MCP; write-back uses the Figma Console MCP by TJ Pitre (southleft).",
    docHrefs: [{ label: "Contract →", href: "/docs/concepts/contract" }],
  },
  "css-src": {
    desc: "globals.css — CSS custom properties that define the code-side token values. The canonical code source of truth.",
    docHrefs: [{ label: "Contract →", href: "/docs/concepts/contract" }],
  },
  "storybook-src": {
    desc: "Running Storybook instance — component inventory and story screenshots. Accessed via Storybook MCP.",
    docHrefs: [{ label: "Skills library →", href: "/docs/skills" }],
  },
  "s-figma": {
    desc: "Extract design context — tokens, layout, variants — from any Figma URL. Run this first before generating components.",
    command: "/figma",
    docHrefs: [{ label: "Skills library →", href: "/docs/skills" }],
  },
  "s-tokens": {
    desc: "Diff Figma variables against your CSS token file. Shows Added / Changed / Removed before writing any file.",
    command: "/tokens",
    docHrefs: [{ label: "Skills library →", href: "/docs/skills" }],
  },
  "s-component": {
    desc: "Generate a production-ready React TypeScript component and Storybook story from a Figma URL.",
    command: "/component",
    docHrefs: [{ label: "Skills library →", href: "/docs/skills" }],
  },
  "s-storybook": {
    desc: "Read, verify, and update Storybook stories. Compares screenshots against the Figma spec and reports drift.",
    command: "/storybook",
    docHrefs: [{ label: "Skills library →", href: "/docs/skills" }],
  },
  "s-deploy": {
    desc: "Build the project and deploy a preview to Vercel. Returns a preview URL and posts it to Figma.",
    command: "/deploy",
    docHrefs: [{ label: "Skills library →", href: "/docs/skills" }],
  },
  "s-drift": {
    desc: "Audit the codebase for hardcoded values that should be tokens. Produces a severity-graded report.",
    command: "/drift-report",
    docHrefs: [
      { label: "Skills library →", href: "/docs/skills" },
      { label: "Drift & Reconciliation →", href: "/docs/concepts/drift" },
    ],
  },
  "s-sync-figma": {
    desc: "Push CSS custom property values back to Figma variables. Reverse of /tokens — use when code is the source.",
    command: "/sync-to-figma",
    docHrefs: [{ label: "Skills library →", href: "/docs/skills" }],
  },
  "ada": {
    desc: "Translates Figma designs into production-ready React components. Invoked by /figma and /component.",
    docHrefs: [{ label: "Skills library →", href: "/docs/skills" }],
  },
  "flux": {
    desc: "Keeps Figma variables and CSS token files in lock-step. Runs both /tokens and /sync-to-figma directions.",
    docHrefs: [{ label: "Skills library →", href: "/docs/skills" }],
  },
  "sage": {
    desc: "Reads and verifies Storybook stories against Figma specs. Generates missing stories and fixes token mismatches.",
    docHrefs: [{ label: "Skills library →", href: "/docs/skills" }],
  },
  "ship": {
    desc: "Builds the project and deploys to Vercel. Auto-fixes build errors before deploying. Returns a preview URL.",
    docHrefs: [{ label: "Skills library →", href: "/docs/skills" }],
  },
  "scout": {
    desc: "Audits the codebase for design-code drift. Detects hardcoded hex, px spacing, and token value mismatches.",
    docHrefs: [
      { label: "Skills library →", href: "/docs/skills" },
      { label: "Drift →", href: "/docs/concepts/drift" },
    ],
  },
  "contract": {
    desc: "MDX contract files — one per token and component. YAML frontmatter stores status, figma-value, delta-e, resolve-decision, and evidence-posthog. Prose body holds the rationale. Written by Hermes; indexed by the MDX Indexer.",
    docHrefs: [{ label: "Contract →", href: "/docs/concepts/contract" }],
  },
  "tokens-bridge": {
    desc: "tokens.bridge.json — CSS tokens pre-converted to hex/rgba for the Figma API. Intermediate artifact used by /sync-to-figma.",
    docHrefs: [{ label: "Contract →", href: "/docs/concepts/contract" }],
  },
  "components": {
    desc: "Generated React components with TypeScript types and Storybook stories, written to src/components/.",
    docHrefs: [{ label: "Skills library →", href: "/docs/skills" }],
  },
  "hermes": {
    desc: "Local LLM running via Ollama (hermes3, localhost:11434). Authors MDX contracts when CSS or Figma changes. Polls PostHog for experiment results and synthesizes them against contract evidence — past experiments, prior decisions, what was already tried — then writes a hypothesis-validation card to the Decision Queue or directly to the contract when confidence is high.",
    docHrefs: [
      { label: "Hermes →", href: "/docs/concepts/hermes" },
      { label: "Evidence Layer →", href: "/docs/concepts/evidence-layer" },
    ],
  },
  "quality": {
    desc: "Quality score (0–100%) from resolved token ratio, source coverage, and completeness. Below 80%, MCP server won't start.",
    docHrefs: [{ label: "Quality Score →", href: "/docs/concepts/quality-score" }],
  },
  "hitl": {
    desc: "Decision Queue — three card types surfaced by Hermes: drift-resolution (CSS vs Figma divergence), instrumentation-approval (PostHog capture calls), hypothesis-validation (experiment result → promote / run longer / discard). Every approved decision is written back into the relevant contract as evidence.",
    docHrefs: [{ label: "HITL & Decision Queue →", href: "/docs/concepts/hitl" }],
  },
  "mdx-indexer": {
    desc: "Reads all MDX contract files at build time, parses YAML frontmatter, and computes the quality score via CIEDE2000 perceptual distance (culori). Classifies token drift as imperceptible (ΔE < 2) vs. real. Powers the /contract UI and the dashboard quality metric.",
    docHrefs: [{ label: "Quality Score →", href: "/docs/concepts/quality-score" }],
  },
  "contract-ui": {
    desc: "The /contract section of the Systemix UI — landing page with quality score, /contract/tokens and /contract/components index pages with filter pills, and /contract/[slug] detail views with color swatches, ΔE indicators, and inline resolve controls.",
    docHrefs: [{ label: "Contract →", href: "/docs/concepts/contract" }],
  },
  "claude-code": {
    desc: "Anthropic's AI coding assistant. Reads the contract via Hermes MCP before writing components or modifying tokens.",
    docHrefs: [{ label: "Quick Install →", href: "/docs/quick-install" }],
  },
  "cursor": {
    desc: "AI code editor. Uses Hermes MCP to query verified token values and component specs before generating code.",
    docHrefs: [{ label: "Quick Install →", href: "/docs/quick-install" }],
  },
  "posthog": {
    desc: "Production evidence source. Hermes polls PostHog experiment results and synthesizes them against the contract — prior decisions, what was already tried, baseline rates. Winning variants get written back into the contract MDX as a dated evidence record. /deploy also sends quality score annotations at ship time.",
    docHrefs: [{ label: "Evidence Layer →", href: "/docs/concepts/evidence-layer" }],
  },
};

// ── Config → graph mapping ────────────────────────────────────────────────────────
// Which nodes belong to which instance dimension. When a dimension is disabled in
// systemix.config.yaml, its nodes are dimmed in the graph. (Mirrors InstanceView.)

export const SIGNAL_FIGMA_NODES = ["figma-src", "s-figma", "s-sync-figma", "s-tokens"];
export const SIGNAL_POSTHOG_NODES = ["posthog"];
export const DESIGN_SURFACE_NODES = [
  "storybook-src", "s-component", "s-storybook", "s-deploy", "s-drift",
  "ada", "flux", "sage", "ship", "scout", "components", "tokens-bridge",
];
