// AGENT-WRITTEN — pipeline.ts
// Updated by: all agents on completion

import type { Skill } from "@/lib/types/skill";
export type { Skill } from "@/lib/types/skill";

export type AgentStatus = "idle" | "running" | "success" | "error";
export type RunStatus = "success" | "failure" | "running";

// ── Workflow run state (managed client-side in WorkflowBuilder) ───────────

export type WorkflowStepStatus =
  | "pending"
  | "running"
  | "done"
  | "error"
  | "awaiting-approval"
  | "approved"
  | "rejected";

export type WorkflowStep = {
  nodeId: string;
  status: WorkflowStepStatus;
  startedAt?: number;
  completedAt?: number;
  log: string[];
  requiresApproval?: boolean;
};

export type WorkflowRun = {
  id: string;
  workflowId: string;
  startedAt: number;
  completedAt?: number;
  steps: WorkflowStep[];
  overallStatus: "running" | "done" | "error" | "awaiting-approval";
};

export type AgentRun = {
  id: string;
  agent: string;
  command: string;
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  summary: string;
  filesChanged?: number;
};

export type AgentState = {
  name: string;
  displayName: string;
  status: AgentStatus;
  lastRun?: string;
  nextScheduled?: string;
  runsTotal: number;
  runsSuccess: number;
  description: string;
};

type LegacySkill = {
  command: string;
  name: string;
  description: string;
  file: string;
  triggersAgent?: string;
  promptContent: string;
};

export type AgentDefinition = {
  name: string;
  displayName: string;
  description: string;
  triggerSkill: string;
  reads: string[];
  writes: string[];
  memoryPath: string;
  capabilities: string[];
  exampleInvocations: string[];
  mcpServers?: string[];      // MCP servers this agent uses
};

// ── HITL task ─────────────────────────────────────────────────────────────────

export type HitlTaskType =
  | "token-diff"
  | "code-review"
  | "drift-report"
  | "docs-review"
  | "deploy-preview"
  | "storybook-verify";

export type HitlTask = {
  id: string;
  agentId: string;
  skill: string;
  skillColor: string;
  title: string;
  type: HitlTaskType;
  description: string;
  priority: "high" | "medium" | "low";
  createdAt: string;
  meta?: Record<string, string | number>;
};

// ── Feed event ────────────────────────────────────────────────────────────────

export type FeedEventType =
  | "thinking"
  | "tool-call"
  | "tool-result"
  | "file-read"
  | "file-write"
  | "step-start"
  | "step-done"
  | "awaiting-hitl"
  | "message"
  | "error";

export type FeedEvent = {
  id: string;
  agentId: string;
  skill: string;
  skillColor: string;
  type: FeedEventType;
  content: string;
  subContent?: string;
  toolName?: string;
  mcpServer?: string;
  step?: number;
  totalSteps?: number;
  isActive?: boolean;
  timestamp: string;
};

export const agentRuns: AgentRun[] = [
  {
    id: "run-001",
    agent: "token-sync",
    command: "/tokens",
    status: "success",
    startedAt: "2026-02-26T09:45:00Z",
    completedAt: "2026-02-26T09:47:23Z",
    durationMs: 143000,
    summary: "Synced 174 tokens from Figma. 4 new tokens detected. 8 drift instances flagged.",
    filesChanged: 3,
  },
  {
    id: "run-002",
    agent: "design-drift-detector",
    command: "/drift-report",
    status: "success",
    startedAt: "2026-02-26T08:30:00Z",
    completedAt: "2026-02-26T08:34:12Z",
    durationMs: 252000,
    summary: "Audited 42 components. Drift score: 12. 7 critical instances found across Badge, Table.",
    filesChanged: 1,
  },
  {
    id: "run-003",
    agent: "figma-to-code",
    command: "/figma",
    status: "success",
    startedAt: "2026-02-25T16:20:00Z",
    completedAt: "2026-02-25T16:23:44Z",
    durationMs: 224000,
    summary: "Generated Progress component from Figma node 15:892. Status set to New.",
    filesChanged: 2,
  },
  {
    id: "run-004",
    agent: "component-themer",
    command: "/apply-theme",
    status: "success",
    startedAt: "2026-02-25T14:00:00Z",
    completedAt: "2026-02-25T14:02:58Z",
    durationMs: 178000,
    summary: "Applied Finova theme. 5 tokens overridden. Coverage: 94%. Tabs component not covered.",
    filesChanged: 1,
  },
  {
    id: "run-005",
    agent: "token-sync",
    command: "/tokens",
    status: "success",
    startedAt: "2026-02-24T18:00:00Z",
    completedAt: "2026-02-24T18:02:10Z",
    durationMs: 130000,
    summary: "Synced 170 tokens. No new tokens. 2 drift instances resolved.",
    filesChanged: 2,
  },
  {
    id: "run-006",
    agent: "design-drift-detector",
    command: "/drift-report",
    status: "failure",
    startedAt: "2026-02-23T10:00:00Z",
    completedAt: "2026-02-23T10:00:45Z",
    durationMs: 45000,
    summary: "Error: Figma API token expired. Refresh FIGMA_TOKEN in environment.",
    filesChanged: 0,
  },
  {
    id: "run-007",
    agent: "component-themer",
    command: "/apply-theme verdure",
    status: "success",
    startedAt: "2026-02-22T11:00:00Z",
    completedAt: "2026-02-22T11:03:22Z",
    durationMs: 202000,
    summary: "Scaffolded Verdure theme. Coverage: 78%. Badge and Input not yet covered.",
    filesChanged: 1,
  },
  {
    id: "run-008",
    agent: "figma-to-code",
    command: "/figma",
    status: "success",
    startedAt: "2026-02-20T14:30:00Z",
    completedAt: "2026-02-20T14:34:01Z",
    durationMs: 241000,
    summary: "Generated Tooltip component from Figma node 11:234. All tokens mapped.",
    filesChanged: 2,
  },
  {
    id: "run-009",
    agent: "token-sync",
    command: "/tokens",
    status: "success",
    startedAt: "2026-02-19T09:00:00Z",
    completedAt: "2026-02-19T09:01:55Z",
    durationMs: 115000,
    summary: "Synced 168 tokens. 1 removed token confirmed by user.",
    filesChanged: 2,
  },
  {
    id: "run-010",
    agent: "design-drift-detector",
    command: "/drift-report src/components/ui/table.tsx",
    status: "success",
    startedAt: "2026-02-18T16:00:00Z",
    completedAt: "2026-02-18T16:02:08Z",
    durationMs: 128000,
    summary: "Table component drift: 2 hardcoded values found. Score: 8/100.",
    filesChanged: 0,
  },
];

// ── BAST-103: canonical agent display mapping ─────────────────────────────────
export const AGENT_DISPLAY_MAP: Record<string, { displayName: string; technicalName: string; color: string }> = {
  Ada:   { displayName: "Figma → Code",    technicalName: "figma-to-code",          color: "var(--agent-ada)"   },
  Flux:  { displayName: "Token Sync",       technicalName: "token-sync",             color: "var(--agent-flux)"  },
  Scout: { displayName: "Drift Detector",   technicalName: "design-drift-detector",  color: "var(--agent-scout)" },
  Prism: { displayName: "Component Themer", technicalName: "component-themer",       color: "var(--agent-prism)" },
  Echo:  { displayName: "Doc Sync",         technicalName: "doc-sync",               color: "var(--agent-echo)"  },
  Sage:  { displayName: "Storybook",        technicalName: "storybook-agent",        color: "var(--agent-sage)"  },
  Ship:  { displayName: "Deploy",           technicalName: "deploy-agent",           color: "var(--agent-ship)"  },
};

export function getAgentDisplayInfo(nameOrPersona: string) {
  // Try direct persona lookup first
  if (AGENT_DISPLAY_MAP[nameOrPersona]) return AGENT_DISPLAY_MAP[nameOrPersona];
  // Fall back to technical name lookup
  return Object.values(AGENT_DISPLAY_MAP).find(a => a.technicalName === nameOrPersona) ?? null;
}

