"use client";

import { useMemo } from "react";
import { ReactFlow, Background, BackgroundVariant, Controls, MiniMap } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./atlas.css";
import { toFlow } from "./flow-layout";
import { nodeTypes } from "./node-types";
import type { Workflow } from "./atlas.types";

// The eagle-eye board. Give it your workflows; it lays them out as bands and
// fits the whole thing to the viewport. Colour comes from --atlas-* tokens
// (atlas.css) — nothing here is hardcoded.
//
// The wrapper MUST have a height (React Flow measures its container). Render it
// inside a sized box, e.g. <div style={{ height: "100dvh" }}><AtlasFlow … /></div>.
export function AtlasFlow({
  workflows,
  minimap = true,
}: {
  workflows: readonly Workflow[];
  minimap?: boolean;
}) {
  const { nodes, edges } = useMemo(() => toFlow(workflows), [workflows]);

  return (
    <ReactFlow
      className="atlas"
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      minZoom={0.15}
      style={{ width: "100%", height: "100%" }}
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="var(--atlas-border)" />
      <Controls showInteractive={false} />
      {minimap && <MiniMap pannable zoomable nodeColor="var(--atlas-border)" maskColor="transparent" />}
    </ReactFlow>
  );
}
