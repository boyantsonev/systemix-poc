// graph-data.ts — the real Systemix architecture, as a force-directed graph.
//
// This is the SINGLE SOURCE OF TRUTH for the /graph 3D visualisation. Unlike the
// prototype's sample data, every node here is a real entity in this repo:
//   • sources    — where design/code truth originates
//   • skills      — the slash commands in src/lib/data/pipeline.ts +
//                   packages/cli/pipelines/{design-system,figma-to-code,hypothesis-validation}/skills
//   • agents      — the runtimes that execute skills (pipeline.ts, components.ts, docs.ts, brands.ts)
//   • artifacts   — files the agents read/write (contracts, bridge, config, queue)
//   • infra       — packages/* + supabase + the MDX indexer
//   • concept/UI  — the app surfaces, INCLUDING this graph itself and the /docs page
//   • tools       — the AI tools + external services in the loop
//
// The graph is self-referential by design: `ui-graph` (this page) and `ui-docs`
// are concept-UI nodes. Node `val` controls render size (hubs are larger).

export type NodeType =
  | "source"
  | "skill"
  | "agent"
  | "artifact"
  | "infra"
  | "concept"
  | "tool";

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  val: number;
  desc: string;
  sub?: string;
  /** Slash command (skills only). */
  cmd?: string;
  /** Optional doc deep-links surfaced in the node panel. */
  docHrefs?: { label: string; href: string }[];
}

export interface GraphLink {
  source: string;
  target: string;
}

const D = (href: string, label = "Docs →") => ({ label, href });

