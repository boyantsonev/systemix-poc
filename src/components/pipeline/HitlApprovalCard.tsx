"use client";

import {
  UserCheck,
  CheckCircle2,
  XCircle,
  GitCommit,
  FileCode2,
  BookOpen,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorkflowStep } from "@/lib/data/pipeline";
import type { WorkflowNodeDef } from "@/lib/data/workflows";
import { DiffViewer } from "./DiffViewer";

// ── Payload types ──────────────────────────────────────────────────────────────

type HitlPayload =
  | {
      type: "token-diff";
      summary: string;
      affectedFiles: string[];
      affectedComponents: string[];
      added: { key: string; value: string }[];
      changed: { key: string; from: string; to: string }[];
      removed: { key: string; lastValue: string }[];
    }
  | {
      type: "code-review";
      componentName: string;
      proposedPath: string;
      lineCount: number;
      tokensUsed: string[];
      driftScore: number;
      generatedCode: string;
    }
  | {
      type: "docs-review";
      summary: string;
      docsWritten: {
        slug: string;
        type: string;
        title: string;
        action: "created" | "updated";
      }[];
    }
  | {
      type: "drift-report";
      scope: string;
      componentsAudited: number;
      componentsDrifted: number;
      totalInstances: number;
      critical: { file: string; line: number; value: string; token: string }[];
      autoFixable: number;
    };

type ExtendedNode = WorkflowNodeDef & { hitlPayload?: HitlPayload };

type Props = {
  step: WorkflowStep;
  node: ExtendedNode;
  onDecision: (decision: "approve" | "reject") => void;
};

// ── Sub-renderers ──────────────────────────────────────────────────────────────

function TokenDiffContent({ payload }: { payload: Extract<HitlPayload, { type: "token-diff" }> }) {
  const total =
    payload.added.length + payload.changed.length + payload.removed.length;
  return (
    <div className="space-y-2">
      <p className="text-[10px] text-muted-foreground">
        Apply{" "}
        <span className="text-foreground font-semibold">{total} token changes</span>{" "}
        to globals.css?
      </p>
      <DiffViewer
        added={payload.added}
        changed={payload.changed}
        removed={payload.removed}
        affectedFiles={payload.affectedFiles}
        affectedComponents={payload.affectedComponents}
      />
    </div>
  );
}

function CodeReviewContent({ payload }: { payload: Extract<HitlPayload, { type: "code-review" }> }) {
  return (
    <div className="space-y-2">
      {/* Stats row */}
      <div className="flex flex-wrap gap-1.5">
        <span className="bg-muted px-2 py-0.5 rounded text-[10px] font-mono text-foreground/80">
          {payload.componentName}
        </span>
        <span className="bg-muted px-2 py-0.5 rounded text-[10px] font-mono text-foreground/80">
          {payload.lineCount} lines
        </span>
        <span className="bg-muted px-2 py-0.5 rounded text-[10px] font-mono text-foreground/80">
          drift: {payload.driftScore}
        </span>
        <span className="bg-muted px-2 py-0.5 rounded text-[10px] font-mono text-foreground/80">
          {payload.tokensUsed.length} tokens mapped
        </span>
      </div>

      {/* Proposed path */}
      <p className="text-[10px] font-mono text-muted-foreground">
        &rarr; {payload.proposedPath}
      </p>

      {/* Code preview */}
      <pre className="max-h-48 overflow-y-auto bg-black/40 rounded-lg p-3 text-[10px] font-mono text-foreground/80 whitespace-pre leading-relaxed">
        {payload.generatedCode}
      </pre>
    </div>
  );
}