// TODO: replace with live read from .systemix/agent-state.json via API route (BAST-55)
export const agentStates: AgentState[] = [
  {
    name: "doc-sync",
    displayName: "Doc Sync",
    status: "idle",
    lastRun: "2026-02-26T09:48:00Z",
    nextScheduled: "2026-02-28T09:00:00Z",
    runsTotal: 14,
    runsSuccess: 14,
    description: "Reads all components, tokens, and brands. Generates and refreshes documentation entries in lib/data/docs.ts.",
  },
  {
    name: "figma-to-code",
    displayName: "Figma → Code",
    status: "running",
    lastRun: "2026-02-25T16:23:44Z",
    runsTotal: 18,
    runsSuccess: 17,
    description: "Reads Figma designs and generates production React components using project tokens.",
  },
  {
    name: "token-sync",
    displayName: "Token Sync",
    status: "idle",
    lastRun: "2026-02-26T09:47:23Z",
    nextScheduled: "2026-02-27T09:00:00Z",
    runsTotal: 24,
    runsSuccess: 24,
    description: "Diffs Figma variables against codebase token files and updates on change.",
  },
  {
    name: "design-drift-detector",
    displayName: "Drift Detector",
    status: "running",
    lastRun: "2026-02-26T08:34:12Z",
    nextScheduled: "2026-02-28T08:00:00Z",
    runsTotal: 31,
    runsSuccess: 29,
    description: "Audits entire codebase for hardcoded values, token drift, and structural gaps.",
  },
  {
    name: "component-themer",
    displayName: "Component Themer",
    status: "idle",
    lastRun: "2026-02-25T14:02:58Z",
    runsTotal: 12,
    runsSuccess: 12,
    description: "Assesses theme readiness and generates client brand theme override files.",
  },
  {
    name: "storybook-agent",
    displayName: "Storybook",
    status: "idle",
    lastRun: "2026-02-25T11:00:00Z",
    runsTotal: 8,
    runsSuccess: 8,
    description: "Reads component library via Storybook MCP. Generates and verifies stories against Figma spec.",
  },
  {
    name: "deploy-agent",
    displayName: "Deploy",
    status: "idle",
    lastRun: "2026-02-24T18:45:00Z",
    runsTotal: 6,
    runsSuccess: 5,
    description: "Builds the project and deploys Storybook preview to Vercel. Returns a preview URL.",
  },
];

export const skills: LegacySkill[] = [
  {
    command: "/sync-docs [scope]",
    name: "Sync Docs",
    description: "Read all components, tokens, and brands — generate or refresh all documentation entries in lib/data/docs.ts. Run after any agent write or manually to refresh.",
    file: "~/.claude/skills/sync-docs/SKILL.md",
    triggersAgent: "doc-sync",
    promptContent: `Sync all documentation entries in lib/data/docs.ts.\n\n## Instructions\n\nYou are executing the **Documentation sync** workflow. This keeps the /docs section of the Systemix dashboard in sync with the actual state of the design system.\n\n1. Read lib/data/components.ts, tokens.ts, and each source file.\n2. Diff against existing docs.ts entries — find stale, missing, and changed.\n3. Generate updated doc entries with props, tokens, summary, coverage score.\n4. HITL review: show what docs will be created/updated before writing.\n5. Write docs.ts with all updated entries.\n\n## Quality rules\n- Set status: drifted (has drift), draft (New component), stale (>7 days), current otherwise\n- Coverage score = % of props + tokens documented\n- writtenBy: "doc-sync", writtenAt: now, runId: current run ID`,
  },
  {
    command: "/figma [URL]",
    name: "Extract from Figma",
    description: "Extract design context, tokens, and screenshot from a Figma URL. First step in the workflow.",
    file: "~/.claude/skills/figma/SKILL.md",
    triggersAgent: "figma-to-code",
    promptContent: `Generate a production-ready UI component from a Figma design node.

## Instructions

You are executing the **Figma → Code generation** workflow.

1. **Get the Figma URL**: If the user provided a Figma URL or node ID after the command (\`$ARGUMENTS\`), use it. Otherwise ask: "Please paste the Figma node URL for the component you want to generate."

2. **Understand the target codebase**: Before generating, use Glob and Grep to scan the project for:
   - Framework (Next.js, Vite, Remix, etc.)
   - Component library (shadcn/ui, Radix, MUI, etc.)
   - Token/variable system (CSS custom properties, Tailwind config, JS tokens file)
   - Existing similar components to match patterns

3. **Fetch the design**: Use the Figma MCP \`get_design_context\` tool with the fileKey and nodeId extracted from the URL. Also call \`get_variable_defs\` to capture design tokens.

4. **Generate the component**: Adapt the Figma output to the project's actual stack — do not use raw hex colors or hardcoded spacing. Map all values to the project's token system. Reuse existing components where possible.

5. **Write the file**: Save the component to the appropriate location in the project structure, following existing naming conventions.

6. **Report**: Tell the user:
   - Where the file was saved
   - Which tokens/variables were used
   - Any design values that couldn't be mapped to tokens (potential drift risks)
   - Suggested next steps (e.g., run \`/drift-report\` to validate)

## Quality rules
- Never use hardcoded hex colors, px spacing, or font sizes — always use tokens
- Always use the project's existing component primitives first
- If a shadcn component covers the design intent, use it rather than building from scratch
- Include proper TypeScript types and prop definitions`,
  },
  {
    command: "/tokens [URL]",
    name: "Sync Tokens",
    description: "Diff Figma variables against your CSS token file. Shows Added / Changed / Removed before writing.",
    file: "~/.claude/skills/tokens/SKILL.md",
    triggersAgent: "token-sync",
    promptContent: `Sync Figma variables/tokens to the codebase token files.

## Instructions

You are executing the **Figma → Code token sync** workflow. This keeps your codebase tokens in lock-step with Figma variables, preventing drift.

1. **Get the Figma file**: If the user provided a Figma URL or file key (\`$ARGUMENTS\`), extract the fileKey. Otherwise ask: "Please provide the Figma file URL to sync tokens from."

2. **Fetch Figma variables**: Use the Figma MCP \`get_variable_defs\` tool to retrieve all design variables (colors, spacing, typography, radius, shadows, etc.).

3. **Locate token files in the codebase**: Search for:
   - CSS custom properties (\`:root { --color-... }\` in globals.css or tokens.css)
   - Tailwind config (\`tailwind.config.ts\` — \`theme.extend\`)
   - JS/TS token constants (\`tokens.ts\`, \`theme.ts\`, \`design-tokens.ts\`)
   - Any other token definition files

4. **Diff and sync**:
   - Compare Figma variables against existing token values
   - Show a clear diff: **Added**, **Changed**, **Removed** tokens
   - **Ask for confirmation before writing** if there are any removals or value changes that would affect existing components

5. **Update token files**: Write the changes to all relevant token files, maintaining existing formatting and structure.

6. **Report**:
   - Summary: X tokens added, Y tokens changed, Z tokens removed
   - List any Figma variables that couldn't be mapped to an existing token file location
   - Suggest running \`/drift-report\` to validate that components are using the updated tokens correctly

## Safety rules
- Always show the diff before writing
- Never remove tokens without explicit user confirmation
- Preserve comments and organization in existing token files
- Record what changed so it can be reviewed in code review`,
  },
  {
    command: "/drift-report [path]",
    name: "Drift Report",
    description: "Audit the codebase for design-code drift. Produces a structured report with severity levels.",
    file: "~/.claude/skills/drift-report/SKILL.md",
    triggersAgent: "design-drift-detector",
    promptContent: `Audit the codebase for design-code drift and generate a parity report.

## Instructions

You are executing the **Design drift detection** workflow. This identifies where the codebase has diverged from the Figma design source.

1. **Scope**: If the user provided a specific component or path (\`$ARGUMENTS\`), scope the audit there. Otherwise audit the entire component library.

2. **Scan for hardcoded values** — these are primary drift signals:
   - Hardcoded hex colors (e.g., \`#3B82F6\`, \`rgb(...)\`)
   - Hardcoded pixel spacing (e.g., \`mt-[24px]\`, \`padding: 16px\` outside the token scale)
   - Hardcoded font sizes (e.g., \`text-[14px]\`, \`font-size: 0.875rem\` outside the type scale)
   - Hardcoded border radius and shadow values
   Use Grep with patterns like \`#[0-9a-fA-F]{3,6}\`, \`\\[\\d+px\\]\`, \`rgba\\(\`.

3. **Cross-reference with token files**: For each hardcoded value found, check if an equivalent token exists that should be used instead.

4. **If a Figma URL is provided**, use \`get_variable_defs\` to compare live Figma variable values against what's in the token files — flag any mismatches.

5. **Generate the drift report**:

\`\`\`
# Design-Code Drift Report
Generated: [date]
Scope: [files/components audited]

## Summary
- Components audited: X
- Components with drift: Y
- Total drift instances: Z

## Critical (token exists but hardcoded value used)
| File | Line | Hardcoded Value | Should Use Token |
|------|------|-----------------|-----------------|

## Warnings (value not mapped to any token)
| File | Line | Value | Notes |

## Token file drift (Figma vs codebase mismatch)
| Token | Figma Value | Codebase Value |
\`\`\`

6. **Suggest fixes**: For each critical finding, show the exact edit needed to replace the hardcoded value with the correct token.

## Measurement targets
- Variables drift should be detected and reported within one sprint cycle
- Flag if any tokens have drifted by more than one value step (e.g., spacing scale)`,
  },
  {
    command: "/apply-theme [client]",
    name: "Apply Theme",
    description: "Apply a client brand via token overrides only — no component changes required.",
    file: "~/.claude/skills/apply-theme/SKILL.md",
    triggersAgent: "component-themer",
    promptContent: `Apply a new client theme using only the design tokens layer — no component changes required.

## Instructions

You are executing the **Client theme application** workflow. The goal: a complete client rebrand in under 3 days, touching only tokens — never component implementations.

1. **Get context**: Parse \`$ARGUMENTS\` for:
   - Client/theme name (e.g., "Acme Corp")
   - Figma variables URL for the new theme (if provided)
   If missing, ask for both.

2. **Map the token architecture**: Locate the project's token files:
   - Base token layer (primitive values: \`--color-blue-500\`, etc.)
   - Semantic token layer (intent-mapped: \`--color-primary\`, \`--color-background\`, etc.)
   - Component token layer (component-specific: \`--button-bg\`, \`--card-border\`, etc.)
   A well-structured token system should only require changes to the semantic and base layers.

3. **Fetch theme tokens from Figma** (if URL provided): Use \`get_variable_defs\` to extract the client's brand variables.

4. **Audit theming feasibility**: Check if the codebase is theme-ready:
   - Are components using semantic tokens (good) or primitive/hardcoded values (bad)?
   - If hardcoded values exist, flag them — they'll break the theme
   - Report a "theme readiness score" before proceeding

5. **Generate the theme file**: Create a new theme file (e.g., \`tokens/themes/acme.css\`) containing overrides for the semantic token layer only. Do NOT modify primitive tokens or component code.

\`\`\`css
/* tokens/themes/[client-name].css */
[data-theme="client-name"] {
  --color-primary: [brand-primary];
  --color-primary-foreground: [brand-primary-fg];
  --color-secondary: [brand-secondary];
  --color-background: [brand-background];
  --font-family-sans: '[Brand Font]', sans-serif;
  --radius-base: [brand-radius];
}
\`\`\`

6. **Provide integration instructions**: Show how to activate the theme (adding \`data-theme\` attribute, importing the theme file, updating the provider).

7. **Report**:
   - Tokens overridden: X
   - Components that will be affected: Y (list them)
   - Any hardcoded values that will NOT be affected by the theme (drift risk)
   - Estimated visual coverage: Z% of UI themed via tokens

## Goal
A new client theme should be applied in under 3 days using only the tokens layer. If this workflow reveals that component changes are also needed, flag it as design system debt.`,
  },
];

