import Link from "next/link";

type Rec = Record<string, unknown>;

// Verdict-first strip for hypothesis pages: the bet's state and what the
// evidence says, rendered from frontmatter. Grey and honest when nothing has
// been measured — an unread experiment must not look like a validated one.
const TONES: Record<string, string> = {
  VALIDATED: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
  REFUTED: "text-red-500 border-red-500/30 bg-red-500/10",
  ITERATE: "text-amber-500 border-amber-500/30 bg-amber-500/10",
  RUNNING: "text-sky-500 border-sky-500/30 bg-sky-500/10",
  RETIRED: "text-muted-foreground border-border bg-muted/40",
};

function verdictOf(data: Rec): string {
  const decision = typeof data.decision === "string" ? data.decision : null;
  if (decision === "promote") return "VALIDATED";
  if (decision === "kill") return "REFUTED";
  if (decision === "iterate") return "ITERATE";
  const status = typeof data.status === "string" ? data.status : "running";
  if (status === "archived") return "RETIRED";
  return status.toUpperCase();
}

export function VerdictStrip({ data }: { data: Rec }) {
  const verdict = verdictOf(data);
  const confidence = typeof data.confidence === "number" ? data.confidence : null;
  const result = typeof data.result === "string" && data.result ? data.result : null;
  const goal = typeof data.goal === "string" ? data.goal : null;
  const hasEvidence = result !== null || confidence !== null;

  return (
    <div className="not-prose mb-6 rounded-lg border border-border bg-muted/20 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-mono font-bold ${TONES[verdict] ?? TONES.RETIRED}`}
        >
          {verdict}
        </span>
        {data.section ? (
          <span className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
            {String(data.section)}
          </span>
        ) : null}
        {confidence !== null ? (
          <span className="text-[11px] font-mono text-muted-foreground">
            confidence {confidence}
          </span>
        ) : null}
        {goal ? (
          <Link
            href={`/contract/goals/${goal}`}
            className="ml-auto text-[11px] font-mono text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            ↳ goal: {goal}
          </Link>
        ) : null}
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
        {hasEvidence
          ? (result ?? "Evidence recorded — see the decision history below.")
          : "No evidence read yet — the criteria stand as registered; signal wiring is pending."}
      </p>
    </div>
  );
}
