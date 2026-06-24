import Link from "next/link";
import { DocsPage, DocsBody, DocsTitle } from "fumadocs-ui/page";
import { readQueueCards } from "@/lib/queue-store";

export const dynamic = "force-dynamic";

// The decisions ledger — the accountability spine of the contract. Every
// resolved queue item, newest first, each with a permalink. Real data only:
// this page never renders sample cards (an unlabeled fake decision on the
// proof surface would falsify the whole claim).
const ACTION: Record<string, { glyph: string; cls: string }> = {
  approved: { glyph: "✓", cls: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10" },
  rejected: { glyph: "✕", cls: "text-red-500 border-red-500/30 bg-red-500/10" },
  deferred: { glyph: "→", cls: "text-amber-500 border-amber-500/30 bg-amber-500/10" },
};

export default function DecisionsLedger() {
  const cards = readQueueCards();
  const resolved = cards
    .filter((c) => c.status && c.status !== "pending")
    .sort((a, b) =>
      String(b.resolvedAt ?? b.requestedAt ?? "").localeCompare(
        String(a.resolvedAt ?? a.requestedAt ?? ""),
      ),
    );
  const pending = cards.filter((c) => c.status === "pending").length;

  return (
    <DocsPage>
      <DocsTitle>Decisions</DocsTitle>
      <DocsBody>
        <p className="text-fd-muted-foreground">
          The accountability ledger — every decision the engine brought and a
          human resolved, newest first. This page renders only the real queue;
          it never shows sample data.
        </p>

        <div className="not-prose mt-8">
          {pending > 0 ? (
            <p className="mb-4 text-[12px] font-mono text-amber-500">
              {pending} pending decision{pending === 1 ? "" : "s"} awaiting review in{" "}
              <Link href="/config" className="underline underline-offset-2">
                the ops view
              </Link>
              .
            </p>
          ) : null}

          {resolved.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/50 px-5 py-6">
              <p className="text-[13px] text-muted-foreground">No decisions recorded yet.</p>
              <p className="mt-1 text-[12px] font-mono text-muted-foreground/50">
                The ledger fills as queue items are approved, rejected, or
                deferred — every write the engine makes starts as a decision here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {resolved.map((c) => {
                const action = c.resolution?.action ?? c.status;
                const cfg = ACTION[action] ?? ACTION.deferred;
                const label = c.token ?? c.component ?? c.experimentId ?? c.id;
                return (
                  <Link
                    key={c.id}
                    href={`/contract/decisions/${c.id}`}
                    className="flex items-start gap-3 rounded-lg border border-border bg-muted/10 px-4 py-3 transition-colors hover:bg-muted/30"
                  >
                    <span className={`mt-0.5 inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[11px] font-mono ${cfg.cls}`}>
                      {cfg.glyph} {action}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-mono font-semibold text-foreground">
                        {label}
                      </span>
                      <span className="block text-[12px] leading-snug text-muted-foreground">
                        {c.proposal ?? c.proposed ?? c.context ?? ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] font-mono text-muted-foreground/50">
                      {(c.resolvedAt ?? c.requestedAt ?? "").slice(0, 10)}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </DocsBody>
    </DocsPage>
  );
}
