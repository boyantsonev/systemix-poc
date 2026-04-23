"use client";

import { Activity } from "lucide-react";
import { RunTaskCard } from "./RunTaskCard";
import { HitlApprovalCard } from "./HitlApprovalCard";
import type { WorkflowRun } from "@/lib/data/pipeline";
import type { WorkflowDef } from "@/lib/data/workflows";

const OVERALL_STATUS_CONFIG = {
  running:             { dot: "bg-blue-500 animate-pulse",   label: "Running",  labelClass: "text-blue-600 dark:text-blue-400"    },
  "awaiting-approval": { dot: "bg-amber-500 animate-pulse",  label: "Waiting",  labelClass: "text-amber-700 dark:text-amber-400"   },
  done:                { dot: "bg-emerald-500",               label: "Complete", labelClass: "text-emerald-600 dark:text-emerald-400" },
  error:               { dot: "bg-red-500",                   label: "Failed",   labelClass: "text-red-600 dark:text-red-400"     },
};

type Props = {
  run: WorkflowRun | null;
  workflow: WorkflowDef;
  onApprove: (decision: "approve" | "reject") => void;
};

export function WorkflowRunSidebar({ run, workflow, onApprove }: Props) {
  const getNode = (nodeId: string) => workflow.nodes.find((n) => n.id === nodeId);

  // Only steps that have been reached (not pending/idle)
  const activeSteps = run
    ? run.steps.filter((s) => s.status !== "pending")
    : [];

  // The current HITL step waiting for input
  const hitlStep = run
    ? run.steps.find((s) => s.status === "awaiting-approval")
    : null;
  const hitlNode = hitlStep ? getNode(hitlStep.nodeId) : null;

  const overallCfg = run ? OVERALL_STATUS_CONFIG[run.overallStatus] : null;

  return (
    <div
      className="flex flex-col border-l border-border bg-sidebar"
      style={{ width: 300, flexShrink: 0, height: "100%", overflowY: "auto" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/60 flex-shrink-0">
        <Activity size={12} className="text-muted-foreground/50" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">Run Status</span>

        {overallCfg && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className={`size-1.5 rounded-full ${overallCfg.dot}`} />
            <span className={`text-[10px] font-mono ${overallCfg.labelClass}`}>
              {overallCfg.label.toLowerCase()}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 p-3 space-y-2.5 overflow-y-auto">

        {/* HITL approval card — always shown at top when active */}
        {hitlStep && hitlNode && (
          <HitlApprovalCard
            step={hitlStep}
            node={hitlNode}
            onDecision={onApprove}
          />
        )}

        {/* Step cards — in execution order, skip the pending/idle ones */}
        {activeSteps.map((step) => {
          const node = getNode(step.nodeId);
          if (!node) return null;
          return (
            <RunTaskCard key={step.nodeId} step={step} node={node} />
          );
        })}

        {/* Empty state */}
        {!run && (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4">
            <div className="w-7 h-7 rounded-md border border-border/60 bg-muted/30 flex items-center justify-center mb-2.5">
              <Activity size={13} className="text-muted-foreground/40" />
            </div>
            <p className="text-[11px] font-mono font-medium text-foreground/60 mb-1">no active run</p>
            <p className="text-[10px] font-mono text-muted-foreground/40 leading-relaxed">
              click <span className="text-violet-400">run</span> on a trigger node
            </p>
          </div>
        )}

        {/* Completion message */}
        {run?.overallStatus === "done" && (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-center">
            <p className="text-[11px] font-mono font-medium text-emerald-400">workflow complete</p>
            <p className="text-[10px] font-mono text-muted-foreground/50 mt-0.5">
              {((Date.now() - run.startedAt) / 1000).toFixed(1)}s total
            </p>
          </div>
        )}

        {run?.overallStatus === "error" && (
          <div className="rounded-md border border-red-500/30 bg-red-950/20 px-3 py-2 text-center">
            <p className="text-[11px] font-mono font-medium text-red-400">workflow stopped</p>
            <p className="text-[10px] font-mono text-muted-foreground/40 mt-0.5">
              rejected or failed — check step log
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
