"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LeftSidebar } from "@/components/systemix/LeftSidebar";
import { WorkflowCanvas } from "./WorkflowCanvas";
import { WorkflowRunSidebar } from "./WorkflowRunSidebar";
import type { WorkflowDef, NodeStatus } from "@/lib/data/workflows";
import type { WorkflowRun, WorkflowStep } from "@/lib/data/pipeline";
import { workflows } from "@/lib/data/workflows";

// ── Helpers ───────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/** Topological order: follow edges from the trigger node. */
function getOrderedNodeIds(wf: WorkflowDef): string[] {
  const adj: Record<string, string> = {};
  wf.edges.forEach((e) => { adj[e.from] = e.to; });
  const trigger = wf.nodes.find((n) => n.type === "trigger");
  if (!trigger) return wf.nodes.map((n) => n.id);
  const order: string[] = [];
  let cur: string | undefined = trigger.id;
  while (cur) {
    order.push(cur);
    cur = adj[cur];
  }
  return order;
}

// ── Component ─────────────────────────────────────────────────────────────

export function WorkflowBuilder() {
  const [activeWorkflowIdx, setActiveWorkflowIdx] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, NodeStatus>>({});
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Ref holds a resolver that the HITL approval card calls to unblock the async chain
  const hitlResolveRef = useRef<((d: "approve" | "reject") => void) | null>(null);

  const workflow = workflows[activeWorkflowIdx];

  // ── State helpers ───────────────────────────────────────────────────────

  function setNodeStatus(nodeId: string, status: NodeStatus) {
    setStatuses((prev) => ({ ...prev, [nodeId]: status }));
  }

  function updateStep(runId: string, nodeId: string, patch: Partial<WorkflowStep>) {
    setRun((prev) => {
      if (!prev || prev.id !== runId) return prev;
      const steps = prev.steps.map((s) =>
        s.nodeId === nodeId ? { ...s, ...patch } : s
      );
      return { ...prev, steps };
    });
  }

  function appendLog(runId: string, nodeId: string, lines: string[]) {
    setRun((prev) => {
      if (!prev || prev.id !== runId) return prev;
      const steps = prev.steps.map((s) =>
        s.nodeId === nodeId
          ? { ...s, log: [...s.log, ...lines] }
          : s
      );
      return { ...prev, steps };
    });
  }

  // ── Execution state machine ─────────────────────────────────────────────

  const runWorkflow = useCallback(async () => {
    if (isRunning) return;

    const runId = `run-${Date.now()}`;
    const orderedIds = getOrderedNodeIds(workflow);
    const orderedNodes = orderedIds
      .map((id) => workflow.nodes.find((n) => n.id === id))
      .filter(Boolean) as typeof workflow.nodes;

    // Initialise run
    const initialSteps: WorkflowStep[] = orderedNodes.map((n) => ({
      nodeId: n.id,
      status: "pending",
      log: [],
    }));

    const newRun: WorkflowRun = {
      id: runId,
      workflowId: workflow.id,
      startedAt: Date.now(),
      steps: initialSteps,
      overallStatus: "running",
    };

    setRun(newRun);
    setIsRunning(true);

    // Reset all node statuses to pending
    const pending: Record<string, NodeStatus> = {};
    orderedNodes.forEach((n) => { pending[n.id] = "pending"; });
    setStatuses(pending);

    // ── Execute each node in order ────────────────────────────────────────
    for (const node of orderedNodes) {

      // ── Trigger node ──────────────────────────────────────────────────
      if (node.type === "trigger") {
        setNodeStatus(node.id, "running");
        updateStep(runId, node.id, { status: "running", startedAt: Date.now() });
        await sleep(300);
        setNodeStatus(node.id, "done");
        updateStep(runId, node.id, { status: "done", completedAt: Date.now() });
        appendLog(runId, node.id, node.simulatedLog ?? ["Triggered"]);
        continue;
      }

      // ── HITL gate ─────────────────────────────────────────────────────
      if (node.type === "hitl") {
        setNodeStatus(node.id, "awaiting-approval");
        updateStep(runId, node.id, {
          status: "awaiting-approval",
          startedAt: Date.now(),
          requiresApproval: true,
        });
        appendLog(runId, node.id, node.simulatedLog ?? ["Waiting for approval"]);

        // Update overall run status
        setRun((prev) => prev ? { ...prev, overallStatus: "awaiting-approval" } : prev);

        const decision = await new Promise<"approve" | "reject">((resolve) => {
          hitlResolveRef.current = resolve;
        });

        hitlResolveRef.current = null;

        if (decision === "reject") {
          setNodeStatus(node.id, "rejected");
          updateStep(runId, node.id, { status: "rejected", completedAt: Date.now() });
          appendLog(runId, node.id, ["Rejected by user — pipeline stopped"]);
          setRun((prev) => prev ? { ...prev, overallStatus: "error", completedAt: Date.now() } : prev);
          setIsRunning(false);
          return;
        }

        setNodeStatus(node.id, "approved");
        updateStep(runId, node.id, { status: "approved", completedAt: Date.now() });
        appendLog(runId, node.id, ["Approved — continuing pipeline"]);
        setRun((prev) => prev ? { ...prev, overallStatus: "running" } : prev);
        continue;
      }

      // ── Skill / Output node ───────────────────────────────────────────
      setNodeStatus(node.id, "running");
      updateStep(runId, node.id, { status: "running", startedAt: Date.now() });

      const duration = node.durationMs ?? 1500;
      const logs = node.simulatedLog ?? [`Running ${node.label}...`];

      // Drip logs in across the duration for realism
      const chunkMs = duration / Math.max(logs.length, 1);
      for (const line of logs) {
        appendLog(runId, node.id, [line]);
        await sleep(chunkMs);
      }

      setNodeStatus(node.id, "done");
      updateStep(runId, node.id, { status: "done", completedAt: Date.now() });
    }

    // ── Done ─────────────────────────────────────────────────────────────
    setRun((prev) =>
      prev ? { ...prev, overallStatus: "done", completedAt: Date.now() } : prev
    );
    setIsRunning(false);
  }, [workflow, isRunning]);

  // Called by HitlApprovalCard via WorkflowRunSidebar
  const handleApproval = useCallback((decision: "approve" | "reject") => {
    if (hitlResolveRef.current) {
      hitlResolveRef.current(decision);
    }
  }, []);

  // Reset
  const handleReset = useCallback(() => {
    if (isRunning) return;
    setRun(null);
    setStatuses({});
    setSelectedNodeId(null);
  }, [isRunning]);

  // ── Render ──────────────────────────────────────────────────────────────

  const selectedNode = selectedNodeId
    ? workflow.nodes.find((n) => n.id === selectedNodeId)
    : null;

  return (
    <div
      className="flex min-h-screen bg-background text-foreground"
      style={{ height: "100vh", overflow: "hidden" }}
    >
      {/* Left nav */}
      <LeftSidebar />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-border flex-shrink-0">
          {/* Back link */}
          <Link
            href="/pipeline"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs transition-colors flex-shrink-0"
          >
            <ArrowLeft size={12} />
            Pipeline
          </Link>

          <div className="w-px h-4 bg-border" />

          {/* Workflow tabs */}
          <div className="flex items-center gap-1">
            {workflows.map((wf, i) => (
              <button
                key={wf.id}
                onClick={() => {
                  if (isRunning) return;
                  setActiveWorkflowIdx(i);
                  setRun(null);
                  setStatuses({});
                  setSelectedNodeId(null);
                }}
                className={[
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                  i === activeWorkflowIdx
                    ? "bg-sidebar-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60",
                  isRunning ? "opacity-50 cursor-not-allowed" : "",
                ].join(" ")}
              >
                {wf.name}
              </button>
            ))}
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground hidden lg:block truncate max-w-xs">
            {workflow.description}
          </p>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-2">
            {run && !isRunning && (
              <button
                onClick={handleReset}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded"
              >
                Reset
              </button>
            )}
            <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-blue-400 animate-pulse" : "bg-muted-foreground/30"}`} />
            <span className="text-[10px] text-muted-foreground">
              {isRunning ? "Running" : run?.overallStatus === "done" ? "Complete" : "Idle"}
            </span>
          </div>
        </div>

        {/* Canvas + sidebar */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Canvas area */}
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

            {/* Canvas */}
            <div className="flex-1 px-6 pb-4 overflow-auto">
              <WorkflowCanvas
                workflow={workflow}
                statuses={statuses}
                selectedNodeId={selectedNodeId}
                onNodeClick={setSelectedNodeId}
                onRun={runWorkflow}
                isRunning={isRunning}
              />
            </div>

            {/* Node detail panel — shown when a node is selected */}
            {selectedNode && (
              <div className="mx-6 mb-4 rounded-xl border border-border bg-card p-4 flex-shrink-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{selectedNode.label}</p>
                    {selectedNode.sublabel && (
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        {selectedNode.sublabel}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedNodeId(null)}
                    className="text-muted-foreground hover:text-foreground text-xs"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {selectedNode.description}
                </p>
                {selectedNode.agentName && (
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Agent: <span className="font-mono text-teal-400">{selectedNode.agentName}</span>
                  </p>
                )}
                {selectedNode.skillCommand && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Skill: <span className="font-mono text-violet-400">{selectedNode.skillCommand}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Run sidebar */}
          <WorkflowRunSidebar
            run={run}
            workflow={workflow}
            onApprove={handleApproval}
          />
        </div>
      </div>
    </div>
  );
}
