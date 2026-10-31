// Portable JTBD Atlas contracts. No framework imports, no side effects.
// A step's `kind` drives its shape + glyph, never its colour — colour comes
// entirely from your design system's tokens (see atlas.css).

export type StepKind =
  | "input" // human/system input that starts the job
  | "agent" // an actor/model reasons or generates
  | "router" // classifies and branches
  | "parallel" // fan-out / fan-in coordinator
  | "tool" // a deterministic tool/API call
  | "human" // human-in-the-loop checkpoint
  | "output"; // terminal result

export type Pattern = "chain" | "routing" | "parallelization" | "orchestration";
export type Surface = "phone" | "tablet" | "desktop";

export interface Step {
  readonly id: string;
  readonly label: string;
  readonly kind: StepKind;
  readonly note?: string;
  /** Free-text owner — a role, an agent, a service. Rendered as a small tag. */
  readonly owner?: string;
  /** The prototype this step opens (route / path / URL). Makes the node an
   *  accented link — this is what "the flow leads to a prototype" means. */
  readonly screen?: string;
}

export interface Edge {
  readonly from: string;
  readonly to: string;
  /** For a router/parallel branch: the condition that selects this edge. */
  readonly label?: string;
}

export interface Workflow {
  readonly id: string;
  readonly title: string;
  /** The job, solution-agnostic:
   *  "When ⟨situation⟩, I want to ⟨goal⟩, so I can ⟨outcome⟩." */
  readonly problem?: string;
  readonly pattern?: Pattern;
  readonly surface?: Surface;
  readonly steps: readonly Step[];
  readonly edges: readonly Edge[];
}

export const PATTERN_LABEL: Record<Pattern, string> = {
  chain: "Chain",
  routing: "Routing",
  parallelization: "Parallelization",
  orchestration: "Orchestration",
};

export const SURFACE_LABEL: Record<Surface, string> = {
  phone: "Phone",
  tablet: "Tablet",
  desktop: "Desktop",
};
