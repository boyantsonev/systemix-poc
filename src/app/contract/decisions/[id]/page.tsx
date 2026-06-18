import Link from "next/link";
import { notFound } from "next/navigation";
import { DocsPage, DocsBody, DocsTitle } from "fumadocs-ui/page";
import { readQueueCards } from "@/lib/queue-store";

export const dynamic = "force-dynamic";

// Decision permalink — the citable unit of accountability: what was proposed,
// what was known, who decided, what happened. Fields the loop does not capture
// yet (frozen evidence snapshots, contract diffs) render as honest absences.
export default async function DecisionPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const card = readQueueCards().find((c) => c.id === id);
  if (!card) notFound();

  const action = card.resolution?.action ?? card.status;
  const subjectHref = card.hypothesisId
    ? `/experiments/${card.hypothesisId}`
    : null;

  const rows: Array<[string, React.ReactNode]> = [
    ["Type", card.type],
    [
      "Subject",
      subjectHref ? (
        <Link key="s" href={subjectHref} className="underline underline-offset-2">
          {card.hypothesisId}
        </Link>
      ) : (
        (card.token ?? card.component ?? card.filePath ?? "—")
      ),
    ],
    ["Status", action],
    ["Requested", card.requestedAt ?? "—"],
    ["Resolved", card.resolvedAt ?? "—"],
    ["Resolved by", card.resolution?.resolvedBy ?? "—"],
    [
      "Confidence",
      card.confidenceLevel != null
        ? String(card.confidenceLevel)
        : card.confidence != null
          ? String(card.confidence)
          : "—",
    ],
  ];

  return (
    <DocsPage>
      <DocsTitle>Decision · {card.id}</DocsTitle>
      <DocsBody>
        <div className="not-prose space-y-6">
          <dl className="grid grid-cols-[120px_1fr] gap-y-1.5 text-[13px]">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground/60 py-0.5">
                  {k}
                </dt>
                <dd className="text-muted-foreground py-0.5">{v}</dd>
              </div>
            ))}
          </dl>

          {card.proposal || card.proposed ? (
            <section>
              <h2 className="mb-1.5 text-[11px] font-mono font-bold uppercase tracking-widest text-muted-foreground/60">
                Proposal
              </h2>
              <p className="rounded-lg border border-border bg-muted/10 px-4 py-3 text-[13px] leading-relaxed text-foreground/90 font-mono">
                {card.proposal ?? card.proposed}
              </p>
            </section>
          ) : null}

          {card.context ? (
            <section>
              <h2 className="mb-1.5 text-[11px] font-mono font-bold uppercase tracking-widest text-muted-foreground/60">
                Synthesis at decision time
              </h2>
              <p className="text-[13px] leading-relaxed text-muted-foreground">{card.context}</p>
            </section>
          ) : null}

          <section>
            <h2 className="mb-1.5 text-[11px] font-mono font-bold uppercase tracking-widest text-muted-foreground/60">
              Evidence snapshot
            </h2>
            {card._posthogData ? (
              <p className="text-[13px] text-muted-foreground">
                Signal read {card._posthogData.fetched_at ?? "—"} · source{" "}
                {card._posthogData.source ?? "—"}
                {card.sessions != null ? ` · ${card.sessions.toLocaleString()} sessions` : ""}
              </p>
            ) : (
              <p className="text-[13px] text-muted-foreground/60">
                No frozen evidence snapshot was captured for this decision.
              </p>
            )}
          </section>

          {card.resolution?.note ? (
            <section>
              <h2 className="mb-1.5 text-[11px] font-mono font-bold uppercase tracking-widest text-muted-foreground/60">
                Note
              </h2>
              <p className="text-[13px] text-muted-foreground">{card.resolution.note}</p>
            </section>
          ) : null}

          <Link
            href="/contract/decisions"
            className="inline-block text-[12px] font-mono text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            ← all decisions
          </Link>
        </div>
      </DocsBody>
    </DocsPage>
  );
}
