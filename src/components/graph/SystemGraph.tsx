"use client";

import { useState, useMemo } from "react";
import { useTheme } from "next-themes";
import { pipelineSkills } from "@/lib/data/pipeline";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  type NodeProps,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// ── Types ──────────────────────────────────────────────────────────────────────

type NType = "source" | "skill" | "agent" | "artifact" | "infra" | "concept" | "tool";

type GraphNodeData = {
  label: string;
  sub?: string;
  ntype: NType;
  size: "sm" | "md" | "lg";
  dimmed?: boolean;
};

// ── Colors ─────────────────────────────────────────────────────────────────────

type ColorSet = Record<NType, { stroke: string; fill: string; text: string; glow: string }>;

const TYPE_COLOR_DARK: ColorSet = {
  source:   { stroke: "#7c3aed", fill: "#1a0f2e", text: "#c4b5fd", glow: "rgba(124,58,237,0.3)"  },
  skill:    { stroke: "#059669", fill: "#0a1f15", text: "#6ee7b7", glow: "rgba(5,150,105,0.3)"   },
  agent:    { stroke: "#d97706", fill: "#1c1407", text: "#fcd34d", glow: "rgba(217,119,6,0.3)"   },
  artifact: { stroke: "#2563eb", fill: "#0c1628", text: "#93c5fd", glow: "rgba(37,99,235,0.5)"   },
  infra:    { stroke: "#e11d48", fill: "#1a080f", text: "#fda4af", glow: "rgba(225,29,72,0.4)"   },
  concept:  { stroke: "#475569", fill: "#0f1520", text: "#94a3b8", glow: "rgba(71,85,105,0.2)"   },
  tool:     { stroke: "#0891b2", fill: "#031a1f", text: "#67e8f9", glow: "rgba(8,145,178,0.3)"   },
};

const TYPE_COLOR_LIGHT: ColorSet = {
  source:   { stroke: "#7c3aed", fill: "#f5f0ff", text: "#5b21b6", glow: "rgba(124,58,237,0.12)" },
  skill:    { stroke: "#059669", fill: "#ecfdf5", text: "#065f46", glow: "rgba(5,150,105,0.12)"  },
  agent:    { stroke: "#d97706", fill: "#fffbeb", text: "#92400e", glow: "rgba(217,119,6,0.12)"  },
  artifact: { stroke: "#2563eb", fill: "#eff6ff", text: "#1e40af", glow: "rgba(37,99,235,0.15)"  },
  infra:    { stroke: "#e11d48", fill: "#fff1f2", text: "#9f1239", glow: "rgba(225,29,72,0.12)"  },
  concept:  { stroke: "#64748b", fill: "#f8fafc", text: "#334155", glow: "rgba(71,85,105,0.08)"  },
  tool:     { stroke: "#0891b2", fill: "#ecfeff", text: "#155e75", glow: "rgba(8,145,178,0.12)"  },
};

const RADIUS: Record<string, number> = { sm: 13, md: 17, lg: 28 };

// ── Custom node ────────────────────────────────────────────────────────────────

function GraphNode({ data }: NodeProps<Node<GraphNodeData>>) {
  const { resolvedTheme } = useTheme();
  const { label, sub, ntype, size, dimmed } = data;
  const col = (resolvedTheme === "light" ? TYPE_COLOR_LIGHT : TYPE_COLOR_DARK)[ntype];
  const r = RADIUS[size];
  const d = r * 2;

  return (
    <div
      style={{
        width: d,
        height: d,
        opacity: dimmed ? 0.1 : 1,
        transition: "opacity 0.18s ease",
        cursor: "default",
        userSelect: "none",
      }}
    >
      <Handle type="target" position={Position.Left}
        style={{ opacity: 0, width: 2, height: 2, border: "none", background: "transparent" }} />
      <Handle type="source" position={Position.Right}
        style={{ opacity: 0, width: 2, height: 2, border: "none", background: "transparent" }} />

      <svg width={d} height={d} style={{ overflow: "visible" }}>
        <circle cx={r} cy={r} r={r + 4} fill={col.glow} />
        <circle cx={r} cy={r} r={r - 1} fill={col.fill} stroke={col.stroke} strokeWidth={1.5} />
        {size === "lg" && (
          <circle cx={r} cy={r} r={4} fill={col.stroke} opacity={0.6} />
        )}
        <text
          x={r} y={d + 16}
          textAnchor="middle"
          fontSize={10}
          fontFamily="ui-monospace, monospace"
          fontWeight="500"
          fill={col.text}
        >
          {label}
        </text>
        {sub && (
          <text
            x={r} y={d + 28}
            textAnchor="middle"
            fontSize={9}
            fontFamily="ui-monospace, monospace"
            fill={col.text}
            opacity={0.45}
          >
            {sub}
          </text>
        )}
      </svg>
    </div>
  );
}

