"use client";

import { useMemo } from "react";
import { ReactFlow, Background, Controls, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toFlow } from "@/lib/adapters/flow-layout";
import { nodeTypes } from "@/components/atlas/node-types";
import type { Workflow, StepKind, Agent } from "@/lib/ports/atlas";

type RawStep = { id: string; kind: string; label: string; note?: string; agent?: string; screen?: string };
type RawEdge = { from: string; to: string; label?: string };

// Renders an experiment's AI workflow (given → steps → conclusion) with the same
// step-graph the (retired) Atlas used — toFlow + StepNode. The frontmatter `workflow`
// is untyped (fumadocs catchall), so coerce defensively and no-op if it's absent.
export function WorkflowDiagram({
  workflow,
  title,
  problem,
}: {
  workflow: { steps?: RawStep[]; edges?: RawEdge[] } | null | undefined;
  title: string;
  problem?: string;
}) {
  const flow = useMemo(() => {
    const steps = Array.isArray(workflow?.steps) ? workflow!.steps : [];
    const edges = Array.isArray(workflow?.edges) ? workflow!.edges : [];
    if (!steps.length) return null;
    const wf: Workflow = {
      id: "experiment",
      persona: "founder",
      title,
      pattern: "chain",
      surface: "desktop",
      problem: problem ?? "",
      steps: steps.map((s) => ({
        id: String(s.id),
        label: String(s.label ?? s.id),
        kind: (s.kind as StepKind) ?? "agent",
        note: String(s.note ?? ""),
        agent: s.agent as Agent | undefined,
        screen: s.screen,
      })),
      edges: edges.map((e) => ({ from: String(e.from), to: String(e.to), label: e.label })),
    };
    const { nodes, edges: flowEdges } = toFlow([wf]);
    // Drop the band-title node — the experiment page already shows the title.
    return { nodes: nodes.filter((n) => n.type !== "groupLabel") as Node[], edges: flowEdges as Edge[] };
  }, [workflow, title, problem]);

  if (!flow) return null;

  return (
    <div className="not-prose my-6 h-[340px] w-full overflow-hidden rounded-lg border border-border bg-muted/10">
      <ReactFlow
        nodes={flow.nodes}
        edges={flow.edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
      >
        <Background gap={20} />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  );
}
