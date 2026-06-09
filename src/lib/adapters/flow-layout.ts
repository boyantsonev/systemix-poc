import type { Node, Edge } from "@xyflow/react";
import type { Workflow, StepKind, Agent, Pattern, Surface } from "../ports/atlas";

// Pure transform: Workflow[] -> React Flow nodes/edges. No side effects.
// A single layered-DAG layout serves all four patterns: a node's column is its
// longest-path depth from the start; nodes sharing a column stack vertically.
// Chains collapse to one row; routing/parallel/orchestration fan out.
// Ported verbatim from the Connecta platform `adapters/flow-layout.ts`.

export interface StepNodeData extends Record<string, unknown> {
  label: string;
  kind: StepKind;
  note: string;
  agent?: Agent;
  hasScreen: boolean;
  workflowId: string;
  stepId: string;
  screen?: string;
}

export interface GroupNodeData extends Record<string, unknown> {
  title: string;
  pattern: Pattern;
  surface: Surface;
  problem: string;
}

const COL_GAP = 230;
const ROW_GAP = 104;
const BAND_GAP = 80; // vertical space between workflows
const LABEL_WIDTH = 240; // left gutter for the band title
const TOP_PAD = 56; // room below the band title for the diagram

/** Longest-path depth of every step from the flow's start node(s). */
function columnOf(workflow: Workflow): Map<string, number> {
  const parents = new Map<string, string[]>();
  for (const s of workflow.steps) parents.set(s.id, []);
  for (const e of workflow.edges) parents.get(e.to)?.push(e.from);

  const memo = new Map<string, number>();
  const depth = (id: string): number => {
    const cached = memo.get(id);
    if (cached !== undefined) return cached;
    const ps = parents.get(id) ?? [];
    const d = ps.length === 0 ? 0 : Math.max(...ps.map(depth)) + 1;
    memo.set(id, d);
    return d;
  };
  const cols = new Map<string, number>();
  for (const s of workflow.steps) cols.set(s.id, depth(s.id));
  return cols;
}

/** Local layout for one workflow: positions relative to (0,0) + total height. */
function layoutWorkflow(workflow: Workflow): {
  positions: Map<string, { x: number; y: number }>;
  height: number;
} {
  const cols = columnOf(workflow);
  const byCol = new Map<number, string[]>();
  for (const s of workflow.steps) {
    const c = cols.get(s.id) ?? 0;
    (byCol.get(c) ?? byCol.set(c, []).get(c)!).push(s.id);
  }

  const maxRows = Math.max(...[...byCol.values()].map((ids) => ids.length));
  const bandHeight = TOP_PAD + maxRows * ROW_GAP;
  const midY = TOP_PAD + ((maxRows - 1) * ROW_GAP) / 2;

  const positions = new Map<string, { x: number; y: number }>();
  for (const [col, ids] of byCol) {
    const offset = ((ids.length - 1) * ROW_GAP) / 2;
    ids.forEach((id, i) => {
      positions.set(id, {
        x: LABEL_WIDTH + col * COL_GAP,
        y: midY - offset + i * ROW_GAP,
      });
    });
  }
  return { positions, height: bandHeight };
}

const ANIMATED: ReadonlySet<Pattern> = new Set(["parallelization", "orchestration"]);

export function toFlow(workflows: readonly Workflow[]): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let bandY = 0;

  for (const wf of workflows) {
    const { positions, height } = layoutWorkflow(wf);

    nodes.push({
      id: `${wf.id}__label`,
      type: "groupLabel",
      position: { x: 0, y: bandY },
      draggable: false,
      selectable: false,
      data: {
        title: wf.title,
        pattern: wf.pattern,
        surface: wf.surface,
        problem: wf.problem,
      } satisfies GroupNodeData,
    });

    for (const step of wf.steps) {
      const p = positions.get(step.id) ?? { x: LABEL_WIDTH, y: TOP_PAD };
      nodes.push({
        id: `${wf.id}__${step.id}`,
        type: step.kind,
        position: { x: p.x, y: bandY + p.y },
        data: {
          label: step.label,
          kind: step.kind,
          note: step.note,
          agent: step.agent,
          hasScreen: Boolean(step.screen),
          workflowId: wf.id,
          stepId: step.id,
          screen: step.screen,
        } satisfies StepNodeData,
      });
    }

    for (const e of wf.edges) {
      edges.push({
        id: `${wf.id}__${e.from}__${e.to}`,
        source: `${wf.id}__${e.from}`,
        target: `${wf.id}__${e.to}`,
        label: e.label,
        animated: ANIMATED.has(wf.pattern),
      });
    }

    bandY += height + BAND_GAP;
  }

  return { nodes, edges };
}

export { layoutWorkflow, columnOf };
