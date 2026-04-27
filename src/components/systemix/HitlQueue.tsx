"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type CardType =
  | "drift-resolution"
  | "instrumentation-approval"
  | "new-token"
  | "hypothesis-validation";

type CardStatus = "pending" | "approved" | "rejected" | "deferred";

type QueueCard = {
  id: string;
  type: CardType;
  project?: string;
  // drift / token
  token?: string;
  component?: string;
  filePath?: string;
  proposed?: string;
  confidence?: number;
  context: string;
  requestedAt: string;
  status: CardStatus;
  // hypothesis-validation
  hypothesis?: string;
  metric?: string;
  baselineRate?: number;
  variantRate?: number;
  confidenceLevel?: number;
  sessions?: number;
};

// ── Card type config ──────────────────────────────────────────────────────────

const CARD_TYPE: Record<CardType, { label: string; icon: string; color: string }> = {
  "drift-resolution":         { label: "Drift",        icon: "◎", color: "text-amber-400"   },
  "instrumentation-approval": { label: "Instrument",   icon: "▷", color: "text-blue-400"    },
  "new-token":                { label: "New token",    icon: "◆", color: "text-violet-400"  },
  "hypothesis-validation":    { label: "Hypothesis",   icon: "◈", color: "text-emerald-400" },
};

const STATUS_STYLE: Record<CardStatus, string> = {
  pending:  "text-amber-400",
  approved: "text-emerald-400",
  rejected: "text-red-400",
  deferred: "text-muted-foreground/40",
};

