// The autonomy dial, made mechanical (docs/feature/contract-rework/contract-model.md).
// The instance's trust tier (trust.hermes_tier, 0–3) is the hard execution gate;
// this module turns the prose matrix into one enforceable function the write
// sites consult and the AutonomyClause renders. One source, no drift.

export type Artifact =
  | "evidence" // result/confidence/evidence-posthog fields on a hypothesis
  | "hypothesis" // a hypothesis contract (create/edit)
  | "memory" // a memory entry on the root contract
  | "brief" // the contract brief
  | "goal" // a goal contract
  | "record"; // record status fields (drift, parity)

export type Disposition = "auto" | "propose";

// Trust tier → the three matrix columns. tier 0 = ghost, 1 = balanced, 2–3 = high.
// Value = the minimum tier at which the engine may write this artifact WITHOUT a
// human in the loop. Infinity = never autonomous (the covenant: goals and the
// brief are always proposed, never self-authored).
const AUTO_AT: Record<Artifact, number> = {
  record: 0, // drift/parity already resolve via skills at every tier
  evidence: 1, // ghost proposes; balanced+ auto-writes evidence
  hypothesis: 2, // ghost/balanced propose; high auto-creates
  memory: 2, // ghost/balanced propose; high auto-appends
  brief: Infinity, // always proposed
  goal: Infinity, // the covenant — humans give goals
};

export function tierBand(tier: number): "ghost" | "balanced" | "high" {
  if (tier <= 0) return "ghost";
  if (tier === 1) return "balanced";
  return "high";
}

/** What the engine may do with `artifact` at trust `tier`, absent a human. */
export function mayWrite(tier: number, artifact: Artifact): Disposition {
  return tier >= AUTO_AT[artifact] ? "auto" : "propose";
}

export class WritePolicyError extends Error {
  constructor(public tier: number, public artifact: Artifact) {
    super(
      `Write to "${artifact}" denied at trust tier ${tier} (${tierBand(tier)}): ` +
        `this artifact must be proposed through the queue, not written directly.`,
    );
    this.name = "WritePolicyError";
  }
}

/**
 * Guard the write sites. A human-approved action (a resolved queue card) is
 * always allowed — the human IS the gate. An autonomous write is allowed only
 * where the matrix says `auto`; otherwise it must go to the queue as a proposal.
 */
export function assertWriteAllowed(opts: {
  tier: number;
  artifact: Artifact;
  humanApproved: boolean;
}): void {
  if (opts.humanApproved) return;
  if (mayWrite(opts.tier, opts.artifact) === "auto") return;
  throw new WritePolicyError(opts.tier, opts.artifact);
}

// Rows the AutonomyClause renders — derived from the same matrix so the surface
// can never disagree with what the code enforces.
export const MATRIX_ARTIFACTS: { artifact: Artifact; label: string }[] = [
  { artifact: "evidence", label: "Evidence fields on hypotheses" },
  { artifact: "hypothesis", label: "Hypothesis contracts (create/edit)" },
  { artifact: "memory", label: "Memory entries" },
  { artifact: "goal", label: "Goals" },
  { artifact: "brief", label: "The brief" },
  { artifact: "record", label: "Record status (drift, parity)" },
];

export const MATRIX_ROWS = MATRIX_ARTIFACTS.map(({ artifact, label }) => ({
  artifact,
  label,
  ghost: mayWrite(0, artifact),
  balanced: mayWrite(1, artifact),
  high: mayWrite(2, artifact),
}));
