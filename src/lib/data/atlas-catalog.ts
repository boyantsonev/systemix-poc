import type { Persona, Workflow, WorkflowCatalog } from "../ports/atlas";

// Systemix's own workflows — the Atlas IS the product demo. Each workflow is a
// real loop Systemix runs on itself, and every step's `screen` points at a live
// in-app route (rendered in the prototype frame). Three personas × three workflows.
//
// All surfaces are `desktop`: the screens are the actual Systemix web app, which
// is desktop-first, so the prototype frame stays legible. DeviceFrame keeps
// phone/tablet support (faithful Connecta port) for future per-surface prototypes.

const WORKFLOWS: readonly Workflow[] = [
  // ─────────────────────────── FOUNDER ───────────────────────────
  {
    id: "founder-loop",
    persona: "founder",
    title: "The loop",
    pattern: "chain",
    surface: "desktop",
    problem:
      "Ship a hypothesis, read the signals, close the loop. Decisions come from evidence written back to the contract — not memory.",
    steps: [
      { id: "define", label: "Define hypothesis", kind: "input", note: "Write the claim + variants", screen: "/design-system/hypotheses" },
      { id: "ship", label: "Ship variant", kind: "tool", note: "Deploy to production", screen: "/config" },
      { id: "signals", label: "Collect signals", kind: "tool", note: "PostHog + social stream in", screen: "/config" },
      { id: "hermes", label: "Hermes synthesis", kind: "agent", agent: "hermes", note: "Evidence → recommendation", screen: "/queue" },
      { id: "decide", label: "Decide", kind: "human", note: "Promote · run longer · discard", screen: "/queue" },
      { id: "writeback", label: "Write back", kind: "tool", note: "Decision saved to the contract", screen: "/design-system/hypotheses" },
      { id: "next", label: "Next experiment", kind: "output", note: "Starts from known ground", screen: "/design-system/hypotheses" },
    ],
    edges: [
      { from: "define", to: "ship" },
      { from: "ship", to: "signals" },
      { from: "signals", to: "hermes" },
      { from: "hermes", to: "decide" },
      { from: "decide", to: "writeback" },
      { from: "writeback", to: "next" },
    ],
  },
  {
    id: "founder-init",
    persona: "founder",
    title: "Init an instance",
    pattern: "chain",
    surface: "desktop",
    problem:
      "Install Systemix into a repo and stand up the first experiment. Config renders immediately; System comes online once the design system syncs.",
    steps: [
      { id: "install", label: "npx systemix init", kind: "input", note: "Scaffold into the repo", screen: "/docs" },
      { id: "point", label: "Point at sources", kind: "tool", note: "Figma · existing code · desired UI", screen: "/docs" },
      { id: "first", label: "First hypothesis", kind: "human", note: "Define what to test", screen: "/design-system/hypotheses" },
      { id: "config", label: "Config renders", kind: "tool", note: "The instance topology", screen: "/config" },
      { id: "ready", label: "System ready", kind: "output", note: "Living styleguide is live", screen: "/system" },
    ],
    edges: [
      { from: "install", to: "point" },
      { from: "point", to: "first" },
      { from: "first", to: "config" },
      { from: "config", to: "ready" },
    ],
  },
  {
    id: "founder-landing",
    persona: "founder",
    title: "Landing value-prop test",
    pattern: "routing",
    surface: "desktop",
    problem:
      "Which value framing converts? Route the hypothesis by ICP, ship both, measure, and let Hermes weigh the evidence.",
    steps: [
      { id: "hypothesis", label: "Framing hypothesis", kind: "input", note: "A landing value-prop claim", screen: "/design-system/hypotheses" },
      { id: "route", label: "Route by ICP", kind: "router", note: "Founder vs designer", screen: "/" },
      { id: "founderframe", label: "Founder framing", kind: "agent", agent: "hermes", note: "Lead with founder pain", screen: "/" },
      { id: "designerframe", label: "Designer framing", kind: "agent", agent: "hermes", note: "Lead with drift correctness", screen: "/" },
      { id: "measure", label: "Measure CTR", kind: "tool", note: "PostHog per variant", screen: "/queue" },
      { id: "evaluate", label: "Hermes evaluates", kind: "agent", agent: "hermes", note: "Weigh the evidence", screen: "/queue" },
      { id: "decision", label: "Promote winner", kind: "output", note: "Winning framing ships", screen: "/design-system/hypotheses" },
    ],
    edges: [
      { from: "hypothesis", to: "route" },
      { from: "route", to: "founderframe", label: "founder" },
      { from: "route", to: "designerframe", label: "designer" },
      { from: "founderframe", to: "measure" },
      { from: "designerframe", to: "measure" },
      { from: "measure", to: "evaluate" },
      { from: "evaluate", to: "decision" },
    ],
  },

  // ─────────────────────────── DESIGNER ──────────────────────────
  {
    id: "designer-ds-sync",
    persona: "designer",
    title: "Design-system sync",
    pattern: "chain",
    surface: "desktop",
    problem:
      "Edit tokens in globals.css and keep Figma variables in lockstep, with any drift surfaced for review.",
    steps: [
      { id: "edit", label: "Edit token", kind: "input", note: "Change an oklch value", screen: "/design-system/tokens" },
      { id: "convert", label: "Convert", kind: "tool", agent: "flux", note: "npm run tokens → bridge.json", screen: "/design-system/tokens" },
      { id: "sync", label: "Sync to Figma", kind: "tool", agent: "flux", note: "Push variables", screen: "/config" },
      { id: "drift", label: "Drift check", kind: "agent", agent: "scout", note: "Detect code ↔ Figma drift", screen: "/queue" },
      { id: "approve", label: "Resolve", kind: "human", note: "Approve the resolution", screen: "/queue" },
      { id: "vars", label: "Variables updated", kind: "output", note: "Figma reflects the code", screen: "/system" },
    ],
    edges: [
      { from: "edit", to: "convert" },
      { from: "convert", to: "sync" },
      { from: "sync", to: "drift" },
      { from: "drift", to: "approve" },
      { from: "approve", to: "vars" },
    ],
  },
  {
    id: "designer-component",
    persona: "designer",
    title: "Component generation",
    pattern: "chain",
    surface: "desktop",
    problem:
      "Generate a production React component + story from a Figma node, reviewed before it ships into the system.",
    steps: [
      { id: "select", label: "Select Figma node", kind: "input", note: "Pick the component", screen: "/design-system/components" },
      { id: "extract", label: "Extract context", kind: "tool", agent: "ada", note: "Pull design context", screen: "/design-system/components" },
      { id: "generate", label: "Generate code", kind: "agent", agent: "ada", note: "Component + Storybook story", screen: "/design-system/components" },
      { id: "review", label: "Review", kind: "human", note: "Approve the generated code", screen: "/queue" },
      { id: "ship", label: "Ship", kind: "output", agent: "ship", note: "Lands in the system", screen: "/system" },
    ],
    edges: [
      { from: "select", to: "extract" },
      { from: "extract", to: "generate" },
      { from: "generate", to: "review" },
      { from: "review", to: "ship" },
    ],
  },
  {
    id: "designer-parity",
    persona: "designer",
    title: "Parity check",
    pattern: "routing",
    surface: "desktop",
    problem:
      "Is the design system in sync, or has drift crept in? Scan, then route each finding by severity.",
    steps: [
      { id: "trigger", label: "Run parity", kind: "input", note: "Kick off a check", screen: "/design-system" },
      { id: "scan", label: "Scan", kind: "tool", agent: "scout", note: "Compare code ↔ Figma", screen: "/design-system/tokens" },
      { id: "route", label: "Route severity", kind: "router", note: "Clean · drifted · missing", screen: "/queue" },
      { id: "pass", label: "Pass", kind: "output", note: "Clean → no action", screen: "/system" },
      { id: "fix", label: "Queue fix", kind: "human", note: "Drifted → resolve", screen: "/queue" },
      { id: "create", label: "Create contract", kind: "agent", agent: "echo", note: "Missing → author it", screen: "/system" },
    ],
    edges: [
      { from: "trigger", to: "scan" },
      { from: "scan", to: "route" },
      { from: "route", to: "pass", label: "clean" },
      { from: "route", to: "fix", label: "drifted" },
      { from: "route", to: "create", label: "missing" },
    ],
  },

  // ─────────────────────────── ENGINEER ──────────────────────────
  {
    id: "engineer-hermes",
    persona: "engineer",
    title: "Hermes synthesis pass",
    pattern: "orchestration",
    surface: "desktop",
    problem:
      "Run a synthesis pass over every running hypothesis. The orchestrator delegates UI, workflow, and landing domains, then merges the results.",
    steps: [
      { id: "trigger", label: "Trigger run", kind: "input", note: "Scheduled or manual", screen: "/queue" },
      { id: "read", label: "Read contracts", kind: "tool", note: "Load running hypotheses", screen: "/design-system/hypotheses" },
      { id: "orchestrate", label: "Orchestrate", kind: "agent", agent: "orchestrator", note: "Decompose & delegate", screen: "/queue" },
      { id: "evalui", label: "Eval · UI", kind: "agent", agent: "hermes", note: "UI hypotheses", screen: "/system" },
      { id: "evalwf", label: "Eval · Workflow", kind: "agent", agent: "hermes", note: "Workflow hypotheses", screen: "/design-system" },
      { id: "evalland", label: "Eval · Landing", kind: "agent", agent: "hermes", note: "Landing value-props", screen: "/" },
      { id: "synthesize", label: "Synthesize", kind: "agent", agent: "hermes", note: "Merge into decisions", screen: "/queue" },
      { id: "cards", label: "Queue cards", kind: "output", note: "HITL decisions queued", screen: "/queue" },
    ],
    edges: [
      { from: "trigger", to: "read" },
      { from: "read", to: "orchestrate" },
      { from: "orchestrate", to: "evalui" },
      { from: "orchestrate", to: "evalwf" },
      { from: "orchestrate", to: "evalland" },
      { from: "evalui", to: "synthesize" },
      { from: "evalwf", to: "synthesize" },
      { from: "evalland", to: "synthesize" },
      { from: "synthesize", to: "cards" },
    ],
  },
  {
    id: "engineer-token-audit",
    persona: "engineer",
    title: "Parallel token audit",
    pattern: "parallelization",
    surface: "desktop",
    problem:
      "Audit every token category at once — colors, components, and the radius scale scanned in parallel, then aggregated into one report.",
    steps: [
      { id: "trigger", label: "Start audit", kind: "input", note: "Kick off the sweep", screen: "/design-system/tokens" },
      { id: "fanout", label: "Fan out", kind: "parallel", agent: "scout", note: "Three scans at once", screen: "/design-system/tokens" },
      { id: "tokens", label: "Color tokens", kind: "tool", agent: "scout", note: "Token drift", screen: "/design-system/tokens" },
      { id: "components", label: "Components", kind: "tool", agent: "scout", note: "Component parity", screen: "/design-system/components" },
      { id: "radius", label: "Radius scale", kind: "tool", agent: "scout", note: "Radius / spacing", screen: "/system" },
      { id: "aggregate", label: "Aggregate", kind: "agent", agent: "hermes", note: "Compose one report", screen: "/queue" },
      { id: "report", label: "Report", kind: "output", note: "Audit queued for review", screen: "/queue" },
    ],
    edges: [
      { from: "trigger", to: "fanout" },
      { from: "fanout", to: "tokens" },
      { from: "fanout", to: "components" },
      { from: "fanout", to: "radius" },
      { from: "tokens", to: "aggregate" },
      { from: "components", to: "aggregate" },
      { from: "radius", to: "aggregate" },
      { from: "aggregate", to: "report" },
    ],
  },
  {
    id: "engineer-deploy",
    persona: "engineer",
    title: "Deploy & annotate",
    pattern: "chain",
    surface: "desktop",
    problem:
      "Deploy a design-system update to production and annotate the Figma frame with the preview, with parity gated before promotion.",
    steps: [
      { id: "build", label: "Build update", kind: "input", note: "Stage the change", screen: "/config" },
      { id: "preview", label: "Preview deploy", kind: "tool", agent: "ship", note: "Vercel preview", screen: "/config" },
      { id: "check", label: "Parity check", kind: "agent", agent: "scout", note: "Verify the preview", screen: "/queue" },
      { id: "approve", label: "Approve", kind: "human", note: "Gate the promotion", screen: "/queue" },
      { id: "promote", label: "Promote", kind: "tool", agent: "ship", note: "Ship to production", screen: "/config" },
      { id: "annotate", label: "Annotate Figma", kind: "tool", agent: "echo", note: "Pin the preview URL", screen: "/system" },
      { id: "done", label: "Deployed", kind: "output", note: "Live & annotated", screen: "/config" },
    ],
    edges: [
      { from: "build", to: "preview" },
      { from: "preview", to: "check" },
      { from: "check", to: "approve" },
      { from: "approve", to: "promote" },
      { from: "promote", to: "annotate" },
      { from: "annotate", to: "done" },
    ],
  },
];

export const atlasCatalog: WorkflowCatalog = {
  all: () => WORKFLOWS,
  byPersona: (persona: Persona) => WORKFLOWS.filter((w) => w.persona === persona),
  byId: (id: string) => WORKFLOWS.find((w) => w.id === id),
};
