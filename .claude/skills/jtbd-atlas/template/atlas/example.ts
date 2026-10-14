import type { Workflow } from "./atlas.types";

// The /jtbd-atlas skill replaces this array with the workflow(s) it derives from
// your job. Kept here so the board is demoable the moment the files land.
export const WORKFLOWS: readonly Workflow[] = [
  {
    id: "example",
    title: "Example — replace via /jtbd-atlas",
    problem: "When I'm evaluating a tool, I want to see the whole job at a glance, so I can trust it before committing.",
    pattern: "routing",
    surface: "desktop",
    steps: [
      { id: "trigger", label: "Job arises", kind: "input", note: "The user hits the situation that starts the job." },
      { id: "triage", label: "Classify need", kind: "router", note: "Which path does this job take?", owner: "router" },
      { id: "gen", label: "Draft answer", kind: "agent", note: "Reason over context and produce a first cut.", owner: "assistant" },
      { id: "fetch", label: "Pull data", kind: "tool", note: "Deterministic lookup / API call.", owner: "api" },
      { id: "review", label: "Human check", kind: "human", note: "Approve or correct before it ships." },
      { id: "proto", label: "Prototype A", kind: "output", note: "The built screen the user lands on.", screen: "/proto/a" },
      { id: "proto2", label: "Prototype B", kind: "output", note: "The alternate outcome screen.", screen: "/proto/b" },
    ],
    edges: [
      { from: "trigger", to: "triage" },
      { from: "triage", to: "gen", label: "open-ended" },
      { from: "triage", to: "fetch", label: "lookup" },
      { from: "gen", to: "review" },
      { from: "fetch", to: "review" },
      { from: "review", to: "proto" },
      { from: "review", to: "proto2", label: "variant" },
    ],
  },
];