function DocsReviewContent({ payload }: { payload: Extract<HitlPayload, { type: "docs-review" }> }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] text-muted-foreground">{payload.summary}</p>
      <div className="space-y-1">
        {payload.docsWritten.map((doc) => (
          <div
            key={doc.slug}
            className="flex items-center gap-2 py-1 px-2 rounded-md bg-muted/30"
          >
            {doc.action === "created" ? (
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100 border border-emerald-300 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-500/20 px-1.5 py-0.5 rounded flex-shrink-0">
                created
              </span>
            ) : (
              <span className="text-[10px] font-medium text-amber-700 bg-amber-100 border border-amber-300 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-500/20 px-1.5 py-0.5 rounded flex-shrink-0">
                updated
              </span>
            )}
            <span className="text-xs text-foreground/90 flex-1 min-w-0 truncate">
              {doc.title}
            </span>
            <span className="text-[10px] text-muted-foreground flex-shrink-0">
              {doc.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DriftReportContent({ payload }: { payload: Extract<HitlPayload, { type: "drift-report" }> }) {
  return (
    <div className="space-y-2">
      {/* Summary */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        <span className="text-[10px] text-muted-foreground">
          Scope: <span className="text-foreground/80 font-mono">{payload.scope}</span>
        </span>
        <span className="text-[10px] text-muted-foreground">
          Audited: <span className="text-foreground/80">{payload.componentsAudited}</span>
        </span>
        <span className="text-[10px] text-muted-foreground">
          Drifted: <span className="text-red-600 dark:text-red-400 font-medium">{payload.componentsDrifted}</span>
        </span>
        <span className="text-[10px] text-muted-foreground">
          Instances: <span className="text-foreground/80">{payload.totalInstances}</span>
        </span>
        {payload.autoFixable > 0 && (
          <span className="text-[10px] text-muted-foreground">
            Auto-fixable: <span className="text-violet-700 dark:text-violet-400 font-medium">{payload.autoFixable}</span>
          </span>
        )}
      </div>

      {/* Critical items */}
      {payload.critical.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Critical
          </p>
          {payload.critical.map((item, i) => (
            <div
              key={i}
              className="flex items-baseline gap-2 bg-red-100 border border-red-300 dark:bg-red-950/20 dark:border-red-500/10 rounded px-2 py-1"
            >
              <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">
                {item.file}:{item.line}
              </span>
              <span className="text-[10px] text-foreground/70 flex-shrink-0">
                {item.value}
              </span>
              <span className="text-[10px] text-muted-foreground flex-shrink-0">&rarr;</span>
              <span className="text-[10px] font-mono text-teal-700 dark:text-teal-400 min-w-0 truncate">
                {item.token}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Header config ──────────────────────────────────────────────────────────────

const PAYLOAD_HEADER: Record<
  NonNullable<HitlPayload["type"]>,
  { label: string; Icon: React.ElementType }
> = {
  "token-diff":   { label: "Token Diff Review",    Icon: GitCommit   },
  "code-review":  { label: "Component Review",      Icon: FileCode2   },
  "docs-review":  { label: "Documentation Review",  Icon: BookOpen    },
  "drift-report": { label: "Drift Report Review",   Icon: BarChart2   },
};

// ── Main component ─────────────────────────────────────────────────────────────

export function HitlApprovalCard({ step, node, onDecision }: Props) {
  const payload = (node as ExtendedNode).hitlPayload;
  const payloadType = payload?.type;

  const headerCfg = payloadType
    ? PAYLOAD_HEADER[payloadType]
    : { label: "Approval Required", Icon: UserCheck };

  const { label: headerLabel, Icon: HeaderIcon } = headerCfg;

  const prompt =
    node.approvalPrompt ?? step.log[0] ?? "Review required before proceeding.";

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: "1px solid color-mix(in oklch, var(--color-drifted) 40%, transparent)",
        backgroundColor: "var(--color-drifted-surface)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b"
        style={{ borderColor: "color-mix(in oklch, var(--color-drifted) 25%, transparent)" }}
      >
        <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: "var(--color-drifted)" }} />
        <span className="flex-shrink-0" style={{ color: "var(--color-drifted)" }}><HeaderIcon size={12} /></span>
        <span className="text-[12px] font-semibold" style={{ color: "var(--color-drifted)" }}>{headerLabel}</span>
      </div>

      {/* Content */}
      <div className="px-3 py-2.5">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60 mb-2">
          {node.label}
        </p>

        {!payload && (
          <pre className="text-[11px] font-mono text-foreground/80 whitespace-pre-wrap leading-relaxed">
            {prompt}
          </pre>
        )}

        {payload?.type === "token-diff" && (
          <TokenDiffContent payload={payload} />
        )}

        {payload?.type === "code-review" && (
          <CodeReviewContent payload={payload} />
        )}

        {payload?.type === "docs-review" && (
          <DocsReviewContent payload={payload} />
        )}

        {payload?.type === "drift-report" && (
          <DriftReportContent payload={payload} />
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-3 pb-3">
        <Button
          size="sm"
          className="flex-1 h-7 px-3 text-[11px] font-medium rounded-md bg-foreground text-background hover:bg-foreground/90 border-0"
          onClick={() => onDecision("approve")}
        >
          <CheckCircle2 size={11} />
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-7 px-3 text-[11px] font-medium rounded-md border border-border/60 hover:bg-muted/60"
          onClick={() => onDecision("reject")}
        >
          <XCircle size={11} />
          Reject
        </Button>
      </div>
    </div>
  );
}
