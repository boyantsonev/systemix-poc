"use client";

import { useState } from "react";
import { LayoutTemplate, ChevronDown, GitBranch, Shuffle, Network, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Node, Edge } from "@xyflow/react";
import type { SkillNodeData } from "./SkillNode";

// ── Workflow type definitions ──────────────────────────────────────────────────

export type WorkflowType = "linear" | "parallel" | "orchestration";

const WORKFLOW_TYPES: Record<WorkflowType, { label: string; icon: React.ReactNode; color: string; explanation: string }> = {
  linear: {
    label: "Linear",
    icon: <ArrowRight size={11} />,
    color: "text-teal-400",
    explanation: "Steps run one after another. Each skill waits for the previous to complete before starting.",
  },
  parallel: {
    label: "Parallel",
    icon: <GitBranch size={11} />,
    color: "text-violet-400",
    explanation: "Multiple skills run simultaneously from a shared input. Results converge into a final step.",
  },
  orchestration: {
    label: "Orchestration",
    icon: <Network size={11} />,
    color: "text-amber-400",
    explanation: "A master skill coordinates sub-workflows dynamically based on context and decisions.",
  },
};

// ── Template definitions ───────────────────────────────────────────────────────

export type WorkflowTemplate = {
  id: string;
  name: string;
  type: WorkflowType;
  description: string;
  usedFor: string;
  nodes: Node[];
  edges: Edge[];
};

const E_STYLE = { stroke: "var(--color-teal, #14b8a6)", strokeWidth: 1.5, opacity: 0.5 };

function node(id: string, x: number, y: number, data: Partial<SkillNodeData> & { command: string; name: string; description: string }): Node {
  return {
    id,
    type: "skill",
    position: { x, y },
    data: { mcp: "none", status: "idle", hitl: false, ...data } satisfies SkillNodeData,
  };
}

function edge(id: string, source: string, target: string, hitl = false): Edge {
  return { id, source, target, animated: false, style: E_STYLE, ...(hitl ? { label: "↑ HITL", labelStyle: { fontSize: 8, fill: "#f59e0b" } } : {}) };
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  // ── 1. Figma → Component (linear) ─────────────────────────────────────────
  {
    id: "figma-to-component",
    name: "Figma → Component",
    type: "linear",
    description: "Extract design context, sync tokens, generate a React component, verify stories, deploy preview.",
    usedFor: "New component from Figma",
    nodes: [
      node("n1", 60,  160, { command: "/figma",     name: "Extract from Figma",  description: "Extract design context, tokens, screenshot.", mcp: "official", step: 1 }),
      node("n2", 320, 80,  { command: "/tokens",    name: "Sync Tokens",         description: "Diff Figma variables against globals.css.",   mcp: "official", step: 2, hitl: true }),
      node("n3", 580, 160, { command: "/component", name: "Generate Component",  description: "Generate React component + Storybook story.",  mcp: "official", step: 3, hitl: true }),
      node("n4", 840, 80,  { command: "/storybook", name: "Verify Stories",      description: "Read and update stories vs Figma spec.",        mcp: "none",     step: 4 }),
      node("n5", 1100, 160,{ command: "/deploy",    name: "Deploy Preview",      description: "Build and deploy to Vercel.",                  mcp: "none",     step: 5 }),
    ],
    edges: [
      edge("e1", "n1", "n2"), edge("e2", "n2", "n3"), edge("e3", "n3", "n4"), edge("e4", "n4", "n5"),
    ],
  },

  // ── 2. Token Sync Loop (linear) ────────────────────────────────────────────
  {
    id: "token-sync-loop",
    name: "Token Sync Loop",
    type: "linear",
    description: "Pull Figma variables, apply to CSS, check parity, push updates back to Figma. Daily maintenance.",
    usedFor: "Token drift prevention",
    nodes: [
      node("n1", 80,  200, { command: "/tokens",       name: "Sync Tokens",     description: "Pull Figma variables → globals.css.",        mcp: "official", step: 1 }),
      node("n2", 360, 200, { command: "/drift-report", name: "Drift Report",    description: "Audit for hardcoded values outside tokens.",  mcp: "none",     step: 2 }),
      node("n3", 640, 200, { command: "/check-parity", name: "Check Parity",    description: "Compare Figma vs codebase component by component.", mcp: "official", step: 3, hitl: true }),
      node("n4", 920, 200, { command: "/sync-to-figma",name: "Push to Figma",   description: "Push CSS token values back to Figma Variables.", mcp: "console", step: 4 }),
    ],
    edges: [
      edge("e1", "n1", "n2"), edge("e2", "n2", "n3"), edge("e3", "n3", "n4"),
    ],
  },

  // ── 3. Quick Audit (linear) ────────────────────────────────────────────────
  {
    id: "quick-audit",
    name: "Quick Audit",
    type: "linear",
    description: "Fast read-only audit: inspect a Figma node, check component parity, generate drift report. No writes.",
    usedFor: "Pre-sprint health check",
    nodes: [
      node("n1", 80,  200, { command: "/figma",        name: "Extract from Figma", description: "Read design context from a Figma URL.",       mcp: "official", step: 1 }),
      node("n2", 360, 200, { command: "/figma-inspect",name: "Inspect Node",       description: "Deep inspect current Figma selection.",       mcp: "official", step: 2 }),
      node("n3", 640, 200, { command: "/check-parity", name: "Check Parity",       description: "Detect drift between Figma and codebase.",    mcp: "official", step: 3 }),
      node("n4", 920, 200, { command: "/drift-report", name: "Drift Report",       description: "Audit full codebase for hardcoded values.",   mcp: "none",     step: 4 }),
    ],
    edges: [
      edge("e1", "n1", "n2"), edge("e2", "n2", "n3"), edge("e3", "n3", "n4"),
    ],
  },

  // ── 4. Multi-Brand Theme (parallel) ────────────────────────────────────────
  {
    id: "multi-brand-theme",
    name: "Multi-Brand Theme",
    type: "parallel",
    description: "Extract design once, apply semantic token overrides to 3 brand clients simultaneously, then deploy.",
    usedFor: "White-label client rollout",
    nodes: [
      node("n0", 60,  260, { command: "/figma",       name: "Extract from Figma", description: "Single design extract — shared across all brands.", mcp: "official", step: 1 }),
      node("n1", 340, 60,  { command: "/apply-theme", name: "Apply Theme — A",   description: "Override semantic tokens for brand A.",             mcp: "none",     hitl: true }),
      node("n2", 340, 260, { command: "/apply-theme", name: "Apply Theme — B",   description: "Override semantic tokens for brand B.",             mcp: "none",     hitl: true }),
      node("n3", 340, 460, { command: "/apply-theme", name: "Apply Theme — C",   description: "Override semantic tokens for brand C.",             mcp: "none",     hitl: true }),
      node("n4", 640, 260, { command: "/deploy",      name: "Deploy All",        description: "Build and deploy all three brand previews.",        mcp: "none",     step: 3 }),
    ],
    edges: [
      edge("ea", "n0", "n1"), edge("eb", "n0", "n2"), edge("ec", "n0", "n3"),
      edge("ed", "n1", "n4"), edge("ee", "n2", "n4"), edge("ef", "n3", "n4"),
    ],
  },

  // ── 5. Full Design Handoff (orchestration) ─────────────────────────────────
  {
    id: "full-handoff",
    name: "Full Design Handoff",
    type: "orchestration",
    description: "Master skill orchestrates the full Figma-to-deployed-code loop: parity check, tokens, component, Code Connect, build, deploy, annotate Figma.",
    usedFor: "End-to-end design handoff",
    nodes: [
      node("n1", 60,  200, { command: "/design-to-code", name: "Design to Code",   description: "Orchestrator: runs parity check, tokens, component, Code Connect, build.", mcp: "both",     step: 1, hitl: true }),
      node("n2", 380, 100, { command: "/connect",        name: "Link Components",  description: "Map new component file to the Figma node via Code Connect.",               mcp: "official", step: 2 }),
      node("n3", 380, 300, { command: "/figma-push",     name: "Push Screenshot",  description: "Capture localhost preview and place as image fill in Figma.",              mcp: "console",  step: 2 }),
      node("n4", 700, 200, { command: "/deploy",         name: "Deploy Preview",   description: "Build and push to Vercel — capture preview URL.",                          mcp: "none",     step: 3 }),
      node("n5", 960, 200, { command: "/deploy-annotate",name: "Annotate Figma",   description: "Post Vercel URL as a Figma comment — closes the loop.",                   mcp: "both",     step: 4 }),
    ],
    edges: [
      edge("e1", "n1", "n2"), edge("e2", "n1", "n3"),
      edge("e3", "n2", "n4"), edge("e4", "n3", "n4"),
      edge("e5", "n4", "n5"),
    ],
  },
];

