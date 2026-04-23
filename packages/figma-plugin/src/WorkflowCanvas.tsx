import React, { useEffect, useMemo } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  BackgroundVariant,
  MarkerType,
  Handle,
  Position,
  NodeProps,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import type { Workflow, LinearWf, ParallelWf, OrchWf, SnapshotWf } from "./workflow-types";

// ── Custom node types ─────────────────────────────────────────────────────────

function PoleNode({ data }: NodeProps) {
  return (
    <div className="rf-pole" data-variant={data.variant as string}>
      {data.label as string}
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
    </div>
  );
}

function SkillNode({ data }: NodeProps) {
  return (
    <div className="rf-skill">
      <Handle type="target" position={Position.Left} />
      <div className="rf-skill-cmd">{data.cmd as string}</div>
      <div className="rf-skill-label">{data.label as string}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function ReviewNode({ data }: NodeProps) {
  return (
    <div className="rf-review">
      <Handle type="target" position={Position.Left} />
      <div className="rf-review-icon">✓</div>
      <div className="rf-skill-label">{data.label as string}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function CoordNode({ data }: NodeProps) {
  return (
    <div className="rf-coord">
      <div className="rf-coord-icon">⬡</div>
      <div className="rf-coord-label">{data.label as string}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

function AgentNode({ data }: NodeProps) {
  return (
    <div className="rf-agent">
      <Handle type="target" position={Position.Top} />
      {data.label as string}
    </div>
  );
}

function CheckNode({ data }: NodeProps) {
  return (
    <div className="rf-check">
      <Handle type="target" position={Position.Left} />
      {data.label as string}
    </div>
  );
}

const NODE_TYPES = {
  pole: PoleNode,
  skill: SkillNode,
  review: ReviewNode,
  coord: CoordNode,
  agent: AgentNode,
  check: CheckNode,
};

// ── Layout builders ───────────────────────────────────────────────────────────

const BASE_EDGE: Partial<Edge> = {
  animated: true,
  style: { stroke: "rgba(139,156,248,0.5)", strokeWidth: 1.5 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(139,156,248,0.5)", width: 12, height: 12 },
};

const REVIEW_EDGE: Partial<Edge> = {
  animated: true,
  style: { stroke: "rgba(240,160,80,0.6)", strokeWidth: 1.5, strokeDasharray: "4 3" },
  markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(240,160,80,0.6)", width: 12, height: 12 },
};

function buildLinear(wf: LinearWf): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const NODE_W = 72;
  const NODE_H = 48;
  const GAP    = 36;
  const Y      = 0;

  // src pole
  nodes.push({ id: "src", type: "pole", position: { x: 0, y: Y + 4 },
    data: { label: "⬡", variant: "src" }, style: { width: 32, height: 32 } });

  let x = 32 + GAP;
  const allSteps = wf.steps;

  allSteps.forEach((step, i) => {
    const id = `step-${i}`;
    const isReview = !!step.review;
    nodes.push({
      id,
      type: isReview ? "review" : "skill",
      position: { x, y: Y },
      data: { label: step.label, cmd: step.cmd === "human" ? "you" : step.cmd.split(" ")[0] },
      style: { width: NODE_W, height: NODE_H },
    });
    const prevId = i === 0 ? "src" : `step-${i - 1}`;
    edges.push({ id: `e-${i}`, source: prevId, target: id,
      ...(isReview ? REVIEW_EDGE : BASE_EDGE) });
    x += NODE_W + GAP;
  });

  // dst pole
  nodes.push({ id: "dst", type: "pole", position: { x, y: Y + 4 },
    data: { label: "✓", variant: "dst" }, style: { width: 32, height: 32 } });
  edges.push({ id: "e-dst", source: `step-${allSteps.length - 1}`, target: "dst", ...BASE_EDGE });

  return { nodes, edges };
}

function buildParallel(wf: ParallelWf): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const NODE_W = 68;
  const NODE_H = 44;
  const COL_GAP = 28;
  const TRACK_H = NODE_H + 16;

  const numTracks = wf.tracks.length;
  const maxCols   = Math.max(...wf.tracks.map((t) => t.length));
  const totalH    = numTracks * TRACK_H;
  const midY      = totalH / 2 - 16;

  // src pole
  nodes.push({ id: "src", type: "pole", position: { x: 0, y: midY },
    data: { label: "⬡", variant: "src" }, style: { width: 32, height: 32 } });

  wf.tracks.forEach((track, ti) => {
    const trackY = ti * TRACK_H;
    track.forEach((step, si) => {
      const id = `t${ti}s${si}`;
      const x  = 32 + COL_GAP + si * (NODE_W + COL_GAP);
      nodes.push({ id, type: "skill", position: { x, y: trackY },
        data: { label: step.label, cmd: step.cmd.split(" ")[0] },
        style: { width: NODE_W, height: NODE_H } });
      if (si === 0) {
        edges.push({ id: `e-src-${ti}`, source: "src", target: id, ...BASE_EDGE });
      } else {
        edges.push({ id: `e-${ti}-${si}`, source: `t${ti}s${si - 1}`, target: id, ...BASE_EDGE });
      }
    });
  });

  // dst pole — placed after the longest track
  const dstX = 32 + COL_GAP + maxCols * (NODE_W + COL_GAP);
  nodes.push({ id: "dst", type: "pole", position: { x: dstX, y: midY },
    data: { label: "✓", variant: "dst" }, style: { width: 32, height: 32 } });

  wf.tracks.forEach((track, ti) => {
    const lastId = `t${ti}s${track.length - 1}`;
    edges.push({ id: `e-dst-${ti}`, source: lastId, target: "dst", ...BASE_EDGE });
  });

  return { nodes, edges };
}

function buildOrchestration(wf: OrchWf): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const AGENT_W = 72;
  const AGENT_H = 28;
  const AGENT_GAP = 12;
  const COORD_W = 100;

  const totalAgentW = wf.agents.length * AGENT_W + (wf.agents.length - 1) * AGENT_GAP;
  const coordX = Math.max(0, (totalAgentW - COORD_W) / 2);

  nodes.push({ id: "coord", type: "coord", position: { x: coordX, y: 0 },
    data: { label: wf.coordinator }, style: { width: COORD_W, height: 40 } });

  wf.agents.forEach((name, i) => {
    const x = i * (AGENT_W + AGENT_GAP);
    const id = `agent-${i}`;
    nodes.push({ id, type: "agent", position: { x, y: 72 },
      data: { label: name }, style: { width: AGENT_W, height: AGENT_H } });
    edges.push({ id: `e-${i}`, source: "coord", target: id,
      ...BASE_EDGE, animated: false,
      style: { stroke: "rgba(192,132,252,0.4)", strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(192,132,252,0.4)", width: 10, height: 10 } });
  });

  return { nodes, edges };
}

function buildSnapshot(wf: SnapshotWf): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const CHECK_W = 88;
  const CHECK_H = 28;
  const CHECK_GAP = 10;

  const totalH = wf.checks.length * (CHECK_H + CHECK_GAP);
  const midY   = totalH / 2 - 16;

  nodes.push({ id: "src", type: "pole", position: { x: 0, y: midY },
    data: { label: "⬡", variant: "src" }, style: { width: 32, height: 32 } });

  wf.checks.forEach((label, i) => {
    const id = `check-${i}`;
    const y  = i * (CHECK_H + CHECK_GAP);
    nodes.push({ id, type: "check", position: { x: 60, y },
      data: { label }, style: { width: CHECK_W, height: CHECK_H } });
    edges.push({ id: `e-${i}`, source: "src", target: id, ...BASE_EDGE, animated: false,
      style: { stroke: "rgba(152,152,170,0.4)", strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(152,152,170,0.4)", width: 10, height: 10 } });
  });

  return { nodes, edges };
}

function buildGraph(wf: Workflow): { nodes: Node[]; edges: Edge[] } {
  if (wf.layout === "linear" || wf.layout === "review") return buildLinear(wf as LinearWf);
  if (wf.layout === "parallel")       return buildParallel(wf as ParallelWf);
  if (wf.layout === "orchestration")  return buildOrchestration(wf as OrchWf);
  if (wf.layout === "snapshot")       return buildSnapshot(wf as SnapshotWf);
  return { nodes: [], edges: [] };
}

// ── Main component ────────────────────────────────────────────────────────────

interface WorkflowCanvasProps {
  workflow: Workflow;
}

export function WorkflowCanvas({ workflow }: WorkflowCanvasProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildGraph(workflow),
    [workflow.id],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Rebuild graph when workflow changes
  useEffect(() => {
    const { nodes: n, edges: e } = buildGraph(workflow);
    setNodes(n);
    setEdges(e);
  }, [workflow.id]);

  return (
    <div style={{ width: "100%", height: "180px" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={true}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1}
          color="rgba(255,255,255,0.04)" />
      </ReactFlow>
    </div>
  );
}
