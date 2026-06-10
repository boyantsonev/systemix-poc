import Link from "next/link";
import { contractSource } from "@/lib/contract-source";

// Generated hypothesis list for a goal page — children are derived from the
// hypotheses' `goal:` backlink (single source, no double-entry to drift).
const TONES: Record<string, string> = {
  running: "text-sky-500 border-sky-500/30 bg-sky-500/10",
  validated: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
  complete: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
  refuted: "text-red-500 border-red-500/30 bg-red-500/10",
  killed: "text-red-500 border-red-500/30 bg-red-500/10",
  archived: "text-muted-foreground border-border bg-muted/40",
};

export function GoalHypotheses({ goal }: { goal: string }) {
  const items = contractSource
    .getPages()
    .filter((p) => {
      const d = p.data as unknown as Record<string, unknown>;
      return p.slugs[0] === "hypotheses" && d.goal === goal;
    })
    .sort((a, b) => {
      const da = (a.data as unknown as Record<string, unknown>).created;
      const db = (b.data as unknown as Record<string, unknown>).created;
      return String(db ?? "").localeCompare(String(da ?? ""));
    });

  if (!items.length) {
    return (
      <p className="not-prose text-[12px] text-muted-foreground/60">
        No hypotheses registered under this goal yet.
      </p>
    );
  }

  return (
    <div className="not-prose space-y-2">
      {items.map((h) => {
        const d = h.data as unknown as Record<string, unknown>;
        const status = String(d.status ?? "running");
        return (
          <Link
            key={h.url}
            href={h.url}
            className="flex items-start gap-2 rounded-lg border border-border bg-muted/10 px-4 py-2.5 transition-colors hover:bg-muted/30"
          >
            <span
              className={`mt-0.5 inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[10px] font-mono ${TONES[status] ?? TONES.archived}`}
            >
              {status}
            </span>
            <span className="text-[12px] leading-relaxed text-muted-foreground">
              {String(d.title)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
