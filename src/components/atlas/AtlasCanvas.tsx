"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { atlasCatalog } from "@/lib/data/atlas-catalog";
import { toFlow, type StepNodeData } from "@/lib/adapters/flow-layout";
import { nodeTypes } from "./node-types";
import { PersonaTabs } from "./PersonaTabs";
import { PatternLegend } from "./PatternLegend";
import { PERSONA_TAGLINE, type Persona } from "@/lib/ports/atlas";

// The Atlas canvas: Systemix's own workflows as a layered-DAG per persona.
// Ported from the Connecta AtlasShell (react-router → Next navigation).
export function AtlasCanvas() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona>("founder");
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const flow = toFlow(atlasCatalog.byPersona(persona));
    setNodes(flow.nodes);
    setEdges(flow.edges);
  }, [persona, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      const d = node.data as StepNodeData;
      if (d.hasScreen && d.workflowId) {
        router.push(`/atlas/p/${persona}/${d.workflowId}/${d.stepId}`);
      }
    },
    [router, persona],
  );

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center gap-5 px-5 py-3.5 border-b border-border shrink-0">
        <div className="flex flex-col gap-0.5 shrink-0">
          <h1 className="text-[20px] font-black leading-none text-foreground">Workflow Atlas</h1>
          <p className="text-[12px] text-muted-foreground">
            {PERSONA_TAGLINE[persona]} · click a step to open its screen
          </p>
        </div>
        <div className="flex-1" />
        <PersonaTabs active={persona} onChange={setPersona} />
      </div>

      <div className="flex-1 min-h-0">
        <ReactFlow
          key={persona}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          minZoom={0.2}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="var(--border)" />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable nodeStrokeWidth={2} />
          <Panel position="bottom-left">
            <PatternLegend />
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