export const agentDefinitions: AgentDefinition[] = [
  {
    name: "doc-sync",
    displayName: "Doc Sync",
    description: "Reads all component, token, and brand data files. Scans source files for props and token usage. Diffs against existing docs.ts entries and writes updated documentation with full agent metadata — writtenBy, writtenAt, runId, coverage score.",
    triggerSkill: "/sync-docs",
    mcpServers: ["github-mcp"],
    reads: [
      "lib/data/components.ts — all component definitions, status, drift instances",
      "lib/data/tokens.ts — full token registry with sync status",
      "lib/data/brands.ts — brand entries and coverage data",
      "Each component source file — scans for props, imports, token usage patterns",
      "lib/data/docs.ts — existing doc entries for diffing (stale/missing detection)",
    ],
    writes: [
      "lib/data/docs.ts — all component docs, variable-group docs, brand docs",
      "Agent memory — known doc slugs, last-written timestamps, source file change hashes",
    ],
    memoryPath: "~/.claude/agent-memory/doc-sync/",
    capabilities: [
      "Extracts TypeScript prop types directly from source component files",
      "Maps token usage by scanning className and style attributes in components",
      "Diffs existing docs against current state — finds stale, missing, and changed entries",
      "Generates human-readable summaries for each component and variable group",
      "Calculates coverage score: % of props + tokens with full documentation",
      "Marks docs as stale when source files have changed since last doc run",
    ],
    exampleInvocations: [
      "/sync-docs",
      "/sync-docs src/components/ui/button.tsx  (single component)",
    ],
  },
  {
    name: "figma-to-code",
    displayName: "Figma → Code",
    description: "Translates Figma designs into production-ready React components. Scans the codebase for stack conventions first, maps every design value to a project token, and writes immediately-usable components with TypeScript types.",
    triggerSkill: "/figma",
    mcpServers: ["figma-console-mcp", "figma-mcp"],
    reads: [
      "Figma design node via MCP (get_design_context, get_variable_defs)",
      "Existing component files — naming patterns, imports, file structure",
      "Token files — CSS custom properties, Tailwind config, JS token constants",
      "package.json + tsconfig — framework and library detection",
    ],
    writes: [
      "New component file at the correct project path",
      "lib/data/components.ts — status set to 'New', token mappings populated",
      "Agent memory — confirmed token mappings and project conventions",
    ],
    memoryPath: "~/.claude/agent-memory/figma-to-code/",
    capabilities: [
      "Auto-detects project framework, component library, and token system",
      "Builds a Figma variable → codebase token mapping before generating",
      "Reuses existing shadcn/Radix/MUI primitives instead of rebuilding from scratch",
      "Flags unmapped design values as drift risks before writing any file",
      "Generates TypeScript interfaces and prop definitions matching project conventions",
    ],
    exampleInvocations: [
      "/figma https://figma.com/design/abc/File?node-id=15-892",
      "/figma  (paste URL when prompted)",
    ],
  },
  {
    name: "token-sync",
    displayName: "Token Sync",
    description: "Keeps Figma variables and codebase token files in lock-step. Fetches all variables from Figma, diffs against every token file in the codebase, and propagates changes — always showing a diff and confirming before any destructive write.",
    triggerSkill: "/tokens",
    mcpServers: ["figma-console-mcp", "figma-mcp"],
    reads: [
      "Figma variables via MCP (get_variable_defs) — all collections",
      "CSS custom properties in :root blocks (globals.css, tokens.css)",
      "Tailwind config theme.extend section",
      "JS/TS token constants (tokens.ts, theme.ts, design-tokens.ts)",
    ],
    writes: [
      "CSS custom property files — globals.css, tokens.css",
      "Tailwind config — theme.extend color/spacing/radius updates",
      "lib/data/tokens.ts — sync status for each token",
      "Agent memory — token file locations, naming convention mappings",
    ],
    memoryPath: "~/.claude/agent-memory/token-sync/",
    capabilities: [
      "Produces Added / Changed / Removed diff before any file write",
      "Requires explicit confirmation before removing or changing existing tokens",
      "Preserves file comments, organization, and intentional custom overrides",
      "Flags high-impact changes when a token is used in more than 5 places",
      "Tracks naming convention mappings between Figma variables and codebase names",
    ],
    exampleInvocations: [
      "/tokens https://figma.com/design/abc/DesignSystem",
      "/tokens  (paste Figma file URL when prompted)",
    ],
  },
  {
    name: "design-drift-detector",
    displayName: "Drift Detector",
    description: "Audits the entire codebase for design-code drift. Detects hardcoded values that should be tokens, token value mismatches between Figma and code, and structural divergences. Produces a severity-graded, actionable report.",
    triggerSkill: "/drift-report",
    mcpServers: ["figma-console-mcp", "github-mcp"],
    reads: [
      "All component source files — Grep for hardcoded hex, px, rgba patterns",
      "Token files — to cross-reference and suggest correct replacements",
      "Figma variables via MCP (get_variable_defs) — optional, for value comparison",
      "Git history — to flag drift that is older than the last sprint cycle",
    ],
    writes: [
      "lib/data/components.ts — drift status and instances for each component",
      "lib/data/metrics.ts — drift score and last audit timestamp",
      "Agent memory — baseline drift count, known intentional exceptions",
    ],
    memoryPath: "~/.claude/agent-memory/design-drift-detector/",
    capabilities: [
      "Detects hardcoded hex/rgb colors, arbitrary Tailwind px values, inline styles",
      "Categorizes drift by severity: Critical / High / Medium / Low",
      "Cross-references each hardcoded value against token files for fix suggestions",
      "Compares Figma variable values vs codebase token values when URL provided",
      "Tracks drift count over time to surface improvement or regression trends",
    ],
    exampleInvocations: [
      "/drift-report",
      "/drift-report src/components/ui/button.tsx",
      "/drift-report https://figma.com/design/abc  (includes Figma value comparison)",
    ],
  },
  {
    name: "component-themer",
    displayName: "Component Themer",
    description: "Generates client brand theme files by overriding only the semantic token layer — zero component code changes. Assesses theme readiness first, then maps client Figma brand variables to semantic tokens and produces an activation-ready CSS file.",
    triggerSkill: "/apply-theme",
    mcpServers: ["figma-console-mcp", "figma-mcp"],
    reads: [
      "Client Figma brand variables via MCP (get_variable_defs)",
      "Existing token architecture — primitive / semantic / component layers",
      "Component files — to assess semantic vs primitive vs hardcoded token usage",
      "Existing theme files — for reference and consistency",
    ],
    writes: [
      "tokens/themes/[client].css — semantic token override file",
      "lib/data/brands.ts — coverage percentage and override count",
      "Agent memory — token architecture per project, theme file paths, coverage history",
    ],
    memoryPath: "~/.claude/agent-memory/component-themer/",
    capabilities: [
      "Audits theme readiness score before generating (% using semantic tokens)",
      "Maps client Figma brand variables to the semantic token layer",
      "Generates [data-theme] CSS override file with only semantic token overrides",
      "Shows exact activation instructions: import path + data-theme attribute",
      "Reports coverage: % of UI that will be themed vs what has hardcoded values",
    ],
    exampleInvocations: [
      "/apply-theme acme https://figma.com/design/abc/AcmeBrand",
      "/apply-theme verdure",
    ],
  },
  {
    name: "storybook-agent",
    displayName: "Storybook",
    description: "Reads the running component library via Storybook MCP. Lists components, inspects stories, captures screenshots, and compares visual output against Figma specs to detect and fix story drift.",
    triggerSkill: "/storybook",
    mcpServers: ["storybook-mcp"],
    reads: [
      "Storybook MCP — list-all-components, list-all-documentation",
      "Storybook MCP — get-documentation, get-story-urls per component",
      "Storybook MCP — get-screenshot per story for visual comparison",
      "Figma MCP — get_screenshot for spec reference",
    ],
    writes: [
      "[Name].stories.tsx — one StoryObj per Figma variant",
      "lib/data/components.ts — story verification status",
      "Agent memory — known story URLs, last verified timestamps",
    ],
    memoryPath: "~/.claude/agent-memory/storybook-agent/",
    capabilities: [
      "Lists all components with story counts via Storybook MCP",
      "Captures Playwright screenshots of story URLs",
      "Compares story screenshots against Figma spec — reports token and spacing drift",
      "Generates missing stories — one StoryObj per Figma variant",
      "Fixes token mismatches in stories without changing component implementations",
    ],
    exampleInvocations: [
      "/storybook",
      "/storybook Button --verify https://figma.com/design/abc?node-id=1-2",
      "/storybook Button --fix",
    ],
  },
  {
    name: "deploy-agent",
    displayName: "Deploy",
    description: "Builds the project and deploys a preview to Vercel. Reads the build command from package.json, fixes build errors before deploying, and returns the Vercel preview URL.",
    triggerSkill: "/deploy",
    mcpServers: ["vercel-mcp"],
    reads: [
      "package.json — build command (build or build-storybook)",
      "Vercel project config — project ID, team, env vars",
    ],
    writes: [
      "Vercel — deployed preview at https://[project]-[hash].vercel.app",
      "Agent memory — last successful deploy URL, project link status",
    ],
    memoryPath: "~/.claude/agent-memory/deploy-agent/",
    capabilities: [
      "Auto-detects build command from package.json",
      "Fixes build errors before deploying — never deploys broken builds",
      "Returns preview URL immediately after deploy",
      "Supports both app build and storybook-static deploy",
    ],
    exampleInvocations: [
      "/deploy",
      "/deploy --project my-storybook",
    ],
  },
];