const NODE_TYPES = { graphNode: GraphNode };

// ── Graph data ─────────────────────────────────────────────────────────────────

const mkNode = (
  id: string,
  x: number,
  y: number,
  label: string,
  ntype: NType,
  size: "sm" | "md" | "lg",
  sub?: string,
): Node<GraphNodeData> => ({
  id,
  type: "graphNode",
  position: { x, y },
  data: { label, ntype, size, sub },
});

const BASE_NODES: Node<GraphNodeData>[] = [
  // ── Sources ──
  mkNode("figma-src",       80,  90,  "Figma",           "source",   "md"),
  mkNode("css-src",         60,  310, "CSS / Globals",    "source",   "sm"),
  mkNode("storybook-src",   80,  520, "Storybook",        "source",   "sm"),

  // ── Skills ──
  mkNode("s-figma",         255, 70,  "/figma",           "skill",    "sm"),
  mkNode("s-tokens",        255, 230, "/tokens",          "skill",    "sm"),
  mkNode("s-component",     255, 380, "/component",       "skill",    "sm"),
  mkNode("s-storybook",     255, 510, "/storybook",       "skill",    "sm"),
  mkNode("s-deploy",        255, 620, "/deploy",          "skill",    "sm"),
  mkNode("s-drift",         150, 450, "/drift-report",    "skill",    "sm"),
  mkNode("s-sync-figma",    160, 185, "/sync-to-figma",   "skill",    "sm"),

  // ── Agents ──
  mkNode("ada",             445, 110, "Figma → Code",     "agent",    "md"),
  mkNode("flux",            445, 270, "Token Sync",       "agent",    "md"),
  mkNode("sage",            445, 450, "Storybook",        "agent",    "sm"),
  mkNode("ship",            445, 590, "Deploy",           "agent",    "sm"),
  mkNode("scout",           355, 490, "Drift Detector",   "agent",    "sm"),

  // ── Artifacts ──
  mkNode("contract",        630, 270, "MDX Contracts",    "artifact", "lg"),
  mkNode("tokens-bridge",   600, 470, "tokens.bridge",    "artifact", "sm"),
  mkNode("components",      590, 110, "Components",       "artifact", "sm"),

  // ── Infrastructure ──
  mkNode("hermes",          830, 255, "Hermes",           "agent",    "md", "Ollama / local"),
  mkNode("mdx-indexer",     720, 390, "MDX Indexer",      "infra",    "sm"),
  mkNode("quality",         790, 480, "Quality Score",    "concept",  "sm"),
  mkNode("hitl",            890, 540, "Drift Room",       "concept",  "sm", "HITL"),
  mkNode("contract-ui",     800, 610, "/contract UI",     "concept",  "sm"),

  // ── Tools ──
  mkNode("claude-code",     1010, 175, "Claude Code",     "tool",     "sm"),
  mkNode("cursor",          1010, 340, "Cursor",          "tool",     "sm"),
  mkNode("posthog",         1010, 500, "PostHog",         "tool",     "sm"),
];

type EStyle = { stroke: string; strokeWidth: number; opacity: number; strokeDasharray?: string };

const mkEdge = (
  id: string, src: string, tgt: string,
  style: Partial<EStyle>,
  animated = false,
): Edge => ({
  id,
  source: src,
  target: tgt,
  animated,
  style: { strokeWidth: 1, opacity: 0.3, ...style },
  type: "smoothstep",
});