function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return `${Math.floor(ms / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtPct(rate: number): string {
  return (rate * 100).toFixed(1) + "%";
}

// ── Hypothesis card ───────────────────────────────────────────────────────────

function HypothesisCard({
  card,
  onAction,
}: {
  card: QueueCard;
  onAction: (id: string, action: CardStatus) => void;
}) {
  const isPending = card.status === "pending";
  const delta = card.variantRate != null && card.baselineRate != null
    ? ((card.variantRate - card.baselineRate) / card.baselineRate * 100).toFixed(1)
    : null;
  const isPositive = delta != null && parseFloat(delta) > 0;

  return (
    <div className={cn(
      "rounded-lg border bg-card",
      isPending ? "border-emerald-500/20" : "border-border/40 opacity-60",
    )}>
      <div className="px-4 pt-3.5 pb-3">
        {/* Header */}
        <div className="flex items-start gap-2.5 mb-3">
          <span className="text-[12px] font-mono mt-px shrink-0 text-emerald-400">◈</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">Hypothesis</span>
              <span className="text-[10px] font-mono text-muted-foreground/30">{ago(card.requestedAt)}</span>
              {card.project && (
                <span className="text-[10px] font-mono text-muted-foreground/30">{card.project}</span>
              )}
            </div>
            <p className="text-[12px] font-mono text-foreground/80 leading-snug">
              {card.hypothesis ?? card.context}
            </p>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wide shrink-0 ${STATUS_STYLE[card.status]}`}>
            {card.status}
          </span>
        </div>

        {/* Metric comparison */}
        {card.metric && card.baselineRate != null && card.variantRate != null && (
          <div className="pl-5 mb-3 grid grid-cols-3 gap-2">
            <div className="rounded border border-border/40 px-2.5 py-2">
              <p className="text-[9px] font-mono text-muted-foreground/40 mb-0.5 uppercase">Baseline</p>
              <p className="text-[14px] font-mono font-bold text-foreground/60">{fmtPct(card.baselineRate)}</p>
            </div>
            <div className="rounded border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-2">
              <p className="text-[9px] font-mono text-muted-foreground/40 mb-0.5 uppercase">Variant</p>
              <p className="text-[14px] font-mono font-bold text-emerald-400">{fmtPct(card.variantRate)}</p>
            </div>
            <div className="rounded border border-border/40 px-2.5 py-2">
              <p className="text-[9px] font-mono text-muted-foreground/40 mb-0.5 uppercase">Delta</p>
              <p className={`text-[14px] font-mono font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                {isPositive ? "+" : ""}{delta}%
              </p>
            </div>
          </div>
        )}

        {/* Confidence + sessions */}
        {card.confidenceLevel != null && (
          <div className="pl-5 mb-2.5 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-[60px] h-1 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500/60"
                  style={{ width: `${card.confidenceLevel * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/50 tabular-nums">
                {Math.round(card.confidenceLevel * 100)}% confidence
              </span>
            </div>
            {card.sessions != null && (
              <span className="text-[10px] font-mono text-muted-foreground/30 tabular-nums">
                {card.sessions.toLocaleString()} sessions
              </span>
            )}
          </div>
        )}

        {/* Hermes proposal */}
        <p className="text-[11px] text-muted-foreground/60 leading-relaxed pl-5 mb-3">
          {card.context}
        </p>

        {/* Actions */}
        {isPending && (
          <div className="pl-5 flex items-center gap-1.5">
            <button
              onClick={() => onAction(card.id, "approved")}
              className="px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/20 transition-colors"
            >
              Promote variant
            </button>
            <button
              onClick={() => onAction(card.id, "deferred")}
              className="px-3 py-1 rounded bg-muted border border-border text-muted-foreground text-[10px] font-bold hover:bg-muted/70 transition-colors"
            >
              Run longer
            </button>
            <button
              onClick={() => onAction(card.id, "rejected")}
              className="px-3 py-1 rounded bg-muted border border-border text-muted-foreground/50 text-[10px] font-bold hover:bg-muted/70 transition-colors"
            >
              Discard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Standard card ─────────────────────────────────────────────────────────────

function StandardCard({
  card,
  onAction,
}: {
  card: QueueCard;
  onAction: (id: string, action: CardStatus) => void;
}) {
  const cfg = CARD_TYPE[card.type] ?? CARD_TYPE["new-token"];
  const isPending = card.status === "pending";

  return (
    <div className={cn(
      "rounded-lg border bg-card transition-colors",
      isPending ? "border-border" : "border-border/40 opacity-60",
    )}>
      <div className="px-4 pt-3.5 pb-3">
        <div className="flex items-start gap-2.5 mb-2.5">
          <span className={`text-[12px] font-mono mt-px shrink-0 ${cfg.color}`}>{cfg.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-[10px] font-bold uppercase tracking-wide ${cfg.color}`}>
                {cfg.label}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/30">{ago(card.requestedAt)}</span>
            </div>
            <p className="text-[12px] font-mono text-foreground/80 truncate">
              {card.token ?? card.component ?? card.filePath}
            </p>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wide shrink-0 ${STATUS_STYLE[card.status]}`}>
            {card.status}
          </span>
        </div>

        {card.proposed && (
          <div className="mb-2 pl-5">
            <code className="text-[10px] font-mono text-foreground/60 bg-muted/40 px-1.5 py-0.5 rounded break-all">
              {card.proposed}
            </code>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground/60 leading-relaxed pl-5 mb-2.5">
          {card.context}
        </p>

        {card.confidence != null && isPending && (
          <div className="pl-5 mb-3 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-muted/40 overflow-hidden max-w-[80px]">
              <div className="h-full rounded-full bg-foreground/20" style={{ width: `${card.confidence * 100}%` }} />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground/40 tabular-nums">
              {Math.round(card.confidence * 100)}% conf
            </span>
          </div>
        )}

        {isPending && (
          <div className="pl-5 flex items-center gap-1.5">
            <button
              onClick={() => onAction(card.id, "approved")}
              className="px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/20 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => onAction(card.id, "rejected")}
              className="px-3 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold hover:bg-red-500/20 transition-colors"
            >
              Reject
            </button>
            <button
              onClick={() => onAction(card.id, "deferred")}
              className="px-3 py-1 rounded bg-muted border border-border text-muted-foreground text-[10px] font-bold hover:bg-muted/70 transition-colors"
            >
              Defer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Queue panel ───────────────────────────────────────────────────────────────

export function HitlQueue({ projectSlug, className }: { projectSlug?: string; className?: string }) {
  const [cards, setCards] = useState<QueueCard[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = projectSlug ? `/api/queue?project=${projectSlug}` : "/api/queue";
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setCards(data.cards ?? []);
        setIsDemo(data.isDemo ?? false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectSlug]);

  const handleAction = useCallback(async (id: string, action: CardStatus) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, status: action } : c));
    if (!isDemo) {
      await fetch("/api/queue", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
    }
  }, [isDemo]);

  const pending = cards.filter(c => c.status === "pending");
  const resolved = cards.filter(c => c.status !== "pending");

  if (loading) return null;

  function renderCard(c: QueueCard) {
    return c.type === "hypothesis-validation"
      ? <HypothesisCard key={c.id} card={c} onAction={handleAction} />
      : <StandardCard   key={c.id} card={c} onAction={handleAction} />;
  }

  return (
    <div className={className ?? "max-w-2xl mt-8 md:mt-10"}>
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="text-[11px] font-black tracking-widest uppercase text-muted-foreground/50">
          Hermes Queue
        </h2>
        {isDemo && (
          <span className="text-[10px] font-mono text-muted-foreground/30">demo</span>
        )}
        {pending.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-500">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            {pending.length} pending
          </span>
        )}
      </div>

      {pending.length > 0 ? (
        <div className="space-y-2.5">{pending.map(renderCard)}</div>
      ) : (
        <div className="rounded-lg border border-dashed border-border/50 px-5 py-4">
          <p className="text-[11px] font-mono text-muted-foreground/40">
            Queue is clear — Hermes has no pending decisions.
          </p>
        </div>
      )}

      {resolved.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-mono text-muted-foreground/30 mb-2 uppercase tracking-widest">
            Resolved ({resolved.length})
          </p>
          <div className="space-y-2">{resolved.map(renderCard)}</div>
        </div>
      )}
    </div>
  );
}
