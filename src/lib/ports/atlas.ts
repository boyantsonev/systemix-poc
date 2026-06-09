// Pure contracts for the Systemix Workflow Atlas. No implementation, no side effects.
// Ported from the Connecta platform `ports/catalog.ts` — the proven hexagonal seam —
// adapted to Systemix personas, agents, and in-app prototype routes.

/** Operating roles the Atlas is sliced by. */
export type Persona = "founder" | "designer" | "engineer";

/** The four agentic workflow patterns (Anthropic "Building Effective Agents"). */
export type Pattern = "chain" | "routing" | "parallelization" | "orchestration";

/** Primary surface the prototype is framed in. */
export type Surface = "phone" | "tablet" | "desktop";

/** The Systemix agents that own steps. */
export type Agent =
  | "hermes" // synthesis + decision
  | "orchestrator" // fans work across agents
  | "scout" // drift detection
  | "flux" // token sync
  | "ada" // figma → code
  | "echo" // doc sync
  | "prism" // component theming
  | "sage" // storybook
  | "ship"; // deploy

/** Visual/behavioural role of a step — drives node shape, never colour. */
export type StepKind =
  | "input" // human/system input that starts the flow
  | "agent" // an agent does reasoning/generation
  | "router" // classifies and branches
  | "parallel" // fan-out / fan-in coordinator
  | "tool" // a deterministic tool call
  | "human" // human-in-the-loop checkpoint
  | "output"; // terminal result

export interface Step {
  readonly id: string;
  readonly label: string;
  readonly kind: StepKind;
  readonly note: string;
  readonly agent?: Agent;
  /** When set, this step links to an in-app route rendered as the prototype. */
  readonly screen?: string;
}

export interface Edge {
  readonly from: string;
  readonly to: string;
  /** For routing branches: the condition that selects this edge. */
  readonly label?: string;
}

export interface Workflow {
  readonly id: string;
  readonly persona: Persona;
  readonly title: string;
  readonly pattern: Pattern;
  readonly surface: Surface;
  /** The product problem this workflow solves. */
  readonly problem: string;
  readonly steps: readonly Step[];
  readonly edges: readonly Edge[];
}

export interface WorkflowCatalog {
  all(): readonly Workflow[];
  byPersona(persona: Persona): readonly Workflow[];
  byId(id: string): Workflow | undefined;
}

export const PERSONAS: readonly Persona[] = ["founder", "designer", "engineer"];

export const PERSONA_LABEL: Record<Persona, string> = {
  founder: "Founder",
  designer: "Designer",
  engineer: "Engineer",
};

export const PERSONA_TAGLINE: Record<Persona, string> = {
  founder: "Run the loop — ship, measure, decide from evidence",
  designer: "Keep the design system and Figma in lockstep",
  engineer: "Wire the agents, signals, and deploys",
};

export const PATTERN_LABEL: Record<Pattern, string> = {
  chain: "Chain",
  routing: "Routing",
  parallelization: "Parallelization",
  orchestration: "Orchestration",
};

export const AGENT_LABEL: Record<Agent, string> = {
  hermes: "Hermes",
  orchestrator: "Orchestrator",
  scout: "Scout",
  flux: "Flux",
  ada: "Ada",
  echo: "Echo",
  prism: "Prism",
  sage: "Sage",
  ship: "Ship",
};

export const SURFACE_LABEL: Record<Surface, string> = {
  phone: "Phone",
  tablet: "Tablet",
  desktop: "Desktop",
};