export const GRAPH_NODES: GraphNode[] = [
  // ── Sources ────────────────────────────────────────────────────────────────
  { id: "figma", label: "Figma", type: "source", val: 3, sub: "Design source",
    desc: "Figma file — source of design variables, component specs, and variant definitions. Read via the official Figma REST MCP; written via the Figma Console MCP.",
    docHrefs: [D("/docs/concepts/figma-mcps", "Figma MCPs →")] },
  { id: "css-globals", label: "CSS / Globals", type: "source", val: 2.5, sub: "Token source",
    desc: "globals.css — oklch CSS custom properties that define the code-side token values. The canonical code source of truth." },
  { id: "storybook", label: "Storybook", type: "source", val: 2, sub: "Component source",
    desc: "Rendered component library — the source of truth for component states, stories, and screenshots." },

  // ── Skills · design / figma-to-code pipeline ────────────────────────────────
  { id: "s-figma", label: "/figma", type: "skill", val: 1.5, cmd: "/figma",
    desc: "Extract design context — tokens, layout, variants — from any Figma URL. Run first before generating components.",
    docHrefs: [D("/docs/skills", "Skills library →")] },
  { id: "s-tokens", label: "/tokens", type: "skill", val: 1.5, cmd: "/tokens",
    desc: "Diff Figma variables against the CSS token file. Shows Added / Changed / Removed before writing.",
    docHrefs: [D("/docs/skills", "Skills library →")] },
  { id: "s-component", label: "/component", type: "skill", val: 1.5, cmd: "/component",
    desc: "Generate a production React TypeScript component + Storybook story from a Figma URL.",
    docHrefs: [D("/docs/skills", "Skills library →")] },
  { id: "s-storybook", label: "/storybook", type: "skill", val: 1.5, cmd: "/storybook",
    desc: "Read, verify, and update Storybook stories. Compares against the Figma spec and reports drift.",
    docHrefs: [D("/docs/skills", "Skills library →")] },
  { id: "s-deploy", label: "/deploy", type: "skill", val: 1.5, cmd: "/deploy",
    desc: "Build the project and deploy a preview to Vercel. Returns a preview URL.",
    docHrefs: [D("/docs/skills", "Skills library →")] },
  { id: "s-drift", label: "/drift-report", type: "skill", val: 1.5, cmd: "/drift-report",
    desc: "Audit the codebase for hardcoded values that should be tokens. Produces a severity-graded report.",
    docHrefs: [D("/docs/concepts/drift", "Drift →")] },
  { id: "s-sync-figma", label: "/sync-to-figma", type: "skill", val: 1.5, cmd: "/sync-to-figma",
    desc: "Push CSS token values back into Figma variables. Reverse of /tokens — use when code is the source.",
    docHrefs: [D("/docs/skills", "Skills library →")] },
  { id: "s-sync-docs", label: "/sync-docs", type: "skill", val: 1.5, cmd: "/sync-docs",
    desc: "Regenerate the living docs registry from component/token/brand data. Assigns stale/drifted/missing/current status behind a HITL gate.",
    docHrefs: [D("/docs/skills", "Skills library →")] },
  { id: "s-apply-theme", label: "/apply-theme", type: "skill", val: 1.5, cmd: "/apply-theme",
    desc: "Apply a client brand via token overrides only — no component changes. Generates a theme CSS file and reports coverage." },
  { id: "s-style-match", label: "/style-match", type: "skill", val: 1.5, cmd: "/style-match",
    desc: "Scrape a live URL's visual identity and propose a globals.css diff to match it, each change as a Hermes contract entry." },
  { id: "s-check-parity", label: "/check-parity", type: "skill", val: 1.5, cmd: "/check-parity",
    desc: "Compare rendered code against the Figma spec and report pixel/token parity gaps." },
  { id: "s-connect", label: "/connect", type: "skill", val: 1.5, cmd: "/connect",
    desc: "Link Figma components to codebase components via Code Connect (official Figma MCP)." },

  // ── Skills · orchestrators ──────────────────────────────────────────────────
  { id: "s-sync", label: "/sync", type: "skill", val: 2, cmd: "/sync",
    desc: "Orchestrate the full design↔code sync loop — pull tokens, convert, push Variables, report drift — in one command." },
  { id: "s-design-to-code", label: "/design-to-code", type: "skill", val: 2, cmd: "/design-to-code",
    desc: "Full pipeline: Figma → component → story → deploy, reading and writing the contract at each step." },

  // ── Skills · hypothesis-validation pipeline ─────────────────────────────────
  { id: "s-hypothesis", label: "/hypothesis", type: "skill", val: 1.5, cmd: "/hypothesis",
    desc: "Create a structured hypothesis contract — ICP, section, variant copy — at definition time.",
    docHrefs: [D("/docs/concepts/hypothesis-validation", "Hypothesis →")] },
  { id: "s-init-exp", label: "/init-experiment", type: "skill", val: 1.5, cmd: "/init-experiment",
    desc: "Write a new hypothesis contract in contract/hypotheses/ and register the experiment as running." },
  { id: "s-measure", label: "/measure", type: "skill", val: 1.5, cmd: "/measure",
    desc: "Add instrumentation — connect variant structure to PostHog event names." },
  { id: "s-experiment", label: "/experiment", type: "skill", val: 1.5, cmd: "/experiment",
    desc: "Set up the A/B test wiring for a registered hypothesis." },
  { id: "s-write-variants", label: "/write-variants", type: "skill", val: 1.5, cmd: "/write-variants",
    desc: "Generate and implement variant copy/UI calibrated to the ICP for a running experiment." },
  { id: "s-evidence", label: "/evidence", type: "skill", val: 1.5, cmd: "/evidence",
    desc: "Pull experiment evidence from PostHog and attach it to the hypothesis contract.",
    docHrefs: [D("/docs/concepts/evidence-layer", "Evidence Layer →")] },
  { id: "s-growth-audit", label: "/growth-audit", type: "skill", val: 1.5, cmd: "/growth-audit",
    desc: "Audit running experiments against cached PostHog evidence and produce a prioritized decision brief." },
  { id: "s-close-exp", label: "/close-experiment", type: "skill", val: 1.5, cmd: "/close-experiment",
    desc: "Record result, decision, and confidence in the hypothesis contract; push a synthesis card to the HITL queue." },
  { id: "s-hermes", label: "/hermes", type: "skill", val: 1.5, cmd: "/hermes",
    desc: "Trigger Hermes to synthesize a contract's evidence against prior decisions and queue a HITL recommendation.",
    docHrefs: [D("/docs/concepts/hermes", "Hermes →")] },

  // ── Agents ──────────────────────────────────────────────────────────────────
  { id: "ada", label: "Figma → Code", type: "agent", val: 2.5, sub: "Ada",
    desc: "Translates Figma designs into production React components. Invoked by /figma and /component.",
    docHrefs: [D("/docs/skills", "Skills library →")] },
  { id: "flux", label: "Token Sync", type: "agent", val: 2.5, sub: "Flux",
    desc: "Keeps Figma variables and CSS token files in lock-step. Runs both /tokens and /sync-to-figma directions.",
    docHrefs: [D("/docs/skills", "Skills library →")] },
  { id: "scout", label: "Drift Detector", type: "agent", val: 2, sub: "Scout",
    desc: "Audits the codebase for design-code drift — hardcoded hex, px spacing, token mismatches.",
    docHrefs: [D("/docs/concepts/drift", "Drift →")] },
  { id: "sage", label: "Storybook", type: "agent", val: 2, sub: "Sage",
    desc: "Reads and verifies Storybook stories against Figma specs; generates missing stories." },
  { id: "ship", label: "Deploy", type: "agent", val: 2, sub: "Ship",
    desc: "Builds the project and deploys to Vercel; auto-fixes build errors before shipping." },
  { id: "themer", label: "Component Themer", type: "agent", val: 2, sub: "component-themer",
    desc: "Applies client brands as layered token overrides (primitive/semantic/component) without touching components. Writes brands.ts." },
  { id: "docsync", label: "Doc Sync", type: "agent", val: 2, sub: "doc-sync",
    desc: "Regenerates the docs registry from live component/token/brand data and gates writes behind HITL." },
  { id: "hermes", label: "Hermes", type: "agent", val: 3.5, sub: "Ollama / local",
    desc: "Local LLM (Ollama hermes3). Authors MDX contracts on change, polls PostHog, and synthesizes evidence into HITL decisions or direct contract write-backs.",
    docHrefs: [D("/docs/concepts/hermes", "Hermes →"), D("/docs/concepts/evidence-layer", "Evidence Layer →")] },

  // ── Artifacts ───────────────────────────────────────────────────────────────
  { id: "contract", label: "MDX Contracts", type: "artifact", val: 3.5,
    desc: "One MDX file per token, component, and hypothesis. YAML frontmatter stores status, figma-value, delta-e, decisions, and evidence. The canonical truth agents read before acting.",
    docHrefs: [D("/docs/concepts/contract", "Contract →")] },
  { id: "tokens-bridge", label: "tokens.bridge", type: "artifact", val: 1.5,
    desc: "tokens.bridge.json — CSS tokens pre-converted to hex/rgba for the Figma API. Intermediate artifact used by /sync-to-figma." },
  { id: "components", label: "Components", type: "artifact", val: 2,
    desc: "Generated React components with TypeScript types and Storybook stories, written to src/components/." },
  { id: "brands", label: "Brands / Themes", type: "artifact", val: 1.5,
    desc: "brands.ts — per-client layered token overrides + coverage, written by the component-themer agent." },
  { id: "config", label: "systemix.config.yaml", type: "artifact", val: 2,
    desc: "The embedded-instance manifest — surfaces, signals, autonomy, self-improvement. Written by `npx systemix init`; drives the /instance topology." },
  { id: "queue-json", label: "queue.json", type: "artifact", val: 2, sub: "HITL queue",
    desc: ".systemix/queue.json — the file-based HITL task queue Hermes appends to and humans resolve in /queue.",
    docHrefs: [D("/docs/concepts/hitl", "HITL →")] },

  // ── Infrastructure ──────────────────────────────────────────────────────────
  { id: "mcp-server", label: "Systemix MCP", type: "infra", val: 2.5, sub: "packages/mcp-server",
    desc: "Systemix's own MCP server — exposes contract, token-bridge, workflow, and HITL queue tools so AI agents query verified ground truth." },
  { id: "mcp-proxy", label: "TokenGuard Proxy", type: "infra", val: 2, sub: "packages/mcp-proxy",
    desc: "Token-budget MCP proxy — pre-fetch, cache, and budget enforcement for Figma MCP workflows." },
  { id: "github-action", label: "GitHub Action", type: "infra", val: 1.5, sub: "packages/github-action",
    desc: "verolab/systemix-action — dry-run token-budget enforcement and sync checks in CI." },
  { id: "cli", label: "Systemix CLI", type: "infra", val: 2, sub: "npx systemix",
    desc: "Install + run surface — `npx systemix init` embeds an instance into a client repo (skills, config, contract)." },
  { id: "figma-plugin", label: "Figma Plugin", type: "infra", val: 1.5, sub: "packages/figma-plugin",
    desc: "In-Figma plugin surface for the design-side of the sync loop." },
  { id: "supabase", label: "Supabase", type: "infra", val: 2, sub: "RLS multi-tenant",
    desc: "Optional control plane — projects/members RBAC, row-level security, realtime on events / hitl_tasks / agent_states / sync_log." },
  { id: "mdx-indexer", label: "MDX Indexer", type: "infra", val: 2,
    desc: "Indexes all MDX contracts at build time, parses frontmatter, and computes the quality score via CIEDE2000 perceptual distance.",
    docHrefs: [D("/docs/concepts/quality-score", "Quality Score →")] },

  // ── Concept / UI (incl. this graph + the docs page) ─────────────────────────
  { id: "ui-graph", label: "/graph", type: "concept", val: 2.5, sub: "this diagram",
    desc: "The 3D architecture graph you are looking at — a self-referential map of the Systemix system rendered from this dataset." },
  { id: "ui-docs", label: "/docs", type: "concept", val: 2.5, sub: "living styleguide",
    desc: "The self-updating documentation surface. Regenerated by the doc-sync loop from component/token/brand data — the most legible thing a client is paying for." },
  { id: "ui-dashboard", label: "/dashboard", type: "concept", val: 2,
    desc: "Overview surface — quality score, active runs, recent events." },
  { id: "ui-queue", label: "/queue", type: "concept", val: 2, sub: "HITL UI",
    desc: "Human-in-the-loop review surface — renders queue.json cards (drift, instrumentation, hypothesis) for approval." },
  { id: "ui-contract", label: "/contract", type: "concept", val: 2,
    desc: "Contract browser — quality score, token/component index, and per-slug detail with ΔE indicators and resolve controls.",
    docHrefs: [D("/docs/concepts/contract", "Contract →")] },
  { id: "ui-design-system", label: "/design-system", type: "concept", val: 2,
    desc: "Design-system workspace — components, tokens, hypotheses, and decisions views." },
  { id: "quality", label: "Quality Score", type: "concept", val: 1.5,
    desc: "Composite 0–100% from resolved-token ratio, source coverage, and completeness. Below 80%, the MCP server won't start.",
    docHrefs: [D("/docs/concepts/quality-score", "Quality Score →")] },
  { id: "evidence-layer", label: "Evidence Layer", type: "concept", val: 1.5,
    desc: "The principle that evidence is permanently co-located with the artifact it describes — read by any later actor, human or agent.",
    docHrefs: [D("/docs/concepts/evidence-layer", "Evidence Layer →")] },
  { id: "hitl", label: "Decision Queue", type: "concept", val: 2, sub: "HITL",
    desc: "The human-in-the-loop gate. Hermes surfaces drift-resolution, instrumentation-approval, and hypothesis-validation cards; every approval writes back to the contract.",
    docHrefs: [D("/docs/concepts/hitl", "HITL →")] },
  { id: "drift", label: "Drift", type: "concept", val: 1.5,
    desc: "The gap between design and code. Detected by Scout, classified imperceptible (ΔE<2) vs real by the indexer.",
    docHrefs: [D("/docs/concepts/drift", "Drift →")] },

  // ── AI tools / external services ────────────────────────────────────────────
  { id: "claude-code", label: "Claude Code", type: "tool", val: 2,
    desc: "Anthropic's AI coding assistant. Reads the contract via the Systemix MCP before writing components or modifying tokens.",
    docHrefs: [D("/docs/quick-install", "Quick Install →")] },
  { id: "cursor", label: "Cursor", type: "tool", val: 2,
    desc: "AI code editor. Queries verified token values and component specs via the Systemix MCP before generating code." },
  { id: "ollama", label: "Ollama", type: "tool", val: 1.5, sub: "hermes3 · local",
    desc: "Local model runtime (localhost:11434) that powers Hermes — no data leaves the machine." },
  { id: "posthog", label: "PostHog", type: "tool", val: 2, sub: "Analytics / EU",
    desc: "Production evidence source. Hermes polls experiment results and synthesizes them against contract history.",
    docHrefs: [D("/docs/concepts/evidence-layer", "Evidence Layer →")] },
  { id: "vercel", label: "Vercel", type: "tool", val: 1.5, sub: "Deploy target",
    desc: "Preview + production deploys. /deploy ships here; /deploy-annotate posts the URL back to Figma." },
  { id: "figma-mcp", label: "Figma MCPs", type: "tool", val: 2, sub: "REST + Console",
    desc: "The Figma bridge — official REST MCP (read) + Console MCP (write variables/nodes). Used by the design-loop skills.",
    docHrefs: [D("/docs/concepts/figma-mcps", "Figma MCPs →")] },
];