const BASE_EDGES: Edge[] = [
  mkEdge("figma-sfigma",        "figma-src",     "s-figma",       { stroke: "#7c3aed" }),
  mkEdge("figma-stokens",       "figma-src",     "s-tokens",      { stroke: "#7c3aed" }),
  mkEdge("css-stokens",         "css-src",       "s-tokens",      { stroke: "#7c3aed" }),
  mkEdge("figma-ssynk",         "figma-src",     "s-sync-figma",  { stroke: "#7c3aed", strokeDasharray: "3 3" }),
  mkEdge("storybook-sstory",    "storybook-src", "s-storybook",   { stroke: "#7c3aed" }),

  mkEdge("sfigma-ada",          "s-figma",       "ada",           { stroke: "#d97706" }),
  mkEdge("stokens-flux",        "s-tokens",      "flux",          { stroke: "#d97706" }),
  mkEdge("scomponent-ada",      "s-component",   "ada",           { stroke: "#d97706" }),
  mkEdge("sstory-sage",         "s-storybook",   "sage",          { stroke: "#d97706" }),
  mkEdge("sdeploy-ship",        "s-deploy",      "ship",          { stroke: "#d97706" }),
  mkEdge("sdrift-scout",        "s-drift",       "scout",         { stroke: "#d97706" }),
  mkEdge("ssync-flux",          "s-sync-figma",  "flux",          { stroke: "#d97706" }),

  mkEdge("ada-contract",        "ada",           "contract",      { stroke: "#2563eb", strokeWidth: 1.5 }),
  mkEdge("flux-contract",       "flux",          "contract",      { stroke: "#2563eb", strokeWidth: 1.5 }),
  mkEdge("scout-contract",      "scout",         "contract",      { stroke: "#2563eb" }),
  mkEdge("sage-contract",       "sage",          "contract",      { stroke: "#2563eb" }),

  mkEdge("ada-components",      "ada",           "components",    { stroke: "#2563eb" }),
  mkEdge("flux-bridge",         "flux",          "tokens-bridge", { stroke: "#2563eb" }),
  mkEdge("bridge-synk",         "tokens-bridge", "s-sync-figma",  { stroke: "#059669", strokeDasharray: "3 3" }),

  mkEdge("hermes-contract",     "hermes",        "contract",      { stroke: "#e11d48", strokeWidth: 2 }, true),

  mkEdge("contract-indexer",    "contract",      "mdx-indexer",   { stroke: "#475569" }),
  mkEdge("indexer-quality",     "mdx-indexer",   "quality",       { stroke: "#475569" }),
  mkEdge("quality-hitl",        "quality",       "hitl",          { stroke: "#475569", strokeDasharray: "3 3" }),
  mkEdge("contract-contractui", "contract",      "contract-ui",   { stroke: "#475569", strokeDasharray: "3 3" }),
  mkEdge("posthog-contract",    "posthog",       "contract",      { stroke: "#0891b2", strokeDasharray: "4 2", opacity: 0.35 }),

  mkEdge("hermes-claude",       "hermes",        "claude-code",   { stroke: "#0891b2", strokeWidth: 1.5 }),
  mkEdge("hermes-cursor",       "hermes",        "cursor",        { stroke: "#0891b2", strokeWidth: 1.5 }),
  mkEdge("hermes-posthog",      "hermes",        "posthog",       { stroke: "#0891b2", strokeDasharray: "3 3" }),
  mkEdge("deploy-posthog",      "s-deploy",      "posthog",       { stroke: "#0891b2", strokeDasharray: "4 2", opacity: 0.4 }),
  mkEdge("drift-posthog",       "s-drift",       "posthog",       { stroke: "#0891b2", strokeDasharray: "4 2", opacity: 0.4 }),
];

// ── Node metadata ──────────────────────────────────────────────────────────────

type NodeMeta = {
  desc: string;
  docHrefs?: { label: string; href: string }[];
  command?: string;
};

