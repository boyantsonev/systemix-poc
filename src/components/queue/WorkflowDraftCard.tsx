"use client";

import { cn } from "@/lib/utils";

type CardStatus = "pending" | "approved" | "rejected" | "deferred";

export type WorkflowDraftData = {
  id: string;
  type: string;
  workflowId?: string;
  draftPath?: string;
  skill?: string;
  title?: string;
  persona?: string;
  pattern?: string;
  stepCount?: number;
  context: string;
  requestedAt: string;
  status: CardStatus;
};

function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return `${Math.floor(ms / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STATUS_STYLE: Record<CardStatus, string> = {
  pending:  "text-amber-600 dark:text-amber-400",
  approved: "text-emerald-600 dark:text-emerald-400",
  rejected: "text-red-600 dark:text-red-400",
  deferred: "text-muted-foreground/60",
};

const PATTERN_LABEL: Record<string, string> = {
  chain:            "chain",
  routing:          "routing",
  parallelization:  "parallel",
  orchestration:    "orchestration",
};

export function WorkflowDraftCard({
  card,
  onAction,
}: {
  card: WorkflowDraftData;
  onAction: (id: string, action: CardStatus) => void;
}) {
  const isPending = card.status === "pending";

  return (
    <div className={cn(
      "rounded-lg border bg-card transition-colors",
      isPending ? "border-sky-500/20" : "border-border/40 opacity-60",
    )}>
      <div className="px-4 pt-3.5 pb-3">
        {/* Header */}
        <div className="flex items-start gap-2.5 mb-2.5">
          <span className="text-[12px] font-mono mt-px shrink-0 text-sky-600 dark:text-sky-400">◧</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-sky-600 dark:text-sky-400">
                Workflow draft
              </span>
              <span className="text-[11px] font-mono text-muted-foreground/60">{ago(card.requestedAt)}</span>
            </div>
            <p className="text-[13px] font-mono text-foreground/90 truncate">
              {card.title ?? card.workflowId}
            </p>
          </div>
          <span className={`text-[11px] font-bold uppercase tracking-wide shrink-0 ${STATUS_STYLE[card.status]}`}>
            {card.status}
          </span>
        </div>

        {/* Metadata chips */}
        <div className="pl-5 flex items-center gap-2 mb-2.5 flex-wrap">
          {card.skill && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground/70">
              /{card.skill}
            </span>
          )}
          {card.persona && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground/70">
              {card.persona}
            </span>
          )}
          {card.pattern && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-sky-500/20 text-sky-700 dark:text-sky-400">
              {PATTERN_LABEL[card.pattern] ?? card.pattern}
            </span>
          )}
          {card.stepCount != null && (
            <span className="text-[10px] font-mono text-muted-foreground/50">
              {card.stepCount} steps
            </span>
          )}
        </div>

        {/* Context */}
        <p className="text-[13px] text-muted-foreground leading-relaxed pl-5 mb-3">
          {card.context}
        </p>

        {/* Draft path */}
        {card.draftPath && isPending && (
          <div className="pl-5 mb-3">
            <code className="text-[11px] font-mono text-foreground/50 bg-muted/60 px-1.5 py-0.5 rounded">
              {card.draftPath}
            </code>
          </div>
        )}

        {/* Actions */}
        {isPending ? (
          <div className="pl-5 flex items-center gap-1.5">
            <button
              onClick={() => onAction(card.id, "approved")}
              className="px-3 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/20 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => onAction(card.id, "rejected")}
              className="px-3 py-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-[11px] font-bold hover:bg-red-500/20 transition-colors"
            >
              Reject
            </button>
            <button
              onClick={() => onAction(card.id, "deferred")}
              className="px-3 py-1.5 rounded bg-muted border border-border text-muted-foreground text-[11px] font-bold hover:bg-muted/70 transition-colors"
            >
              Defer
            </button>
          </div>
        ) : card.status === "approved" ? (
          <p className="pl-5 text-[11px] font-mono text-emerald-700 dark:text-emerald-400/70">
            ✓ contract written to contract/workflows/ · catalog rebuilt
          </p>
        ) : card.status === "rejected" ? (
          <p className="pl-5 text-[11px] font-mono text-muted-foreground/60">
            draft discarded — re-run atlas scan to regenerate
          </p>
        ) : null}
      </div>
    </div>
  );
}
