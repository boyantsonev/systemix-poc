import Link from "next/link";
import { DocsPage, DocsBody, DocsTitle } from "fumadocs-ui/page";
import { loadLearnings } from "@/lib/contract/learnings";
import { comparableRun, getTrend, type DriftSnapshot } from "@/lib/state/drift-history";

export const dynamic = "force-dynamic";

// The design-system memory — two feeds over the files the loop actually
// writes: the earned-learnings ledger (experiments/LEARNINGS.md) and the
// drift audit history (.systemix/drift-history.json). Real data only; the
// empty states say exactly what will fill them.

const DECISION: Record<string, string> = {
  promote: "text-success border-success/30 bg-success/10",
  kill: "text-destructive border-destructive/30 bg-destructive/10",
  iterate: "text-warning border-warning/30 bg-warning/10",
};

/** Tiny inline SVG sparkline over drift scores — no chart lib. */
function DriftSparkline({ snapshots }: { snapshots: DriftSnapshot[] }) {
  if (snapshots.length < 2) return null;
  const w = 240;
  const h = 48;
  const pad = 4;
  const scores = snapshots.map((s) => s.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const span = max - min || 1;
  const points = scores
    .map((score, i) => {
      const x = pad + (i / (scores.length - 1)) * (w - pad * 2);
      const y = h - pad - ((score - min) / span) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-12 w-60 text-foreground/70"
      role="img"
      aria-label={`Drift score trend over the last ${snapshots.length} audits`}
    >
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function MemoryPage() {
  const learnings = loadLearnings();
  const trend = getTrend(30);
  const latest = trend.length > 0 ? trend[trend.length - 1] : null;

  return (
    <DocsPage>
      <DocsTitle>Memory</DocsTitle>
      <DocsBody>
        <p className="text-fd-muted-foreground">
          The design system&apos;s earned memory — what the loop learned and how far
          the shipped product has drifted from the contract. Both feeds read the
          real files the loop writes; nothing here is sample data.
        </p>

        {/* ── Learnings ledger ─────────────────────────────────────────── */}
        <h2>Learnings</h2>
        <div className="not-prose">
          {learnings.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/50 px-5 py-6">
              <p className="text-[13px] text-muted-foreground">No entries yet.</p>
              <p className="mt-1 text-[12px] font-mono text-muted-foreground/50">
                The first earned line lands when{" "}
                <Link href="/experiments/landing-ai-native-ds-2026-07" className="underline underline-offset-2">
                  landing-ai-native-ds-2026-07
                </Link>{" "}
                closes — every entry cites the experiment that earned it.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {learnings.map((l) => (
                <div
                  key={l.raw}
                  className="rounded-lg border border-border bg-muted/10 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {l.decision ? (
                      <span
                        className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-mono ${DECISION[l.decision] ?? DECISION.iterate}`}
                      >
                        {l.decision}
                      </span>
                    ) : null}
                    <span className="text-[13px] font-semibold text-foreground">{l.title}</span>
                    <span className="ml-auto text-[10px] font-mono text-muted-foreground/50">
                      {l.date ?? ""}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-snug text-muted-foreground">{l.raw}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] font-mono text-muted-foreground/60">
                    <span>confidence {l.confidence ?? "—"}</span>
                    {l.experimentId ? (
                      <Link
                        href={`/experiments/${l.experimentId}`}
                        className="underline underline-offset-2 hover:text-foreground"
                      >
                        from {l.experimentId}
                      </Link>
                    ) : null}
                    {l.reviewBy ? <span>review by {l.reviewBy}</span> : null}
                    {l.usedBy.length > 0 ? <span>used by {l.usedBy.join(", ")}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Drift history ────────────────────────────────────────────── */}
        <h2>Drift</h2>
        <div className="not-prose">
          {!latest ? (
            <div className="rounded-lg border border-dashed border-border/50 px-5 py-6">
              <p className="text-[13px] text-muted-foreground">No drift snapshots yet.</p>
              <p className="mt-1 text-[12px] font-mono text-muted-foreground/50">
                Run /drift-report — or press play on the Drift Report skill in{" "}
                <Link href="/config" className="underline underline-offset-2">
                  the ops view
                </Link>{" "}
                — and every audit lands here: score, offenders, trend.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-6 rounded-lg border border-border bg-muted/10 px-4 py-3">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">
                    latest drift score
                  </p>
                  <p className="text-3xl font-black text-foreground">{latest.score}</p>
                </div>
                <div className="text-[12px] font-mono text-muted-foreground">
                  {latest.critical} critical · {latest.warnings} warnings ·{" "}
                  {latest.componentsAudited} components · {latest.runAt.slice(0, 10)}
                </div>
                <DriftSparkline snapshots={comparableRun(trend)} />
              </div>
              <div className="space-y-2">
                {[...trend].reverse().map((s) => (
                  <div
                    key={s.runAt}
                    className="flex items-start gap-3 rounded-lg border border-border bg-muted/10 px-4 py-3"
                  >
                    <span className="inline-flex shrink-0 items-center rounded-md border border-border px-1.5 py-0.5 text-[11px] font-mono text-foreground">
                      {s.score}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] text-muted-foreground">
                        {s.critical} critical · {s.warnings} warnings · {s.componentsAudited} components
                        {" · "}via {s.triggeredBy}
                      </span>
                      {s.topOffenders.length > 0 ? (
                        <span className="block truncate text-[11px] font-mono text-muted-foreground/50">
                          {s.topOffenders.slice(0, 3).join(" · ")}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-[10px] font-mono text-muted-foreground/50">
                      {s.runAt.slice(0, 10)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DocsBody>
    </DocsPage>
  );
}