const NODE_META: Record<string, NodeMeta> = {
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
    desc: "Local LLM running via Ollama (hermes3 model, http://localhost:11434). Invoked by prompt files to author MDX contracts — it reads source data (token values, usage counts, screenshot paths) and writes the frontmatter + rationale prose back to contract/tokens/ and contract/components/.",
    docHrefs: [
      { label: "Introduction →", href: "/docs/introduction" },
      { label: "Skills library →", href: "/docs/skills" },
    ],
  },
  "quality": {
    desc: "Quality score (0–100%) from resolved token ratio, source coverage, and completeness. Below 80%, MCP server won't start.",
    docHrefs: [{ label: "Quality Score →", href: "/docs/concepts/quality-score" }],
  },
  "hitl": {
    desc: "Human-in-the-loop checkpoint. Agent pauses here when a decision — token conflict, deploy approval — requires human review. Implemented via .pending.json sidecar files; CLI presents a Y/N prompt; HITL_AUTO_APPROVE=1 for CI.",
    docHrefs: [{ label: "Drift & Reconciliation →", href: "/docs/concepts/drift" }],
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
    desc: "Product analytics — three event streams: /deploy sends a release annotation (timestamp + quality score at ship time); /drift-report sends the quality score metric for trending; Hermes sends operational skill-run events (counts, durations).",
    docHrefs: [{ label: "Architecture →", href: "/graph" }],
  },
};

// ── Node detail panel ──────────────────────────────────────────────────────────

const TYPE_LABEL: Record<NType, string> = {
  source:   "source",
  skill:    "skill",
  agent:    "agent",
  artifact: "artifact",
  infra:    "infra",
  concept:  "concept",
  tool:     "tool",
};

