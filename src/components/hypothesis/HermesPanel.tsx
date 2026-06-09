"use client";

import { useEffect, useState } from "react";

type SynthesisCard = {
  id: string;
  status: string;
  context?: string;
  proposal?: string;
  confidenceLevel?: number;
  requestedAt?: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "awaiting decision",
  approved: "promoted",
  rejected: "discarded",
  deferred: "running longer",
};

// Shows the most recent Hermes synthesis for a hypothesis, read from the same
// queue the HITL panel uses. Polls while the card is pending.
export function HermesPanel({ hypothesisId }: { hypothesisId: string }) {
  const [card, setCard] = useState<SynthesisCard | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      try {
        const r = await fetch(`/api/queue?hypothesis=${encodeURIComponent(hypothesisId)}`);
        const d = await r.json();
        const cards = (d.cards ?? []) as SynthesisCard[];
        const latest = cards[0] ?? null; // hermes/run unshifts newest first
        if (!active) return;
        setCard(latest);
        setLoaded(true);
        if (latest?.status === "pending") timer = setTimeout(load, 5000);
      } catch {
        if (active) setLoaded(true);
      }
    }

    load();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [hypothesisId]);

  if (!loaded) return null;

  return (
    <div className="mt-8">
      <p className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-3">
        Hermes synthesis
      </p>

      {!card ? (
        <div className="rounded-xl border border-dashed border-border/50 px-4 py-4">
          <p className="text-[13px] text-muted-foreground/70">
            No synthesis yet — save the hypothesis to trigger Hermes, or open the{" "}
            <a href="/queue" className="underline underline-offset-2 hover:text-foreground">
              queue
            </a>
            .
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[12px] font-mono text-emerald-600 dark:text-emerald-400">◈</span>
            <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              {STATUS_LABEL[card.status] ?? card.status}
            </span>
            {card.requestedAt && (
              <span className="text-[11px] font-mono text-muted-foreground/50">
                {card.requestedAt.slice(0, 10)}
              </span>
            )}
          </div>

          {card.confidenceLevel != null && (
            <div className="flex items-center gap-2 mb-3">
              <div className="w-[80px] h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${card.confidenceLevel * 100}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                {Math.round(card.confidenceLevel * 100)}% confidence
              </span>
            </div>
          )}

          {card.context && (
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">{card.context}</p>
          )}

          {card.proposal && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
              <p className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1.5">
                Hermes recommends
              </p>
              <p className="text-[12px] font-mono text-emerald-800 dark:text-emerald-300 leading-relaxed">
                {card.proposal}
              </p>
            </div>
          )}

          {card.status === "pending" && (
            <p className="mt-3 text-[11px] font-mono text-muted-foreground/60">
              Decide in the{" "}
              <a href="/queue" className="underline underline-offset-2 hover:text-foreground">
                Hermes queue
              </a>{" "}
              → promote · run longer · discard.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
