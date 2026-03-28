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
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0">
        <Activity size={14} className="text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">Run Status</span>

        {overallCfg && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${overallCfg.dot}`} />
            <span className={`text-[10px] font-medium ${overallCfg.labelClass}`}>
              {overallCfg.label}
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
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mb-3">
              <Activity size={16} className="text-muted-foreground" />
            </div>
            <p className="text-xs font-medium text-foreground mb-1">No active run</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Click <span className="font-mono text-violet-700 dark:text-violet-400">Run</span> on a trigger node to start a workflow
            </p>
          </div>
        )}

        {/* Completion message */}
        {run?.overallStatus === "done" && (
          <div className="rounded-lg border border-emerald-500 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-950/20 px-3 py-2.5 text-center">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Pipeline complete</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {((Date.now() - run.startedAt) / 1000).toFixed(1)}s total
            </p>
          </div>
        )}

        {run?.overallStatus === "error" && (
          <div className="rounded-lg border border-red-500 bg-red-50 dark:border-red-500/30 dark:bg-red-950/20 px-3 py-2.5 text-center">
            <p className="text-xs font-medium text-red-700 dark:text-red-400">Pipeline stopped</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Rejected or failed — check the step log above
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