// ── Skills from the Figma × Storybook × Claude pipeline (6 core skills) ──────

export const pipelineSkills: Skill[] = [
  {
    command: "/figma",
    name: "Extract from Figma",
    description: "Run first. Extracts design context — tokens, layout, variants — from any Figma URL using Official Figma REST MCP.",
    file: "~/.claude/skills/figma/SKILL.md",
    triggersAgent: "Ada",
    category: "pipeline",
    group: "sync-loop",
    mcp: { required: ["figma-mcp"] },
    promptContent: `---
description: Extract design context from a Figma URL using Official Figma REST MCP
---

# /figma — Extract Design Context

Run this first. Shows exactly what Claude sees before generating anything.

## Steps

1. Parse the Figma URL to extract fileKey and nodeId
2. Call \`mcp__claude_ai_Figma__get_design_context\` with fileKey and nodeId
3. Call \`mcp__claude_ai_Figma__get_variable_defs\` with fileKey and nodeId to extract all design tokens
4. Call \`mcp__claude_ai_Figma__get_screenshot\` for a visual reference
5. Output a structured summary:
   - Component: [name] ([type]), Node ID
   - Tokens: color, spacing, radius mapped to CSS vars
   - Layout: direction, gap, padding
   - Variants: all variant properties and values
   - States: default, hover, disabled, active, loading
6. Flag any hardcoded values not referencing a Figma variable

## Notes
- Uses Official Figma REST MCP — no Figma Desktop required
- If get_design_context returns incomplete data, try get_metadata first
- Node ID format: use 123:456 not 123-456`,
  },
  {
    command: "/tokens",
    name: "Sync Tokens",
    description: "Compares Figma variables against your CSS token file. Adds new tokens, updates changed values, flags removed ones with [REMOVED].",
    file: "~/.claude/skills/tokens/SKILL.md",
    triggersAgent: "Flux",
    category: "pipeline",
    group: "sync-loop",
    mcp: { required: ["figma-mcp"] },
    promptContent: `---
description: Sync Figma design tokens to CSS custom properties
---

# /tokens — Sync Design Tokens

## Usage
\`\`\`
/tokens [figma-url]
/tokens [figma-url] --file src/app/globals.css
\`\`\`

## Steps
1. Call \`mcp__claude_ai_Figma__get_variable_defs\` with the Figma fileKey
2. Read the existing token file (default: src/app/globals.css)
3. Build a diff: New tokens / Updated tokens / Removed tokens
4. Apply naming convention: color/primary/default → --color-primary-default
5. Write updates — never delete, comment removed: /* [REMOVED] --token-name: value; */
6. Run \`npm run tokens\` to regenerate \`.systemix/tokens.bridge.json\`
7. Output: Tokens synced: N added, N updated, N flagged

## Notes
- Preserve :root block structure and comments
- Figma mode "Light" → :root, "Dark" → .dark or [data-theme="dark"]
- Token file path: src/app/globals.css (check CLAUDE.md if project differs)
- Run before /component to ensure all CSS var references are current
- After syncing, run \`npm run tokens\` to regenerate \`.systemix/tokens.bridge.json\``,
  },
  {
    command: "/component",
    name: "Generate Component",
    description: "Generates a production-ready React TypeScript component and Storybook story from a Figma URL.",
    file: "~/.claude/skills/component/SKILL.md",
    triggersAgent: "Ada",
    category: "pipeline",
    group: "output",
    mcp: { required: ["figma-mcp"] },
    promptContent: `---
description: Generate a React TypeScript component + Storybook story from a Figma URL
---

# /component — Generate Component

## Usage
\`\`\`
/component [figma-url]
/component [figma-url] --name ButtonGroup --dir src/components/ui
\`\`\`

## Steps
1. Extract design context: Call \`mcp__claude_ai_Figma__get_design_context\` with fileKey and nodeId from the URL. Also call \`mcp__claude_ai_Figma__get_variable_defs\` for token context.
2. Read CLAUDE.md or src/conventions.md for project conventions
3. Check src/components/ui/ — does this component already exist? If yes: update it.
4. Generate [Name].tsx:
   - Use shadcn/ui primitives as base where applicable
   - Use cva() for variant management
   - Use cn() from @/lib/utils
   - All visual values → CSS custom properties, never hardcoded
5. Generate [Name].stories.tsx — one StoryObj per Figma variant
6. Run: npx tsc --noEmit — fix all type errors before finishing
7. Output: Component path / Story path / Tokens used / Variants list

## Conventions
- Use CSS custom properties from globals.css, never hardcoded values
- Component file = named export + default export`,
  },
  {
    command: "/storybook",
    name: "Read & Verify Stories",
    description: "Read, verify, and update Storybook stories via Storybook MCP. Compares screenshots against Figma spec.",
    file: "~/.claude/skills/storybook/SKILL.md",
    triggersAgent: "Sage",
    category: "pipeline",
    group: "quality",
    mcp: { required: ["storybook-mcp"] },
    promptContent: `---
description: Read, verify, and update Storybook stories. Compares screenshots against the Figma spec and reports drift.
---

Storybook operation for: $ARGUMENTS

## Usage
\`\`\`
/storybook                                    # list all components
/storybook [Component]                        # inspect a component
/storybook [Component] --verify [figma-url]   # compare vs Figma spec
/storybook [Component] --fix                  # update story to match Figma
\`\`\`

## Steps

1. **Resolve mode from arguments**
   - No args → list mode: scan \`*.stories.tsx\` files and list component names
   - Component name only → inspect: read the \`.stories.tsx\` file alongside the component
   - \`--verify [figma-url]\` → compare screenshots vs Figma spec, report drift
   - \`--fix\` → auto-fix: token mismatch → update CSS var, missing story → add \`StoryObj\`

2. **Inspect** (if component name given)
   - Locate the component file in \`src/components/\`
   - Read the \`.stories.tsx\` file alongside it
   - Report: stories found, props covered, variants missing

3. **Verify** (if \`--verify\` flag)
   - Extract Figma design context from the provided URL using \`mcp__claude_ai_Figma__get_design_context\`
   - Take a screenshot of each story at \`localhost:6006\`
   - Compare against the Figma screenshot — report: dimensions match, token values match, visual drift score

4. **Fix** (if \`--fix\` flag)
   - Token mismatch → replace hardcoded values with CSS custom properties
   - Missing variant → add a new \`StoryObj\` for each uncovered Figma variant
   - Write the updated \`.stories.tsx\` file

5. **Verify build**
   \`\`\`bash
   npx storybook build --quiet 2>&1 | tail -20
   \`\`\`
   If build fails: read error, fix, retry once

## Notes
- Requires Storybook running at \`localhost:6006\` for screenshot comparisons
- Do not delete existing stories without explicit user confirmation
- Run \`/figma [url]\` first to cache design context before \`--verify\``,
  },
  {
    command: "/deploy",
    name: "Build & Deploy Preview",
    description: "Builds the project and deploys a Storybook or app preview to Vercel. Returns a preview URL.",
    file: "~/.claude/skills/deploy/SKILL.md",
    triggersAgent: "Ship",
    category: "pipeline",
    group: "output",
    mcp: { required: ["vercel-mcp"], optional: ["posthog-mcp"] },
    promptContent: `---
description: Build and deploy the project to Vercel, then post the preview URL as a comment on the relevant Figma node.
---

# /deploy — Build & Deploy Preview

## Steps

1. **Verify build passes**
   \`\`\`bash
   npm run build
   \`\`\`
   Stop if build fails - fix errors first.

2. **Check git status**
   \`\`\`bash
   git status
   \`\`\`
   Warn if there are uncommitted changes.

3. **Deploy to Vercel**
   - Production: \`npx vercel --prod\`
   - Preview: \`npx vercel\`

   Default to preview unless \`prod\` or \`production\` is specified.

4. **Capture the deployment URL** from Vercel output

5. **Post to Figma** (unless \`--skip-figma\` is specified)
   - Spawn \`deploy-feedback\` agent with the deployment URL
   - Agent will check \`.systemix/systemix.json\` for the Figma file key and node target
   - Agent will show HITL gate before posting
   - If no Figma context exists, skip silently and report "No Figma target — run /deploy-annotate to post manually"

6. **Report results**
   - Build: passed/failed
   - Preview URL: https://...
   - Figma comment: posted to [node] / skipped

## Environments

- \`preview\` (default) - Creates a preview deployment
- \`prod\` / \`production\` - Deploys to production

## Options

- \`--skip-figma\` - Skip the Figma comment step

## Prerequisites

- Vercel CLI authenticated (\`npx vercel login\`)
- Project linked to Vercel (\`npx vercel link\`)`,
  },
  {
    command: "/sync-to-figma",
    name: "Sync Tokens to Figma",
    description: "Push CSS custom property values from the codebase back to Figma variables. Reverse of /tokens. Use when you've made code-side token changes that should be reflected in Figma.",
    file: "~/.claude/skills/sync-to-figma/SKILL.md",
    triggersAgent: "Flux",
    category: "tools",
    group: "sync-loop",
    mcp: { required: ["figma-console-mcp"] },
    promptContent: `---
description: Push CSS custom property values from the codebase back to Figma variables. Reverse of /tokens. Use when you've made code-side token changes that should be reflected in Figma.
disable-model-invocation: true
argument-hint: [figma-url]
---

Sync CSS token values back to Figma: $ARGUMENTS

## When to use

Run this after you've intentionally changed token values in \`globals.css\` and want Figma to reflect those changes. This is the reverse of \`/tokens\` — code is the source here, not Figma.

**Do not run this to "fix" Figma drift** — if Figma has newer values than code, run \`/tokens\` instead.

## Steps

1. **Parse the Figma URL** from $ARGUMENTS
   - If no URL provided, check \`.claude/project-context.json\` for \`figma.fileKey\`
   - If neither exists, ask the user for the Figma URL

2. **Spawn the \`token-writer\` agent** with the Figma URL and current working directory

3. The \`token-writer\` agent will:
   - Read CSS custom properties from \`globals.css\`
   - Compare against current Figma variable values
   - Build a diff (only changed values)
   - Show a summary table
   - Spawn \`figma-writer\` with a variables manifest (which will show its own HITL gate before writing)

4. **Report results** — tokens updated, tokens in sync, tokens with no Figma counterpart

## Notes

- Variables are updated only, never created. If a CSS variable has no matching Figma variable, it is flagged but not auto-created.
- The \`figma-writer\` agent will always ask for confirmation before writing to Figma.`,
  },
  {
    command: "/figma-push",
    name: "Push to Figma",
    description: "Screenshot a localhost (or any) URL and push the image onto a Figma canvas frame. Uses figma-console-mcp to place the image as a fill.",
    file: "~/.claude/skills/figma-push/SKILL.md",
    triggersAgent: "Ada",
    category: "tools",
    group: "utilities",
    mcp: { required: ["figma-console-mcp"] },
    promptContent: `---
description: Screenshot a localhost (or any) URL and push the image onto a Figma canvas frame. Uses figma-console-mcp to place the image as a fill.
argument-hint: [localhost-url] [figma-url]
---

Push a screenshot of $ARGUMENTS onto a Figma canvas.

## Steps

1. **Parse arguments** from $ARGUMENTS:
   - First URL = source page to screenshot (e.g. \`http://localhost:3000\`)
   - Second URL = target Figma file/frame (e.g. \`https://figma.com/design/...?node-id=...\`)
   - If either is missing, ask the user before proceeding

2. **Parse the Figma URL**:
   - Extract \`fileKey\` from the URL path
   - Extract \`nodeId\` from \`node-id\` query param — convert \`-\` to \`:\`
   - If no \`node-id\`, you will create a new frame on the current page

3. **Screenshot the source URL**:
   - Use \`mcp__claude_ai_Figma_Console__figma_capture_screenshot\` if available
   - Otherwise use the \`WebFetch\` tool to load the page and describe what you see, then ask the user to provide a screenshot path

4. **Push to Figma**:
   - If a target \`nodeId\` was provided: use \`mcp__claude_ai_Figma_Console__figma_set_image_fill\` to set the image as a fill on that frame
   - If no nodeId: use \`mcp__claude_ai_Figma_Console__figma_create_child\` to create a new frame, then \`figma_set_image_fill\` on it
   - Set a meaningful name on the frame: the page title or URL hostname + timestamp

5. **Report**:
   - Figma file: [fileKey]
   - Frame: [node name] ([nodeId])
   - Image placed successfully / error details

## Notes
- Figma Desktop must be open with the target file for write operations via the desktop bridge
- The frame will be created at the top-left of the current page if no target node is specified
- For localhost URLs, the Figma Desktop bridge (port 3845) must be running`,
  },
  {
    command: "/figma-inspect",
    name: "Inspect Figma Node",
    description: "Inspect the current Figma selection or a given node URL. Returns component name, design tokens, layout, variants, and Code Connect mapping.",
    file: "~/.claude/skills/figma-inspect/SKILL.md",
    triggersAgent: "Ada",
    category: "tools",
    group: "utilities",
    mcp: { required: ["figma-desktop-mcp"], optional: ["figma-mcp"] },
    promptContent: `---
description: Inspect the currently selected node in Figma Desktop via the Dev Mode MCP bridge. Returns component name, properties, tokens, and layout details.
argument-hint: [optional: figma-url or node description]
---

Inspect the current Figma selection (or a specific node from $ARGUMENTS).

## Steps

1. **Resolve the target**:
   - If $ARGUMENTS contains a Figma URL: extract \`fileKey\` and \`nodeId\`
   - If $ARGUMENTS is empty: use \`mcp__figma-desktop__get_design_context\` or \`mcp__claude_ai_Figma_Console__figma_get_status\` to read the current selection in Figma Desktop
   - If neither works: ask the user to select a node in Figma and re-run

2. **Fetch design context** using \`mcp__figma-desktop__get_design_context\` (preferred — official Dev Mode bridge) or fall back to \`mcp__claude_ai_Figma__get_design_context\`

3. **Fetch a screenshot** using \`mcp__figma-desktop__get_screenshot\` for visual reference

4. **Output a structured inspection report**:

\`\`\`
## [Component Name] — [Node ID]
Type: [FRAME | COMPONENT | INSTANCE | TEXT | ...]

### Properties
| Property | Value |
|----------|-------|
| Width    | ...   |
| Height   | ...   |

### Design Tokens Used
| Token | CSS Var | Value |
|-------|---------|-------|

### Layout
- Direction: [horizontal | vertical | none]
- Gap: [value]
- Padding: [top right bottom left]
- Alignment: [...]

### Variants / States
[List all variant properties and current values]

### Code Connect
[If a Code Connect mapping exists, show the mapped component and usage snippet]
\`\`\`

5. **Flag any hardcoded values** not mapped to a Figma variable — these are potential drift risks

## Notes
- Requires Figma Desktop open and Dev Mode active (Shift+D) for the figma-desktop bridge
- Works best when a node is already selected in Figma
- Node ID format: always use \`123:456\` not \`123-456\``,
  },
  {
    command: "/sync",
    name: "Full Sync (Orchestrator)",
    description: "Run the full bidirectional sync: pull Figma tokens → update globals.css → push Variables back to Figma → run drift report. One command, full loop.",
    file: "~/.claude/skills/sync/SKILL.md",
    triggersAgent: "Flux",
    category: "tools",
    group: "sync-loop",
    mcp: { required: ["figma-mcp", "figma-console-mcp"] },
    promptContent: `---
description: Orchestrate the full design↔code sync loop — one command to pull tokens, convert, push Variables, and report drift
---

# /sync — Full Bidirectional Sync

## Usage
\`\`\`
/sync                                    # uses Figma file from .systemix/systemix.json
/sync https://figma.com/design/...      # explicit Figma file
\`\`\`

## What this does
Runs all sync operations in sequence with a single HITL gate before any writes:

1. **Pull**: Fetch current Figma Variables via \`get_variable_defs\`
2. **Convert**: Diff against \`.systemix/tokens.bridge.json\` — find changed, added, removed
3. **Propose**: Show unified diff of what will change in globals.css + what will be updated in Figma
4. **HITL gate**: Present the full proposed changeset. Wait for approval.
5. **Apply to code**: Write changed tokens to \`src/app/globals.css\`
6. **Regenerate bridge**: Re-run \`scripts/token-converter.ts\` to update \`.systemix/tokens.bridge.json\`
7. **Push to Figma**: Execute Plugin API JS to sync Variable values back (same as \`/sync-to-figma\`)
8. **Drift check**: Run a fast grep-based scan for hardcoded values in components — surface any new drift
9. **Update manifest**: Write lastSync, tokenChangeLog entry, and syncStatus fields in \`.systemix/systemix.json\`

## Output
\`\`\`
Sync complete — 2026-03-28T12:00:00Z
  Tokens pulled:    31
  Changed:          3  (--border light, --muted-foreground, --status-new)
  Figma Variables:  31 updated across 3 collections
  Drift instances:  2 new hardcoded values flagged (see /drift)
  Bridge file:      .systemix/tokens.bridge.json updated
\`\`\`

## Notes
- Never writes without HITL approval
- If only one direction is needed, use \`/tokens\` (Figma → code) or \`/sync-to-figma\` (code → Figma)
- Drift check is a fast static scan only — run \`/drift-report\` for a full audit`,
  },
  {
    command: "/design-to-code",
    name: "Full Workflow",
    description: "Full bidirectional Figma-to-deployed-code workflow — parity check, token sync, component generation, code connect linking, build, deploy, and Figma annotation.",
    file: "~/.claude/skills/design-to-code/SKILL.md",
    triggersAgent: "Ada",
    category: "tools",
    group: "sync-loop",
    mcp: { required: ["figma-mcp", "figma-console-mcp"] },
    promptContent: `---
description: Full bidirectional Figma-to-deployed-code workflow — parity check, token sync, component generation, code connect linking, build, deploy, and Figma annotation.
disable-model-invocation: true
argument-hint: [figma-url] [--skip-deploy?] [--skip-figma?]
---

# Full Design-to-Code Workflow

Convert Figma design to deployed code: $ARGUMENTS

## Workflow Steps

### 1. Parity Check (non-blocking)

Spawn \`parity-checker\` agent with the Figma URL.

Show the drift report to the user. This is informational — do not stop the workflow based on findings. User will decide if they want to address drift separately.

Note: skip this step if \`--skip-parity\` is passed.

### 2. Sync Tokens

Use the \`/tokens\` skill workflow:
- Extract variables from the Figma file via \`mcp__claude_ai_Figma__get_variable_defs\`
- Compare with existing \`globals.css\`
- Update CSS custom properties if new or changed values found
- Report: X tokens added, Y updated, Z unchanged

### 3. Extract Design Context

Use the \`/figma\` skill workflow:
- Get design context from \`mcp__claude_ai_Figma__get_design_context\`
- Capture screenshot via \`mcp__claude_ai_Figma__get_screenshot\`
- Identify component structure and name

### 4. Generate Component

Use the \`/component\` skill workflow:
- Create hi-fi React component (TypeScript)
- Follow design system conventions from \`/design-system\`
- Place in \`src/components/\`
- Update \`page.tsx\` imports if needed

**HITL gate:** Show the generated component file. Ask "Looks good? Proceed to build? (y/N)". Stop if user says no.

### 5. Link to Figma (Code Connect)

After component is written, spawn \`code-connect\` agent for the new component only:
- Match the new component file to the Figma node that was just implemented
- The agent will use the nodeId from the Figma URL as the primary match target
- Skip full codebase scan — just link this one component
- Shows HITL gate inside the agent before sending to Figma

### 6. Verify Build

\`\`\`bash
npm run build
\`\`\`

Stop and fix if build fails. Do not proceed to deploy with a broken build.

### 7. Commit Changes

\`\`\`bash
git add src/components/[ComponentName].tsx
git add src/app/globals.css
git add .claude/project-context.json
git commit -m "Add [ComponentName] from Figma design [nodeId]"
\`\`\`

Skip if \`--no-commit\` is passed.

### 8. Deploy Preview

Unless \`--skip-deploy\` is specified:
- Run \`npx vercel\` for preview deployment
- Capture the preview URL

### 9. Post to Figma

Unless \`--skip-figma\` is specified:
- Spawn \`deploy-feedback\` agent with the Vercel URL and the original Figma node URL
- Agent will compose and post a comment with the preview URL
- HITL gate inside the agent before posting

## Options

- \`--skip-deploy\` — Stop after commit, skip deploy and Figma annotation
- \`--skip-figma\` — Deploy but don't post to Figma
- \`--skip-parity\` — Skip the initial parity check
- \`--tokens-only\` — Only sync tokens, skip component generation
- \`--no-commit\` — Don't auto-commit changes

## Output

Report:
- Parity: [n] tokens drifted, [n] components unlinked
- Tokens updated: [n] added/changed
- Component created: \`src/components/[name].tsx\`
- Code Connect: linked to Figma node [nodeId]
- Build: passed/failed
- Preview URL: https://...
- Figma comment: posted / skipped`,
  },
  {
    command: "/drift-report",
    name: "Drift Report",
    description: "Audit the codebase for design-code drift — hardcoded colors, spacing, and type scales that should reference tokens. Produces a structured report with severity levels.",
    file: "~/.claude/skills/drift-report/SKILL.md",
    triggersAgent: "Scout",
    category: "pipeline",
    group: "quality",
    mcp: { required: [], optional: ["figma-mcp", "posthog-mcp"] },
    promptContent: `---
description: Audit the codebase for design-code drift and generate a parity report
---

# /drift-report — Design Drift Audit

## Usage
\`\`\`
/drift-report                        # audit full component library
/drift-report src/components/ui/     # scope to a directory
/drift-report [figma-url]            # also compare Figma values vs token file
\`\`\`

## Steps
1. Scan for hardcoded values: hex colors (#3B82F6), px spacing (mt-[24px]), font sizes (text-[14px])
2. Cross-reference with token files — flag values that have a token equivalent
3. If Figma URL provided: call \`mcp__claude_ai_Figma__get_variable_defs\`, diff against CSS token file
4. Generate report with Critical (token exists, not used) and Warning (no token match) categories
5. Suggest exact edits to fix each critical finding

## Output format
# Design-Code Drift Report
- Components audited: X
- With drift: Y
- Total instances: Z
| File | Line | Hardcoded | Should Use |`,
  },
  {
    command: "/apply-theme",
    name: "Apply Theme",
    description: "Apply a client brand via token overrides only — no component changes required. Generates a theme CSS file and reports coverage.",
    file: "~/.claude/skills/apply-theme/SKILL.md",
    triggersAgent: "Prism",
    category: "tools",
    group: "output",
    mcp: { required: ["figma-mcp"] },
    promptContent: `---
description: Apply a client brand theme via token overrides — no component changes required
---

# /apply-theme — Apply Client Theme

## Usage
\`\`\`
/apply-theme [client-name]
/apply-theme [client-name] [figma-variables-url]
\`\`\`

## Steps
1. Parse client name and optional Figma variables URL from arguments
2. If Figma URL: call \`mcp__claude_ai_Figma__get_variable_defs\` to extract brand variables
3. Audit theme readiness: are components using semantic tokens or hardcoded values?
4. Report "theme readiness score" before generating — Score = (components using CSS vars / total components) × 100. Report as X% theme-ready.
5. Generate tokens/themes/[client].css with semantic token overrides only
6. Output: tokens overridden, components affected, visual coverage %, drift risks

## Output format
[data-theme="client"] {
  --color-primary: [brand-primary];
  --color-background: [brand-background];
  --radius-base: [brand-radius];
}

## Goal: a full rebrand touching only the tokens layer, zero component changes`,
  },
  {
    command: "/connect",
    name: "Link Components",
    description: "Link Figma components to codebase React components bidirectionally — updates Code Connect in Figma and adds implementation notes to Figma component descriptions.",
    file: "~/.claude/skills/connect/SKILL.md",
    triggersAgent: "Echo",
    category: "tools",
    group: "utilities",
    mcp: { required: ["figma-mcp"] },
    promptContent: `---
description: Link Figma components to codebase React components bidirectionally — updates Code Connect in Figma and adds implementation notes to Figma component descriptions.
disable-model-invocation: true
argument-hint: [figma-url]
---

Link Figma components to codebase components: $ARGUMENTS

## What this does

Builds a mapping table between Figma component nodes and React component files. After your approval, sends confirmed links to Figma (Code Connect) and updates each Figma component's description with its code file path.

Run this:
- When starting a new project to establish the initial linking
- After generating new components with \`/component\` or \`/design-to-code\`
- When a designer adds new components to the Figma file

## Steps

1. **Parse the Figma URL** from $ARGUMENTS
   - If no URL provided, check \`.claude/project-context.json\` for \`figma.fileKey\`
   - If neither exists, ask the user for the Figma URL

2. **Spawn the \`code-connect\` agent** with the Figma URL and current working directory

3. The \`code-connect\` agent will:
   - Discover all React components in \`src/components/\`
   - Read Figma's component list and code connect suggestions
   - Build a candidate mapping table with confidence scores
   - Show the mapping table for your approval (HITL gate inside the agent)
   - Send confirmed mappings to Figma via \`figma-writer\`
   - Update each Figma component description with the code file path
   - Save confirmed mappings to \`.claude/project-context.json\`

4. **Report results** — X linked, Y code-only, Z Figma-only (not yet built)

## Output

Summary of all mappings created, plus any components that couldn't be matched automatically.`,
  },
  {
    command: "/check-parity",
    name: "Check Parity",
    description: "Detect drift between Figma design tokens/components and the codebase. Shows a full parity report with token diffs, unlinked components, and designer comments.",
    file: "~/.claude/skills/check-parity/SKILL.md",
    triggersAgent: "Scout",
    category: "tools",
    group: "quality",
    mcp: { required: ["figma-mcp"] },
    promptContent: `---
description: Detect drift between Figma design tokens/components and the codebase. Shows a full parity report with token diffs, unlinked components, and designer comments.
disable-model-invocation: true
argument-hint: [figma-url]
---

Check parity between Figma and codebase: $ARGUMENTS

## Steps

1. **Parse the Figma URL** from $ARGUMENTS
   - If no URL provided, check \`.claude/project-context.json\` for \`figma.fileKey\` and construct the URL
   - If neither exists, ask the user for the Figma URL before proceeding

2. **Spawn the \`parity-checker\` agent** with:
   - The Figma URL
   - Current working directory as the project root

3. **Display the parity report** returned by the agent

4. **Offer next actions** based on the report findings:
   - If token drift found: "Run \`/tokens [figma-url]\` to pull updates"
   - If unimplemented Figma components found: "Run \`/component [figma-url]\` to generate"
   - If unlinked code components found: "Run \`/connect [figma-url]\` to link them"
   - If designer comments found: surface them for review

## Output

The parity report from the agent, followed by a short list of recommended next commands.`,
  },
  {
    command: "/deploy-annotate",
    name: "Annotate Deploy",
    description: "Post a Vercel deployment URL as a comment on a Figma node. Use after deploying to close the loop between code and design.",
    file: "~/.claude/skills/deploy-annotate/SKILL.md",
    triggersAgent: "Ship",
    category: "tools",
    group: "output",
    mcp: { required: ["vercel-mcp", "figma-mcp"] },
    promptContent: `---
description: Post a Vercel deployment URL as a comment on a Figma node. Use after deploying to close the loop between code and design.
disable-model-invocation: true
argument-hint: [vercel-url] [figma-node-url]
---

Post deploy URL to Figma: $ARGUMENTS

## Steps

1. **Parse arguments**
   - First argument: Vercel deployment URL (e.g. \`https://verolab-abc.vercel.app\`) or deployment ID
   - Second argument: Figma node URL to comment on (e.g. \`https://www.figma.com/design/...?node-id=...\`)
   - If Figma URL is missing, check \`.claude/project-context.json\` for the last active node — prompt if still missing

2. **Spawn \`deploy-feedback\` agent** with both URLs

3. The \`deploy-feedback\` agent will:
   - Fetch deployment status and build details from Vercel MCP
   - Compose a short comment with the preview URL, branch, build time
   - Show the comment text for your approval (HITL gate inside the agent)
   - Post to Figma via \`figma-writer\`

4. **Report** — comment posted / skipped

## Standalone vs. automatic

This skill is also triggered automatically at the end of \`/deploy\` and \`/design-to-code\` when \`.claude/project-context.json\` contains a \`figma.nodeMap\` entry.

Run it manually when you deployed outside of those skills and want to post the URL retroactively.`,
  },
  {
    command: "/sync-docs",
    name: "Sync Docs",
    description: "Sync all documentation entries in lib/data/docs.ts from live component, token, and brand data. Run after any agent write or manually to refresh the Component Docs section.",
    file: "~/.claude/skills/sync-docs/SKILL.md",
    triggersAgent: "Echo",
    category: "tools",
    group: "utilities",
    mcp: { required: [] },
    promptContent: `---
description: Sync all documentation entries in lib/data/docs.ts from live component, token, and brand data
disable-model-invocation: true
argument-hint: "[scope] (optional: path to a single component file)"
---

Sync all documentation entries in lib/data/docs.ts.

## Steps

1. Read \`lib/data/components.ts\`, \`lib/data/tokens.ts\`, and \`lib/data/brands.ts\` to get the current design system inventory.

2. For each component or token group, read the relevant source file (e.g. \`src/components/ui/<name>.tsx\`) to extract:
   - Props interface / TypeScript types
   - Token usage (CSS variable references)
   - Export names and variants

3. Diff against existing entries in \`lib/data/docs.ts\`:
   - **stale**: entry exists but source file was modified >7 days ago vs \`writtenAt\`
   - **drifted**: entry exists but props or tokens have changed since last write
   - **missing**: component exists in components.ts but has no docs entry
   - **current**: entry is up to date

4. Before writing, show the user a summary and request HITL approval.

5. On approval, update \`lib/data/docs.ts\`:
   - Set \`status\` from the diff result above
   - Set \`coverageScore\` = (documented props / total props) * 100
   - Set \`writtenBy: "doc-sync"\`, \`writtenAt: <now ISO>\`, \`runId: <uuid>\`

6. Emit a completion summary: N created, M updated, K unchanged.

## Scope

If \`$ARGUMENTS\` contains a file path, scope the sync to that single component only.`,
  },
  {
    command: "/token-source-audit",
    name: "Token Source Audit",
    description: "Detect hardcoded hex values in Figma variable collections and migrate them to oklch() values referencing semantic Tailwind or design system variables.",
    file: "~/.claude/skills/token-source-audit/SKILL.md",
    category: "pipeline",
    group: "quality",
    triggersAgent: "Flux",
    mcp: { required: ["figma-console-mcp", "figma-mcp"] },
    promptContent: `You are executing the **Token Source Audit** workflow.

## Goal
Find all hardcoded hex/rgb color values in the Figma variable collection and replace them with:
1. oklch() color values (the project standard)
2. Aliases to semantic variables in the TailwindCSS or other existing collections where a perceptual match exists

## Context
- The Figma file may have a "Theme" collection with 235+ variables using raw hex values (e.g. FACC15, 000000, FFFFFF)
- A "TailwindCSS" collection with 440 variables already exists — prefer aliasing to these
- The codebase uses oklch() in globals.css as the canonical token format
- Target collection: $ARGUMENTS (default: "Theme")

## Steps

### 1. Extract current state
Use figma_get_variables (Console MCP) to fetch all variables in the target collection.
For each variable, record:
- Name, type, current value (hex or variable alias)
- Whether it is already aliased to another variable or is a raw hardcoded value

### 2. Identify hardcoded values
Filter to variables where the value is a raw hex/rgb color (not a variable reference).
These are the drift candidates.

### 3. Match to TailwindCSS collection
For each hardcoded color:
a. Convert hex → oklch using the standard formula
b. Search the TailwindCSS collection for a variable whose value is within ΔE < 3 (perceptually identical)
c. If found: propose aliasing to that TailwindCSS variable
d. If not found: propose using the oklch() value directly

### 4. Present the diff table
Show a structured table before making any changes:

| Variable | Current Value | Proposed Change | Type |
|---|---|---|---|
| accent-light | #FACC15 | alias → tailwind/yellow-400 (oklch: 0.85 0.19 98) | alias |
| background-dark | #000000 | oklch(0% 0 0) | oklch |

Label each row:
- ✅ alias found — will link to TailwindCSS variable
- 🔄 oklch only — no matching Tailwind variable, will use raw oklch()
- ⚠️ semantic mismatch — closest Tailwind variable has different semantic meaning, verify manually

### 5. HITL gate — STOP HERE
Present the full diff to the user. Do NOT apply any changes until explicitly approved.
Ask: "Apply these N changes? (yes / select specific rows / cancel)"

### 6. Apply approved changes
For approved rows, use figma_batch_update_variables to:
- Set aliased variables to reference their matched TailwindCSS counterpart
- Set oklch-only variables to the calculated oklch() string

### 7. Verify
Re-fetch the updated variables and confirm all previously hardcoded values are now either aliased or oklch-formatted.
Report: N aliased, M converted to oklch, K skipped.

## Quality rules
- Never change the semantic role of a variable (accent stays accent)
- For Light/Dark mode pairs, handle both modes — don't only update one
- oklch values must use 4 significant figures: oklch(L% C H)
- If a variable is already aliased, skip it (it's already correct)
- Prefer TailwindCSS variable aliases over raw oklch() values when ΔE < 3`,
  },
];

