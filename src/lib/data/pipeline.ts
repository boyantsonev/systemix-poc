// AGENT-WRITTEN — pipeline.ts
// Updated by: all agents on completion

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

export type Skill = {
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
    command: "/sync-tokens",
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
    command: "/generate-from-figma",
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
    command: "/sync-tokens",
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
    command: "/generate-from-figma",
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
    command: "/sync-tokens",
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

export const skills: Skill[] = [
  {
    command: "/sync-docs [scope]",
    name: "Sync Docs",
    description: "Read all components, tokens, and brands — generate or refresh all documentation entries in lib/data/docs.ts. Run after any agent write or manually to refresh.",
    file: "~/.claude/commands/sync-docs.md",
    triggersAgent: "doc-sync",
    promptContent: `Sync all documentation entries in lib/data/docs.ts.\n\n## Instructions\n\nYou are executing the **Documentation sync** workflow. This keeps the /docs section of the Systemix dashboard in sync with the actual state of the design system.\n\n1. Read lib/data/components.ts, tokens.ts, and each source file.\n2. Diff against existing docs.ts entries — find stale, missing, and changed.\n3. Generate updated doc entries with props, tokens, summary, coverage score.\n4. HITL review: show what docs will be created/updated before writing.\n5. Write docs.ts with all updated entries.\n\n## Quality rules\n- Set status: drifted (has drift), draft (New component), stale (>7 days), current otherwise\n- Coverage score = % of props + tokens documented\n- writtenBy: "doc-sync", writtenAt: now, runId: current run ID`,
  },
  {
    command: "/generate-from-figma [URL]",
    name: "Generate from Figma",
    description: "Kick off component generation from a Figma node. Reads design context, maps to tokens, writes production component.",
    file: "~/.claude/commands/generate-from-figma.md",
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
    command: "/sync-tokens [URL]",
    name: "Sync Tokens",
    description: "Pull Figma variables into codebase token files. Diffs and shows changes before writing.",
    file: "~/.claude/commands/sync-tokens.md",
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
    file: "~/.claude/commands/drift-report.md",
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
    file: "~/.claude/commands/apply-theme.md",
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
    triggerSkill: "/generate-from-figma",
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
      "/generate-from-figma https://figma.com/design/abc/File?node-id=15-892",
      "/generate-from-figma  (paste URL when prompted)",
    ],
  },
  {
    name: "token-sync",
    displayName: "Token Sync",
    description: "Keeps Figma variables and codebase token files in lock-step. Fetches all variables from Figma, diffs against every token file in the codebase, and propagates changes — always showing a diff and confirming before any destructive write.",
    triggerSkill: "/sync-tokens",
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
      "/sync-tokens https://figma.com/design/abc/DesignSystem",
      "/sync-tokens  (paste Figma file URL when prompted)",
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
    command: "/figma [figma-url]",
    name: "Extract from Figma",
    description: "Run first. Extracts design context — tokens, layout, variants — from any Figma URL using Figma Console MCP.",
    file: ".claude/skills/figma/SKILL.md",
    triggersAgent: "figma-to-code",
    promptContent: `---
description: Extract design context from a Figma URL using Figma Console MCP
---

# /figma — Extract Design Context

Run this first. Shows exactly what Claude sees before generating anything.

## Steps

1. Parse the Figma URL to extract fileKey and nodeId
2. Call \`get_design_context\` with fileKey and nodeId
3. Call \`get_variable_defs\` with fileKey and nodeId to extract all design tokens
4. Call \`get_screenshot\` for a visual reference
5. Output a structured summary:
   - Component: [name] ([type]), Node ID
   - Tokens: color, spacing, radius mapped to CSS vars
   - Layout: direction, gap, padding
   - Variants: all variant properties and values
   - States: default, hover, disabled, active, loading
6. Flag any hardcoded values not referencing a Figma variable

## Notes
- Figma Desktop + Bridge Plugin must be running for write operations
- If get_design_context returns incomplete data, try get_metadata first
- Node ID format: use 123:456 not 123-456`,
  },
  {
    command: "/tokens [figma-url]",
    name: "Sync Tokens",
    description: "Compares Figma variables against your CSS token file. Adds new tokens, updates changed values, flags removed ones with [REMOVED].",
    file: ".claude/skills/tokens/SKILL.md",
    triggersAgent: "token-sync",
    promptContent: `---
description: Sync Figma design tokens to CSS custom properties
---

# /tokens — Sync Design Tokens

## Usage
\`\`\`
/tokens [figma-url]
/tokens [figma-url] --file src/styles/globals.css
\`\`\`

## Steps
1. Call \`get_variable_defs\` with the Figma fileKey
2. Read the existing token file (default: src/styles/globals.css)
3. Build a diff: New tokens / Updated tokens / Removed tokens
4. Apply naming convention: color/primary/default → --color-primary-default
5. Write updates — never delete, comment removed: /* [REMOVED] --token-name: value; */
6. Output: Tokens synced: N added, N updated, N flagged

## Notes
- Preserve :root block structure and comments
- Figma mode "Light" → :root, "Dark" → .dark or [data-theme="dark"]
- Run before /component to ensure all CSS var references are current`,
  },
  {
    command: "/component [figma-url]",
    name: "Generate Component",
    description: "Generates a production-ready React TypeScript component and Storybook story from a Figma URL.",
    file: ".claude/skills/component/SKILL.md",
    triggersAgent: "figma-to-code",
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
1. Run /figma [url] to extract design context
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
- Never use Tailwind text-blue-500 — always: text-[var(--color-primary)]
- Component file = named export + default export`,
  },
  {
    command: "/storybook [Component]",
    name: "Read & Verify Stories",
    description: "Read, verify, and update Storybook stories via Storybook MCP. Compares screenshots against Figma spec.",
    file: ".claude/skills/storybook/SKILL.md",
    triggersAgent: "storybook-agent",
    promptContent: `---
description: Read, verify, and update Storybook stories via Storybook MCP
---

# /storybook — Read, Verify, Update Stories

## Usage
\`\`\`
/storybook                                    # list all components
/storybook [Component]                        # inspect a component
/storybook [Component] --verify [figma-url]  # compare vs Figma
/storybook [Component] --fix                 # update story to match Figma
\`\`\`

## Steps
- List: list-all-components + list-all-documentation
- Inspect: get-documentation + get-story-urls + screenshot
- Verify: compare screenshots vs Figma spec — report drift
- Fix: token mismatch → update CSS var, missing story → add StoryObj

## Notes
- Requires Storybook running at localhost:6006
- Do not delete existing stories without explicit confirmation`,
  },
  {
    command: "/deploy",
    name: "Build & Deploy Preview",
    description: "Builds the project and deploys a Storybook or app preview to Vercel. Returns a preview URL.",
    file: ".claude/skills/deploy/SKILL.md",
    triggersAgent: "deploy-agent",
    promptContent: `---
description: Build and deploy a component preview to Vercel
---

# /deploy — Build & Deploy Preview

## Steps
1. Check package.json for build command (build or build-storybook)
2. Run: npm run build OR npm run build-storybook
3. Fix any build errors before deploying
4. Run: vercel --yes (or: vercel storybook-static/ --yes)
5. Capture the preview URL from Vercel CLI output
6. Output: Build checkmark / Deployed: https://project-abc123.vercel.app

## Notes
- vercel CLI required: npm i -g vercel
- First run: vercel link to connect the project`,
  },
  {
    command: "/push-tokens [figma-url]",
    name: "Push Tokens to Figma",
    description: "Read .systemix/tokens.bridge.json and create or update Figma Variables (Semantic, Status, Spacing & Radius collections) with light + dark mode values.",
    file: "~/.claude/commands/push-tokens.md",
    triggersAgent: "token-sync",
    promptContent: `---
description: Push codebase tokens to Figma Variables via Plugin API — creates/updates collections with light and dark mode values
---

# /push-tokens — Push Tokens to Figma Variables

## Prerequisites
- Figma Desktop open with the target file active
- Figma Console MCP connected (port 3845)
- Run \`npx tsx scripts/token-converter.ts\` first if .systemix/tokens.bridge.json is missing or stale

## Usage
\`\`\`
/push-tokens                            # uses fileKey from .systemix/systemix.json
/push-tokens https://figma.com/...     # explicit Figma file URL
\`\`\`

## Steps

1. **Read the bridge file**: Parse \`.systemix/tokens.bridge.json\`. Group tokens by \`figma.collection\`.

2. **Check current state**: Call \`figma_get_variables\` to get existing collections and variables. Identify what needs creating vs updating.

3. **HITL gate**: Show the user:
   - X variables to create in Y collections
   - Z variables to update (current value → new value)
   - Any variables that will be deleted (require explicit confirmation)
   Pause for approval before writing anything.

4. **Execute via Plugin API** using \`use_figma\` with the following JS pattern:

\`\`\`js
// For each collection: create if missing, get modeIds
const col = figma.variables.createVariableCollection("Semantic");
const lightModeId = col.modes[0].modeId;
const darkModeId = col.addMode("Dark");

// For each token in collection:
const v = figma.variables.createVariable("color/background", col, "COLOR");
v.setValueForMode(lightModeId, { r: 1, g: 1, b: 1, a: 1 });
v.setValueForMode(darkModeId, { r: 0.0394, g: 0.0394, b: 0.0394, a: 1 });
\`\`\`

5. **Write results back**: Update \`.systemix/tokens.bridge.json\` — set \`figma.syncStatus: "synced"\` and record \`figma.variableId\` for each pushed variable. Update \`.systemix/systemix.json\` lastSync timestamp and figma.collections modeIds/variableIds.

6. **Report**:
   - Collections created/updated
   - Variables created: X, updated: Y
   - Link to the Figma file

## Error handling
- If a variable already exists with a different type, skip and warn — never delete without confirmation
- If Figma Desktop is not running, print instructions to open it`,
  },
  {
    command: "/capture-to-figma [localhost-url] [figma-url]",
    name: "Capture to Figma",
    description: "Extract live DOM from a localhost page using Playwright, convert layout and styles to Figma layers, and push editable Frame/Text/Rect nodes onto the canvas with variable bindings.",
    file: "~/.claude/commands/capture-to-figma.md",
    triggersAgent: "figma-to-code",
    promptContent: `---
description: Capture a localhost page as editable Figma canvas layers — not a screenshot, real vector/text nodes with variable bindings
---

# /capture-to-figma — Capture localhost as Editable Figma Layers

## Prerequisites
- Figma Desktop open with the target file active
- Playwright installed (\`npm install -D playwright @playwright/test\`)
- Localhost server running

## Usage
\`\`\`
/capture-to-figma http://localhost:3000/components/button
/capture-to-figma http://localhost:3000 https://figma.com/design/...?node-id=1:2
\`\`\`

## Steps

1. **Parse arguments**: Extract localhost URL and optional Figma target URL.

2. **DOM extraction via Playwright**: Launch headless Chromium, navigate to the URL. Run \`page.evaluate()\` to extract a JSON snapshot of the DOM:
   - \`getBoundingClientRect()\` for position and dimensions
   - \`getComputedStyle()\` for background, color, font-size, font-weight, border-radius, padding, border
   - Text content for text nodes
   Focus on the top-level component or a visible viewport region (max 50 nodes to keep the Figma canvas clean).

3. **CSS → Figma mapping**:
   - \`background-color / color\` → check .systemix/tokens.bridge.json for a matching hex — if found, bind to Figma Variable; otherwise use raw RGB
   - \`font-size\` px → Figma fontSize (number)
   - \`font-weight\` → Figma fontStyle ("Bold", "Regular", etc.)
   - \`border-radius\` px → Figma cornerRadius
   - \`border\` → Figma strokes with weight

4. **HITL gate**: Show the user:
   - A summary of what will be created (N frames, M text nodes, X variable bindings)
   - Any values that couldn't be mapped to a token (will be hardcoded in Figma)
   Wait for approval.

5. **Push to Figma via \`use_figma\`**: Generate and execute Plugin API JS:

\`\`\`js
const page = figma.currentPage;
const frame = figma.createFrame();
frame.name = "Capture — Button";
frame.x = 0; frame.y = 0;
frame.resize(320, 48);
// Set fill with variable binding:
figma.variables.setBoundVariableForPaint(fill, "color", backgroundVariable);
frame.fills = [fill];
// Add text child:
const txt = figma.createText();
await figma.loadFontAsync({ family: "Inter", style: "Regular" });
txt.characters = "Submit";
txt.fontSize = 14;
frame.appendChild(txt);
page.appendChild(frame);
\`\`\`

6. **Report**: List all created nodes, which tokens were bound as variables, and any values that remain hardcoded.

## Notes
- Creates vector/text layers — fully editable in Figma, not a rasterized image
- Variable bindings require tokens to be pushed first via \`/push-tokens\`
- For complex layouts, consider scoping to a specific component selector via \`$ARGUMENTS\``,
  },
  {
    command: "/figma-inspect [figma-url]",
    name: "Inspect Figma Node",
    description: "Inspect the current Figma selection or a given node URL. Returns component name, design tokens, layout, variants, and Code Connect mapping.",
    file: "~/.claude/commands/figma-inspect.md",
    triggersAgent: "figma-to-code",
    promptContent: `---
description: Inspect a Figma node — properties, design tokens, layout, variants, Code Connect
---

# /figma-inspect — Inspect Figma Node

## Usage
\`\`\`
/figma-inspect                          # inspects current Figma Desktop selection
/figma-inspect https://figma.com/...   # inspects a specific node by URL
\`\`\`

## Steps
1. **Resolve target**: If \`$ARGUMENTS\` contains a Figma URL, extract fileKey + nodeId (convert \`-\` to \`:\` in node-id). Otherwise read the current selection.

2. **Fetch design context**: Call \`mcp__figma-desktop__get_design_context\` with fileKey + nodeId to get component spec, token usage, layout, and Code Connect mappings.

3. **Fetch screenshot**: Call \`mcp__figma-desktop__get_screenshot\` for visual reference.

4. **Cross-reference with bridge file**: Read \`.systemix/tokens.bridge.json\`. For each color/value in the Figma node, check if there's a matching token. Flag any values with no token match.

5. **Output structured report**:
   - Component name, type, node ID
   - Dimensions (width × height)
   - Design tokens used (CSS var → current value → Figma variable name)
   - Layout (Auto Layout direction, gap, padding, alignment)
   - Variants and current variant values
   - Code Connect: mapped codebase component path (if configured)
   - Drift flags: Figma values that don't match current codebase token values

## Notes
- Requires Figma Desktop open
- Node ID format: always \`123:456\` not \`123-456\`
- Cross-references .systemix/tokens.bridge.json to surface design-code drift`,
  },
  {
    command: "/sync [figma-url]",
    name: "Full Sync (Orchestrator)",
    description: "Run the full bidirectional sync: pull Figma tokens → update globals.css → push Variables back to Figma → run drift report. One command, full loop.",
    file: "~/.claude/commands/sync.md",
    triggersAgent: "token-sync",
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
7. **Push to Figma**: Execute Plugin API JS to sync Variable values back (same as \`/push-tokens\`)
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
- If only one direction is needed, use \`/sync-tokens\` (Figma → code) or \`/push-tokens\` (code → Figma)
- Drift check is a fast static scan only — run \`/drift-report\` for a full audit`,
  },
  {
    command: "/design-to-code [figma-url]",
    name: "Full Pipeline",
    description: "Full pipeline: Figma URL to live deployed preview. Runs /figma → /tokens → /component → /storybook → /deploy in sequence.",
    file: ".claude/skills/design-to-code/SKILL.md",
    triggersAgent: "figma-to-code",
    promptContent: `---
description: Full pipeline — Figma URL to live deployed preview
---

# /design-to-code — Full Pipeline

## Usage
\`\`\`
/design-to-code [figma-url] [--skip-deploy] [--fix]
\`\`\`

## Steps
1. Extract  — Run /figma: get_design_context, get_variable_defs, screenshot
2. Sync     — Run /tokens: diff Figma vars vs CSS, write new/updated tokens
3. Generate — Run /component: write .tsx + .stories.tsx, tsc --noEmit
4. Verify   — Run /storybook --verify: screenshot compare vs Figma spec
5. Deploy   — Run /deploy: build, vercel --yes, return preview URL
6. Summary  — Tokens / Component / Story / No drift / Deployed URL

## Flags: --skip-deploy, --skip-verify, --fix, --name, --dir
## Idempotent: safe to re-run from any step`,
  },
];

// ── HITL tasks (pending human review) ────────────────────────────────────────

export const hitlTasks: HitlTask[] = [
  {
    id: "hitl-001",
    agentId: "token-sync",
    skill: "/sync-tokens",
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
    skill: "/generate-from-figma",
    skillColor: "violet",
    title: "Component Review — Badge.tsx",
    type: "code-review",
    description: "/generate-from-figma produced Badge.tsx from Figma node 22:104. 47 lines, 6 tokens mapped, drift score 0. Ready to write.",
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