function CopyBtn({ text, isDark }: { text: string; isDark: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded border transition-colors ${
        isDark
          ? "border-white/10 text-white/40 hover:text-white/70 hover:border-white/20"
          : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
      }`}
    >
      {copied ? "✓ copied" : "copy"}
    </button>
  );
}

function NodeInfoPanel({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const node = BASE_NODES.find(n => n.id === nodeId);
  const meta = NODE_META[nodeId];
  if (!node || !meta) return null;

  const { ntype, sub } = node.data;
  const col = (isDark ? TYPE_COLOR_DARK : TYPE_COLOR_LIGHT)[ntype];
  const label = node.data.label;
  const skillPrompt = meta.command
    ? (pipelineSkills.find(s => s.command === meta.command)?.promptContent ?? meta.command)
    : undefined;

  return (
    <div
      className="w-56 rounded-xl p-3.5"
      style={{
        background: isDark ? "rgba(8,8,22,0.92)" : "rgba(255,255,255,0.97)",
        backdropFilter: "blur(16px)",
        border: `1px solid ${col.stroke}40`,
        boxShadow: isDark ? undefined : "0 4px 20px rgba(0,0,0,0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-start gap-2 min-w-0">
          <svg width={8} height={8} className="mt-1 shrink-0">
            <circle cx={4} cy={4} r={3.5} fill={col.fill} stroke={col.stroke} strokeWidth={1.5} />
          </svg>
          <div className="min-w-0">
            <p className={`text-[11px] font-mono font-semibold leading-tight ${isDark ? "text-white/80" : "text-foreground"}`}>
              {label}
            </p>
            {sub && (
              <p className={`text-[10px] font-mono mt-0.5 ${isDark ? "text-white/30" : "text-muted-foreground"}`}>
                {sub}
              </p>
            )}
            <p className="text-[9px] font-mono uppercase tracking-widest mt-0.5" style={{ color: col.stroke }}>
              {TYPE_LABEL[ntype]}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className={`shrink-0 text-[11px] leading-none mt-0.5 p-1 -mr-1 -mt-0.5 transition-opacity ${
            isDark ? "text-white/20 active:text-white/60" : "text-muted-foreground/40 active:text-muted-foreground"
          }`}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Description */}
      <p className={`text-[11px] leading-relaxed font-mono mb-3 ${isDark ? "text-white/45" : "text-muted-foreground"}`}>
        {meta.desc}
      </p>

      {/* Command copy (skills only) */}
      {meta.command && (
        <div
          className={`flex items-center gap-2 mb-2.5 p-2 rounded-lg border ${
            isDark ? "border-white/6 bg-white/3" : "border-border/40 bg-muted/30"
          }`}
        >
          <code className="text-[11px] font-mono flex-1" style={{ color: col.text }}>
            {meta.command}
          </code>
          <CopyBtn text={skillPrompt ?? meta.command!} isDark={isDark} />
        </div>
      )}

      {/* Doc links */}
      {meta.docHrefs && meta.docHrefs.length > 0 && (
        <div className="flex flex-col gap-1">
          {meta.docHrefs.map(({ label: linkLabel, href }) => (
            <a
              key={href}
              href={href}
              className={`text-[10px] font-mono transition-colors ${
                isDark ? "text-white/25 hover:text-white/55" : "text-muted-foreground/50 hover:text-muted-foreground"
              }`}
            >
              {linkLabel}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SystemGraph() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const graphBg   = isDark ? "#080812" : "#f8fafc";
  const dotColor  = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)";
  const hintColor = isDark ? "text-white/15" : "text-muted-foreground/30";

  const adjacentIds = useMemo(() => {
    if (!selectedId) return new Set<string>();
    return new Set(
      BASE_EDGES.flatMap(e =>
        e.source === selectedId ? [e.target] :
        e.target === selectedId ? [e.source] : []
      )
    );
  }, [selectedId]);

  const nodes = useMemo(() =>
    BASE_NODES.map(node => ({
      ...node,
      data: {
        ...node.data,
        dimmed: selectedId !== null && node.id !== selectedId && !adjacentIds.has(node.id),
      },
    })),
    [selectedId, adjacentIds]
  );

  const edges = useMemo(() =>
    BASE_EDGES.map(edge => {
      const active = edge.source === selectedId || edge.target === selectedId;
      const faded  = selectedId !== null && !active;
      return {
        ...edge,
        style: {
          ...edge.style,
          opacity: faded ? 0.04 : selectedId !== null ? 0.9 : (edge.style?.opacity ?? 0.3),
          strokeWidth: active ? (Number(edge.style?.strokeWidth ?? 1)) + 0.5 : Number(edge.style?.strokeWidth ?? 1),
        },
      };
    }),
    [selectedId]
  );

  return (
    <div className="w-full h-full relative" style={{ background: graphBg }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodeClick={(_, node) => setSelectedId(prev => prev === node.id ? null : node.id)}
        onPaneClick={() => setSelectedId(null)}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        minZoom={0.4}
        maxZoom={2.5}
        colorMode={isDark ? "dark" : "light"}
        style={{ background: graphBg }}
        proOptions={{ hideAttribution: false }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1}
          color={dotColor}
          style={{ background: graphBg }}
        />
      </ReactFlow>

      {selectedId && (
        <div className="absolute top-3 right-3 z-10">
          <NodeInfoPanel nodeId={selectedId} onClose={() => setSelectedId(null)} />
        </div>
      )}

      <div className="absolute bottom-5 right-5 z-10">
        <p className={`text-[10px] font-mono ${hintColor}`}>
          tap to inspect · pinch to zoom · drag to pan
        </p>
      </div>
    </div>
  );
}

// ── Legend ─────────────────────────────────────────────────────────────────────

export function GraphLegend() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const TYPE_COLOR = isDark ? TYPE_COLOR_DARK : TYPE_COLOR_LIGHT;

  const entries: [NType, string][] = [
    ["source",   "Data source"],
    ["skill",    "Skill (slash command)"],
    ["agent",    "Agent / runtime"],
    ["artifact", "Artifact"],
    ["infra",    "Infrastructure"],
    ["concept",  "Concept / UI"],
    ["tool",     "AI tool"],
  ];

  return (
    <div className={`flex flex-col gap-1.5 p-3 rounded-xl border backdrop-blur-sm ${
      isDark
        ? "border-white/5 bg-black/40"
        : "border-border/50 bg-background/90 shadow-sm"
    }`}>
      {entries.map(([type, label]) => (
        <div key={type} className="flex items-center gap-2">
          <svg width={12} height={12}>
            <circle cx={6} cy={6} r={5} fill={TYPE_COLOR[type].fill} stroke={TYPE_COLOR[type].stroke} strokeWidth={1.5} />
          </svg>
          <span className={`text-[10px] font-mono ${isDark ? "text-white/40" : "text-muted-foreground"}`}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