// ── HITL tasks (pending human review) ────────────────────────────────────────

export const hitlTasks: HitlTask[] = [
  {
    id: "hitl-001",
    agentId: "token-sync",
    skill: "/tokens",
    skillColor: "teal",
    title: "Token Diff — 4 changes",
    type: "token-diff",
    description: "Token Sync detected 3 new tokens and 1 updated value in the Figma file. Review before writing to globals.css.",
    priority: "high",
    createdAt: "2026-03-10T09:44:00Z",
    meta: { added: 3, updated: 1, removed: 0 },
  },
  {
    id: "hitl-002",
    agentId: "figma-to-code",
    skill: "/figma",
    skillColor: "violet",
    title: "Component Review — Badge.tsx",
    type: "code-review",
    description: "/figma produced Badge.tsx from Figma node 22:104. 47 lines, 6 tokens mapped, drift score 0. Ready to write.",
    priority: "high",
    createdAt: "2026-03-10T09:31:00Z",
    meta: { lines: 47, tokens: 6, driftScore: 0 },
  },
  {
    id: "hitl-003",
    agentId: "design-drift-detector",
    skill: "/drift-report",
    skillColor: "amber",
    title: "Drift Report — 7 critical",
    type: "drift-report",
    description: "Drift Detector audited 42 components. 7 critical drift instances found in Badge and Table. 5 are auto-fixable.",
    priority: "medium",
    createdAt: "2026-03-10T08:34:00Z",
    meta: { audited: 42, critical: 7, autoFixable: 5 },
  },
  {
    id: "hitl-004",
    agentId: "storybook-agent",
    skill: "/storybook",
    skillColor: "emerald",
    title: "Storybook Verify — Button",
    type: "storybook-verify",
    description: "Storybook agent compared Button stories against Figma spec. Border-radius mismatch on 'ghost' variant — 2px vs expected 6px.",
    priority: "medium",
    createdAt: "2026-03-10T08:15:00Z",
    meta: { driftInstances: 1, component: "Button" },
  },
  {
    id: "hitl-005",
    agentId: "deploy-agent",
    skill: "/deploy",
    skillColor: "slate",
    title: "Deploy Preview Ready",
    type: "deploy-preview",
    description: "Ship built Storybook successfully. Preview URL ready to promote to staging.",
    priority: "low",
    createdAt: "2026-03-10T07:50:00Z",
    meta: {},
  },
];

