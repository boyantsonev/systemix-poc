import type { NodeTypes } from "@xyflow/react";
import { StepNode } from "./StepNode";
import { GroupLabel } from "./GroupLabel";

// Every step kind renders through StepNode (which varies shape by data.kind);
// the band title uses GroupLabel. Defined once at module scope so the reference
// is stable across renders (React Flow requirement).
export const nodeTypes: NodeTypes = {
  input: StepNode,
  agent: StepNode,
  router: StepNode,
  parallel: StepNode,
  tool: StepNode,
  human: StepNode,
  output: StepNode,
  groupLabel: GroupLabel,
};
