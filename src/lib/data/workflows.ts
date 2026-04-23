// Workflow definitions for the visual pipeline builder
// Static — defines the DAG structure. Runtime state lives in WorkflowBuilder component.

import type { StepIOContract, WorkflowContext } from "@/lib/workflow/step-io";
import type { ConditionalBranchNode } from "@/lib/workflow/branching";

export type NodeType = "trigger" | "skill" | "hitl" | "output";

export type NodeStatus =
  | "idle"
  | "pending"
  | "running"
  | "done"
  | "error"
  | "awaiting-approval"
  | "approved"
  | "rejected";

// ── HITL Payload types — structured data rendered in HitlApprovalCard ────────

export type HitlPayloadDiff = {
  type: "token-diff";
  summary: string;
  affectedFiles: string[];
  affectedComponents: string[];
  added: { key: string; value: string }[];
  changed: { key: string; from: string; to: string }[];
  removed: { key: string; lastValue: string }[];
};

export type HitlPayloadCodeReview = {
  type: "code-review";
  componentName: string;
  proposedPath: string;
  lineCount: number;
  tokensUsed: string[];
  driftScore: number;
  generatedCode: string;
};

export type HitlPayloadDocsReview = {
  type: "docs-review";
  summary: string;
  docsWritten: {
    slug: string;
    type: "component" | "variable-group";
    title: string;
    action: "created" | "updated";
    statusChanged?: string;
  }[];
};

export type HitlPayloadDriftReport = {
  type: "drift-report";
  scope: string;
  componentsAudited: number;
  componentsDrifted: number;
  totalInstances: number;
  critical: { file: string; line: number; value: string; token: string }[];
  autoFixable: number;
};

export type HitlPayload =
  | HitlPayloadDiff
  | HitlPayloadCodeReview
  | HitlPayloadDocsReview
  | HitlPayloadDriftReport;

// ── Node & Workflow types ─────────────────────────────────────────────────────

export type WorkflowNodeDef = {
  id: string;
  type: NodeType;
  label: string;
  sublabel?: string;
  description: string;
  agentName?: string;
  skillCommand?: string;
  position: { x: number; y: number };
  durationMs?: number;
  approvalPrompt?: string;         // fallback plain-text prompt (legacy)
  hitlPayload?: HitlPayload;       // structured payload for rich HITL cards
  simulatedLog?: string[];
  ioContract?: StepIOContract;     // typed inter-step data passing contract
  branchNode?: ConditionalBranchNode; // conditional branching after this step
};

export type WorkflowEdgeDef = {
  id: string;
  from: string;
  to: string;
};

export type WorkflowDef = {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNodeDef[];
  edges: WorkflowEdgeDef[];
};

export type WorkflowRun = {
  id: string;
  workflowId: string;
  startedAt: string;        // ISO timestamp
  status: "running" | "done" | "error" | "awaiting-approval";
  context?: WorkflowContext; // inter-step data produced during this run
};

// Canvas layout constants
export const NODE_W = 148;
export const NODE_H = 72;
export const CANVAS_H = 400;

const GAP = 208;
const ROW_Y = 164;
const X0 = 40;