// ── Live feed events ──────────────────────────────────────────────────────────
// TODO: replace with live read from .systemix/sync-log.json via API route (BAST-55)

export const feedEvents: FeedEvent[] = [
  {
    id: "evt-001",
    agentId: "figma-to-code",
    skill: "/design-to-code",
    skillColor: "violet",
    type: "step-start",
    content: "Running /design-to-code",
    subContent: "figma.com/design/Xk9p2m…?node-id=22:104",
    step: 1,
    totalSteps: 6,
    timestamp: "2026-03-10T09:28:00Z",
  },
  {
    id: "evt-002",
    agentId: "figma-to-code",
    skill: "/design-to-code",
    skillColor: "violet",
    type: "tool-call",
    content: "get_design_context",
    subContent: "fileKey: \"Xk9p2m\", nodeId: \"22:104\"",
    toolName: "get_design_context",
    mcpServer: "figma-console-mcp",
    timestamp: "2026-03-10T09:28:04Z",
  },
  {
    id: "evt-003",
    agentId: "figma-to-code",
    skill: "/design-to-code",
    skillColor: "violet",
    type: "tool-result",
    content: "Component: Badge (component)",
    subContent: "Tokens: --color-primary, --color-bg-subtle, --radius-sm\nVariants: solid, outline, ghost · States: default, hover, disabled",
    toolName: "get_design_context",
    mcpServer: "figma-console-mcp",
    timestamp: "2026-03-10T09:28:07Z",
  },
  {
    id: "evt-004",
    agentId: "figma-to-code",
    skill: "/design-to-code",
    skillColor: "violet",
    type: "tool-call",
    content: "get_variable_defs",
    subContent: "fileKey: \"Xk9p2m\"",
    toolName: "get_variable_defs",
    mcpServer: "figma-console-mcp",
    timestamp: "2026-03-10T09:28:09Z",
  },
  {
    id: "evt-005",
    agentId: "figma-to-code",
    skill: "/design-to-code",
    skillColor: "violet",
    type: "step-start",
    content: "Syncing tokens",
    subContent: "Diffing Figma variables against globals.css",
    step: 2,
    totalSteps: 6,
    timestamp: "2026-03-10T09:28:15Z",
  },
  {
    id: "evt-006",
    agentId: "figma-to-code",
    skill: "/design-to-code",
    skillColor: "violet",
    type: "message",
    content: "3 new tokens detected · 1 value changed",
    subContent: "+ --color-badge-bg\n+ --color-badge-border\n+ --color-badge-text\n~ --radius-sm: 4px → 6px",
    timestamp: "2026-03-10T09:28:18Z",
  },
  {
    id: "evt-007",
    agentId: "figma-to-code",
    skill: "/design-to-code",
    skillColor: "violet",
    type: "awaiting-hitl",
    content: "Awaiting token diff approval before writing globals.css",
    timestamp: "2026-03-10T09:28:20Z",
  },
  {
    id: "evt-008",
    agentId: "design-drift-detector",
    skill: "/drift-report",
    skillColor: "amber",
    type: "step-start",
    content: "Running /drift-report",
    subContent: "Scanning src/components/ui/",
    step: 1,
    totalSteps: 4,
    timestamp: "2026-03-10T08:30:00Z",
  },
  {
    id: "evt-009",
    agentId: "design-drift-detector",
    skill: "/drift-report",
    skillColor: "amber",
    type: "file-read",
    content: "Scanning 42 components",
    subContent: "Grepping for hardcoded hex, px, rgba patterns",
    timestamp: "2026-03-10T08:30:05Z",
  },
  {
    id: "evt-010",
    agentId: "design-drift-detector",
    skill: "/drift-report",
    skillColor: "amber",
    type: "tool-call",
    content: "get_variable_defs",
    subContent: "Comparing Figma variables against codebase tokens",
    toolName: "get_variable_defs",
    mcpServer: "figma-console-mcp",
    timestamp: "2026-03-10T08:30:22Z",
  },
  {
    id: "evt-011",
    agentId: "design-drift-detector",
    skill: "/drift-report",
    skillColor: "amber",
    type: "message",
    content: "7 critical drift instances found",
    subContent: "badge.tsx:14 — #3B82F6 → --color-primary\ntable.tsx:67 — 16px → --spacing-4\ntable.tsx:89 — #F3F4F6 → --color-bg-subtle",
    timestamp: "2026-03-10T08:33:41Z",
  },
  {
    id: "evt-012",
    agentId: "design-drift-detector",
    skill: "/drift-report",
    skillColor: "amber",
    type: "awaiting-hitl",
    content: "Drift report ready — awaiting review",
    subContent: "7 critical · 5 auto-fixable",
    timestamp: "2026-03-10T08:34:00Z",
  },
  {
    id: "evt-013",
    agentId: "figma-to-code",
    skill: "/design-to-code",
    skillColor: "violet",
    type: "thinking",
    content: "Generating Badge.tsx",
    subContent: "Mapping variants to cva() — solid, outline, ghost",
    isActive: true,
    timestamp: "2026-03-10T09:30:00Z",
  },
];