// ── Template dropdown component ────────────────────────────────────────────────

type TemplateDropdownProps = {
  currentType: WorkflowType;
  onLoadTemplate: (t: WorkflowTemplate) => void;
  onTypeChange: (t: WorkflowType) => void;
};

export function TemplateDropdown({ currentType, onLoadTemplate, onTypeChange }: TemplateDropdownProps) {
  const [open, setOpen] = useState(false);
  const typeInfo = WORKFLOW_TYPES[currentType];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-lg px-2.5 py-1.5 hover:text-foreground hover:border-border/80 transition-colors"
      >
        <LayoutTemplate size={11} />
        <span className="hidden sm:inline">Templates</span>
        <ChevronDown size={9} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="absolute left-0 top-full mt-1.5 z-50 w-[420px] bg-card border border-border rounded-xl shadow-xl overflow-hidden">

            {/* Workflow type selector */}
            <div className="px-4 py-3 border-b border-border">
              <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground/60 mb-2.5">Workflow type</p>
              <div className="flex gap-1.5">
                {(Object.entries(WORKFLOW_TYPES) as [WorkflowType, typeof WORKFLOW_TYPES[WorkflowType]][]).map(([type, info]) => (
                  <button
                    key={type}
                    onClick={() => onTypeChange(type)}
                    title={info.explanation}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors flex-1 justify-center",
                      currentType === type
                        ? "bg-muted border-border text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40",
                    )}
                  >
                    <span className={info.color}>{info.icon}</span>
                    {info.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-2 leading-snug">
                {typeInfo.explanation}
              </p>
            </div>

            {/* Templates */}
            <div className="p-2">
              <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground/40 px-2 py-1.5">Load template</p>
              {WORKFLOW_TEMPLATES.map(t => {
                const tInfo = WORKFLOW_TYPES[t.type];
                return (
                  <button
                    key={t.id}
                    onClick={() => { onLoadTemplate(t); setOpen(false); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-semibold text-foreground group-hover:text-teal-400 transition-colors">
                        {t.name}
                      </span>
                      <span className={cn("flex items-center gap-1 text-[10px] font-black tracking-widest uppercase border rounded px-1 py-0.5", tInfo.color, "border-current opacity-60")}>
                        {tInfo.icon}
                        {tInfo.label}
                      </span>
                      <span className="ml-auto text-[10px] text-muted-foreground/50 hidden group-hover:block">
                        {t.usedFor}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">{t.description}</p>
                  </button>
                );
              })}
            </div>

          </div>
        </>
      )}
    </div>
  );
}

// Export the type info for use in header badge
export { WORKFLOW_TYPES };
export type { WorkflowType as WFType };
