import Link from "next/link";
import { contractSource } from "@/lib/contract-source";

// Generated goals index for the root contract page (contract/index.mdx).
// Rendered from goal frontmatter so the list can never drift from the files —
// the MDX must not hand-maintain it (contract-model.md: "never hand-edited").
const TONES: Record<string, string> = {
  active: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
  validated: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
  parked: "text-muted-foreground border-border bg-muted/40",
  killed: "text-red-500 border-red-500/30 bg-red-500/10",
};

export function GoalsIndex() {
  const pages = contractSource.getPages();
  const hypotheses = pages.filter((p) => p.slugs[0] === "hypotheses");
  const goals = pages
    .filter((p) => p.slugs[0] === "goals")
    .sort((a, b) => {
      const da = a.data as unknown as Record<string, unknown>;
      const db = b.data as unknown as Record<string, unknown>;
      return ((da.order as number) ?? 99) - ((db.order as number) ?? 99);
    });

  return (
    <div className="not-prose space-y-3">
      {goals.map((g) => {
        const d = g.data as unknown as Record<string, unknown>;
        const status = String(d.status ?? "active");
        const count = hypotheses.filter(
          (h) => (h.data as unknown as Record<string, unknown>).goal === d.id,
        ).length;
        return (
          <Link
            key={g.url}
            href={g.url}
            className="block rounded-lg border border-border bg-muted/10 px-4 py-3 transition-colors hover:bg-muted/30"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-semibold text-foreground">
                {String(d.title)}
              </span>
              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono ${TONES[status] ?? TONES.parked}`}
              >
                {status}
              </span>
              <span className="ml-auto text-[11px] font-mono text-muted-foreground/60">
                {count > 0 ? `${count} hypothes${count === 1 ? "is" : "es"}` : "—"}
              </span>
            </div>
            {d.given ? (
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                {String(d.given)}
              </p>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
