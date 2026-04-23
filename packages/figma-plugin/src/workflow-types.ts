// Shared workflow type definitions — used by ui.ts and WorkflowCanvas.tsx

export type WfStep = { label: string; cmd: string; review?: boolean };

export type WfBase = {
  id: string;
  name: string;
  type: string;
  skill: string;
  page: string;
  mcps: string[];
  desc: string;
  keywords?: string[];
};

export type LinearWf   = WfBase & { layout: "linear" | "review"; steps: WfStep[] };
export type ParallelWf = WfBase & { layout: "parallel"; tracks: WfStep[][] };
export type OrchWf     = WfBase & { layout: "orchestration"; coordinator: string; agents: string[] };
export type SnapshotWf = WfBase & { layout: "snapshot"; checks: string[] };

export type Workflow = LinearWf | ParallelWf | OrchWf | SnapshotWf;