export const GRAPH_LINKS: GraphLink[] = [
  // Sources → skills (what each skill reads)
  { source: "figma", target: "s-figma" },
  { source: "figma", target: "s-tokens" },
  { source: "figma", target: "s-component" },
  { source: "figma", target: "s-check-parity" },
  { source: "figma", target: "s-connect" },
  { source: "css-globals", target: "s-tokens" },
  { source: "css-globals", target: "s-drift" },
  { source: "css-globals", target: "s-sync-figma" },
  { source: "css-globals", target: "s-sync-docs" },
  { source: "css-globals", target: "s-style-match" },
  { source: "storybook", target: "s-storybook" },

  // Skills → agents (which agent runs it)
  { source: "s-figma", target: "ada" },
  { source: "s-component", target: "ada" },
  { source: "s-connect", target: "ada" },
  { source: "s-design-to-code", target: "ada" },
  { source: "s-tokens", target: "flux" },
  { source: "s-sync-figma", target: "flux" },
  { source: "s-sync", target: "flux" },
  { source: "s-drift", target: "scout" },
  { source: "s-check-parity", target: "scout" },
  { source: "s-storybook", target: "sage" },
  { source: "s-deploy", target: "ship" },
  { source: "s-apply-theme", target: "themer" },
  { source: "s-style-match", target: "themer" },
  { source: "s-sync-docs", target: "docsync" },
  { source: "s-hermes", target: "hermes" },
  { source: "s-evidence", target: "hermes" },
  { source: "s-growth-audit", target: "hermes" },
  { source: "s-close-exp", target: "hermes" },

  // Hypothesis skills → contract (they define/measure into contracts)
  { source: "s-hypothesis", target: "contract" },
  { source: "s-init-exp", target: "contract" },
  { source: "s-measure", target: "contract" },
  { source: "s-experiment", target: "contract" },
  { source: "s-write-variants", target: "contract" },
  { source: "s-write-variants", target: "components" },

  // Agents → artifacts (what they write)
  { source: "ada", target: "components" },
  { source: "ada", target: "contract" },
  { source: "flux", target: "tokens-bridge" },
  { source: "flux", target: "contract" },
  { source: "scout", target: "contract" },
  { source: "sage", target: "contract" },
  { source: "themer", target: "brands" },
  { source: "themer", target: "contract" },
  { source: "docsync", target: "contract" },
  { source: "hermes", target: "contract" },
  { source: "hermes", target: "queue-json" },

  // Artifacts → surfaces / indexer (what renders them)
  { source: "tokens-bridge", target: "figma" },
  { source: "contract", target: "mdx-indexer" },
  { source: "contract", target: "ui-contract" },
  { source: "contract", target: "ui-docs" },
  { source: "components", target: "ui-docs" },
  { source: "components", target: "ui-design-system" },
  { source: "brands", target: "ui-design-system" },
  { source: "queue-json", target: "ui-queue" },
  { source: "queue-json", target: "hitl" },
  { source: "config", target: "ui-graph" },
  { source: "config", target: "cli" },

  // Infrastructure relationships
  { source: "mdx-indexer", target: "quality" },
  { source: "mdx-indexer", target: "ui-contract" },
  { source: "mdx-indexer", target: "ui-dashboard" },
  { source: "mcp-server", target: "contract" },
  { source: "mcp-server", target: "queue-json" },
  { source: "mcp-proxy", target: "mcp-server" },
  { source: "github-action", target: "mcp-proxy" },
  { source: "cli", target: "config" },
  { source: "figma-plugin", target: "figma" },
  { source: "supabase", target: "ui-dashboard" },
  { source: "supabase", target: "queue-json" },

  // Concepts
  { source: "quality", target: "ui-dashboard" },
  { source: "quality", target: "hitl" },
  { source: "evidence-layer", target: "contract" },
  { source: "evidence-layer", target: "posthog" },
  { source: "hitl", target: "ui-queue" },
  { source: "hitl", target: "contract" },
  { source: "drift", target: "scout" },
  { source: "drift", target: "ui-contract" },

  // Tools
  { source: "claude-code", target: "mcp-server" },
  { source: "cursor", target: "mcp-server" },
  { source: "ollama", target: "hermes" },
  { source: "posthog", target: "hermes" },
  { source: "posthog", target: "evidence-layer" },
  { source: "vercel", target: "ship" },
  { source: "figma-mcp", target: "figma" },
  { source: "figma-mcp", target: "s-figma" },
  { source: "figma-mcp", target: "s-sync-figma" },

  // The two surfaces the founder named explicitly, tied to the system they show
  { source: "ui-graph", target: "ui-docs" },
  { source: "ui-docs", target: "s-sync-docs" },
];