export const workflows: WorkflowDef[] = [

  // ── 1. Token Sync Pipeline ─────────────────────────────────────────────────
  {
    id: "token-sync",
    name: "Token Sync",
    description:
      "Pulls Figma variables into codebase token files. Diffs, shows changes, waits for human approval, then writes. Updates docs.ts on completion.",
    nodes: [
      {
        id: "ts-trigger",
        type: "trigger",
        label: "Figma Change",
        sublabel: "Manual / scheduled",
        description: "Detected change in Figma variables or manually triggered from the dashboard.",
        position: { x: X0, y: ROW_Y },
        simulatedLog: ["Trigger received — starting token sync workflow"],
      },
      {
        id: "ts-fetch",
        type: "skill",
        label: "Fetch Variables",
        sublabel: "/tokens",
        description:
          "Pulls all Figma variables via MCP (get_variable_defs) and diffs against every token file in the codebase.",
        agentName: "token-sync",
        skillCommand: "/tokens",
        position: { x: X0 + GAP, y: ROW_Y },
        durationMs: 2400,
        simulatedLog: [
          "Connecting to Figma MCP...",
          "Fetched 174 variables from Figma file",
          "Scanning codebase token files...",
          "Found: globals.css, lib/data/tokens.ts",
          "Diff computed — 4 changes detected",
          "+ --color-primary-700",
          "~ --color-accent  #a855f7 → #9333ea",
          "~ --radius-lg  0.75rem → 0.625rem",
          "- --color-deprecated-muted",
        ],
      },
      {
        id: "ts-hitl",
        type: "hitl",
        label: "Review Diff",
        sublabel: "Approval required",
        description: "Human review of token changes before they are written to disk.",
        position: { x: X0 + GAP * 2, y: ROW_Y },
        simulatedLog: ["Paused — waiting for human review of diff"],
        hitlPayload: {
          type: "token-diff",
          summary: "Apply 4 token changes to globals.css and lib/data/tokens.ts?",
          affectedFiles: ["src/app/globals.css", "src/lib/data/tokens.ts"],
          affectedComponents: ["Button", "Badge", "Progress"],
          added: [
            { key: "--color-primary-700", value: "oklch(0.38 0.2 261)" },
          ],
          changed: [
            { key: "--color-accent", from: "#a855f7", to: "#9333ea" },
            { key: "--radius-lg", from: "0.75rem", to: "0.625rem" },
          ],
          removed: [
            { key: "--color-deprecated-muted", lastValue: "rgba(255,255,255,0.04)" },
          ],
        },
      },
      {
        id: "ts-write",
        type: "skill",
        label: "Write Tokens",
        sublabel: "Update token files",
        description: "Writes approved token changes to globals.css and lib/data/tokens.ts. Then updates lib/data/docs.ts with refreshed variable docs.",
        agentName: "token-sync",
        position: { x: X0 + GAP * 3, y: ROW_Y },
        durationMs: 1400,
        simulatedLog: [
          "Writing src/app/globals.css...",
          "Writing lib/data/tokens.ts...",
          "2 token files updated",
          "Refreshing lib/data/docs.ts — variable-group entries...",
          "  Updated: color-semantic (status: drifted → current)",
          "  Updated: typography (no change)",
          "lib/data/metrics.ts updated — drift score recalculated",
          "Token sync complete ✓",
        ],
      },
      {
        id: "ts-output",
        type: "output",
        label: "Tokens Updated",
        sublabel: "4 tokens · docs refreshed",
        description:
          "Token files updated. Drift score recalculated. Variable-group docs in lib/data/docs.ts reflect new sync state.",
        position: { x: X0 + GAP * 4, y: ROW_Y },
        durationMs: 400,
        simulatedLog: [
          "lib/data/tokens.ts — 4 tokens updated",
          "lib/data/docs.ts — 2 variable-group docs refreshed",
          "lib/data/metrics.ts — lastSynced updated",
          "Workflow complete ✓",
        ],
      },
    ],
    edges: [
      { id: "e1", from: "ts-trigger", to: "ts-fetch" },
      { id: "e2", from: "ts-fetch",   to: "ts-hitl"  },
      { id: "e3", from: "ts-hitl",    to: "ts-write" },
      { id: "e4", from: "ts-write",   to: "ts-output" },
    ],
  },

  // ── 2. Component Generation Pipeline ──────────────────────────────────────
  {
    id: "component-gen",
    name: "Component Gen",
    description:
      "Generates a production React component from a Figma node, runs a drift check, waits for review, then writes the file and updates docs.",
    nodes: [
      {
        id: "cg-trigger",
        type: "trigger",
        label: "Manual Trigger",
        sublabel: "Paste Figma URL",
        description: "User provides a Figma node URL to generate a component from.",
        position: { x: X0, y: ROW_Y },
        simulatedLog: ["Trigger received — starting component generation workflow"],
      },
      {
        id: "cg-generate",
        type: "skill",
        label: "Generate Component",
        sublabel: "/figma",
        description:
          "Reads Figma design context, maps design values to project tokens, generates a production React component with TypeScript types.",
        agentName: "figma-to-code",
        skillCommand: "/figma",
        position: { x: X0 + GAP, y: ROW_Y },
        durationMs: 3200,
        simulatedLog: [
          "Fetching Figma node 15:892...",
          "Design context loaded — AlertCard component",
          "Scanning codebase for conventions...",
          "Detected: React 19, shadcn/ui, Tailwind v4, CSS custom properties",
          "Mapping 6 design values to project tokens...",
          "  --color-surface → background",
          "  --color-border → border-color",
          "  --color-danger → icon-color (error variant)",
          "  --radius-lg → border-radius",
          "  --spacing-4 → padding-x",
          "  --spacing-3 → padding-y",
          "Generating AlertCard.tsx (87 lines)...",
          "Component generated — 0 hardcoded values",
        ],
      },
      {
        id: "cg-drift",
        type: "skill",
        label: "Drift Check",
        sublabel: "/drift-report",
        description:
          "Validates the generated component uses only token-mapped values — no hardcoded hex, px, or arbitrary values.",
        agentName: "design-drift-detector",
        skillCommand: "/drift-report",
        position: { x: X0 + GAP * 2, y: ROW_Y },
        durationMs: 1200,
        simulatedLog: [
          "Scanning AlertCard.tsx for drift...",
          "Checking hex colors: 0 found ✓",
          "Checking arbitrary px values: 0 found ✓",
          "Checking token coverage: 6/6 values mapped ✓",
          "Drift score: 0 — component is clean ✓",
        ],
      },
      {
        id: "cg-hitl",
        type: "hitl",
        label: "Review Component",
        sublabel: "Approval required",
        description:
          "Human reviews the generated component code and drift report before the file is written to disk.",
        position: { x: X0 + GAP * 3, y: ROW_Y },
        simulatedLog: ["Paused — waiting for human review of generated component"],
        hitlPayload: {
          type: "code-review",
          componentName: "AlertCard",
          proposedPath: "src/components/ui/AlertCard.tsx",
          lineCount: 87,
          tokensUsed: [
            "--color-surface",
            "--color-border",
            "--color-danger",
            "--color-success",
            "--radius-lg",
            "--spacing-4",
          ],
          driftScore: 0,
          generatedCode: `import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react"

const alertVariants = cva(
  "relative w-full rounded-[--radius-lg] border px-[--spacing-4] py-[--spacing-3] text-sm",
  {
    variants: {
      variant: {
        default: "bg-[--color-surface] border-[--color-border] text-foreground",
        success: "bg-emerald-950/20 border-emerald-500/30 text-emerald-300",
        warning: "bg-amber-950/20 border-amber-500/30 text-amber-300",
        error:   "bg-red-950/20 border-red-500/30 text-red-300",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

const icons = {
  default: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
}

export interface AlertCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string
}

export function AlertCard({ className, variant, title, children, ...props }: AlertCardProps) {
  const Icon = icons[variant ?? "default"]
  return (
    <div className={cn(alertVariants({ variant }), className)} role="alert" {...props}>
      <div className="flex gap-3">
        <Icon size={16} className="mt-0.5 shrink-0" aria-hidden />
        <div>
          {title && <p className="mb-1 font-medium leading-none">{title}</p>}
          <p className="text-[0.8rem] opacity-80">{children}</p>
        </div>
      </div>
    </div>
  )
}`,
        },
      },
      {
        id: "cg-docs",
        type: "skill",
        label: "Write Docs",
        sublabel: "/sync-docs",
        description: "After approval, doc-sync agent writes the new component documentation entry to lib/data/docs.ts.",
        agentName: "doc-sync",
        skillCommand: "/sync-docs",
        position: { x: X0 + GAP * 4, y: ROW_Y },
        durationMs: 900,
        simulatedLog: [
          "Reading AlertCard.tsx — extracting props, tokens...",
          "Writing lib/data/docs.ts — new entry: alertcard",
          "  type: component",
          "  status: draft",
          "  props: 3 extracted",
          "  tokens: 6 mapped",
          "  writtenBy: doc-sync",
          "Writing lib/data/components.ts — status: New",
          "Documentation written ✓",
        ],
      },
      {
        id: "cg-output",
        type: "output",
        label: "Component Written",
        sublabel: "src/components/ui/",
        description:
          "Component file written. Docs updated in lib/data/docs.ts. lib/data/components.ts status set to New. Ready for code review.",
        position: { x: X0 + GAP * 5, y: ROW_Y },
        durationMs: 300,
        simulatedLog: [
          "src/components/ui/AlertCard.tsx written ✓",
          "lib/data/components.ts — status: New",
          "lib/data/docs.ts — alertcard entry created",
          "Workflow complete ✓",
        ],
      },
    ],
    edges: [
      { id: "e1", from: "cg-trigger",  to: "cg-generate" },
      { id: "e2", from: "cg-generate", to: "cg-drift"    },
      { id: "e3", from: "cg-drift",    to: "cg-hitl"     },
      { id: "e4", from: "cg-hitl",     to: "cg-docs"     },
      { id: "e5", from: "cg-docs",     to: "cg-output"   },
    ],
  },

  // ── 3. Doc Sync Pipeline ───────────────────────────────────────────────────
  {
    id: "doc-sync",
    name: "Doc Sync",
    description:
      "Reads all components, tokens, and brands — generates or refreshes documentation entries in lib/data/docs.ts. HITL review before writing.",
    nodes: [
      {
        id: "ds-trigger",
        type: "trigger",
        label: "Manual / Post-Run",
        sublabel: "Triggered after agent run",
        description: "Triggered manually via /sync-docs or automatically after any agent completes a write.",
        position: { x: X0, y: ROW_Y },
        simulatedLog: ["Trigger received — starting doc sync workflow"],
      },
      {
        id: "ds-read",
        type: "skill",
        label: "Read Sources",
        sublabel: "/sync-docs",
        description:
          "doc-sync agent reads all component, token, and brand data files. Scans source files for props and token usage. Diffs against existing docs.ts entries.",
        agentName: "doc-sync",
        skillCommand: "/sync-docs",
        position: { x: X0 + GAP, y: ROW_Y },
        durationMs: 2800,
        simulatedLog: [
          "Reading lib/data/components.ts — 8 components",
          "Reading lib/data/tokens.ts — 38 tokens",
          "Reading source files for prop extraction...",
          "  src/components/ui/button.tsx — 6 props extracted",
          "  src/components/ui/badge.tsx — 2 props extracted",
          "  src/components/ui/card.tsx — 2 props extracted",
          "  src/components/ui/table.tsx — 1 prop extracted",
          "  src/components/ui/progress.tsx — 3 props extracted",
          "Diffing against existing lib/data/docs.ts...",
          "  5 component docs: 3 up-to-date, 2 need refresh",
          "  3 variable-group docs: 1 stale, 2 up-to-date",
          "Doc diff complete — 3 updates queued",
        ],
      },
      {
        id: "ds-hitl",
        type: "hitl",
        label: "Review Doc Changes",
        sublabel: "Approval required",
        description: "Human reviews what documentation will be created or updated before docs.ts is written.",
        position: { x: X0 + GAP * 2, y: ROW_Y },
        simulatedLog: ["Paused — waiting for human review of doc changes"],
        hitlPayload: {
          type: "docs-review",
          summary: "3 documentation entries will be updated in lib/data/docs.ts",
          docsWritten: [
            {
              slug: "badge",
              type: "component",
              title: "Badge",
              action: "updated",
              statusChanged: "current → drifted",
            },
            {
              slug: "table",
              type: "component",
              title: "Table",
              action: "updated",
              statusChanged: "current → drifted",
            },
            {
              slug: "color-semantic",
              type: "variable-group",
              title: "Semantic Colors",
              action: "updated",
              statusChanged: "current → drifted",
            },
          ],
        },
      },
      {
        id: "ds-write",
        type: "skill",
        label: "Write Docs",
        sublabel: "Update docs.ts",
        description: "Writes all updated documentation entries to lib/data/docs.ts with agent metadata.",
        agentName: "doc-sync",
        position: { x: X0 + GAP * 3, y: ROW_Y },
        durationMs: 1000,
        simulatedLog: [
          "Writing lib/data/docs.ts...",
          "  badge — status: drifted, writtenAt: now",
          "  table — status: drifted, writtenAt: now",
          "  color-semantic — status: drifted, writtenAt: now",
          "3 doc entries written ✓",
        ],
      },
      {
        id: "ds-output",
        type: "output",
        label: "Docs Updated",
        sublabel: "3 entries refreshed",
        description:
          "lib/data/docs.ts updated. /docs section of the dashboard now reflects current state.",
        position: { x: X0 + GAP * 4, y: ROW_Y },
        durationMs: 300,
        simulatedLog: [
          "lib/data/docs.ts — 3 entries updated",
          "Dashboard /docs section is now current",
          "Workflow complete ✓",
        ],
      },
    ],
    edges: [
      { id: "e1", from: "ds-trigger", to: "ds-read"   },
      { id: "e2", from: "ds-read",    to: "ds-hitl"   },
      { id: "e3", from: "ds-hitl",    to: "ds-write"  },
      { id: "e4", from: "ds-write",   to: "ds-output" },
    ],
  },
];
