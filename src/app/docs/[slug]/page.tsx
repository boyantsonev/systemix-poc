import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Bot,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Code2,
  Layers,
  GitCommit,
  ExternalLink,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/systemix/AppShell";
import { docs } from "@/lib/data/docs";
import type { ComponentDoc, VariableGroupDoc } from "@/lib/data/docs";
import type { AnchorItem } from "@/components/systemix/RightAnchorNav";

// ── Static params ──────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  return docs.map((d) => ({ slug: d.slug }));
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  current: {
    dot: "bg-emerald-500",
    label: "Current",
    labelClass: "text-emerald-400",
  },
  drifted: {
    dot: "bg-red-500",
    label: "Drifted",
    labelClass: "text-red-400",
  },
  draft: {
    dot: "bg-violet-500",
    label: "Draft",
    labelClass: "text-violet-400",
  },
  stale: {
    dot: "bg-amber-500",
    label: "Stale",
    labelClass: "text-amber-400",
  },
} as const;

const SEVERITY_CONFIG = {
  critical: { label: "critical", cls: "text-red-400 bg-red-950/40 border-red-500/30" },
  high:     { label: "high",     cls: "text-orange-400 bg-orange-950/40 border-orange-500/30" },
  medium:   { label: "medium",   cls: "text-amber-400 bg-amber-950/40 border-amber-500/30" },
  low:      { label: "low",      cls: "text-muted-foreground bg-muted/30 border-border" },
} as const;

const TOKEN_STATUS_CONFIG = {
  synced: { dot: "bg-emerald-500", label: "synced", cls: "text-emerald-400" },
  drift:  { dot: "bg-red-500",     label: "drift",  cls: "text-red-400"     },
  stale:  { dot: "bg-amber-500",   label: "stale",  cls: "text-amber-400"   },
} as const;

const SYNC_STATUS_CONFIG = {
  synced: { dot: "bg-emerald-500", label: "synced", cls: "text-emerald-400" },
  drift:  { dot: "bg-red-500",     label: "drift",  cls: "text-red-400"     },
  stale:  { dot: "bg-amber-500",   label: "stale",  cls: "text-amber-400"   },
  new:    { dot: "bg-violet-500",  label: "new",    cls: "text-violet-400"  },
} as const;

function isColorValue(val: string): boolean {
  return val.startsWith("#") || val.startsWith("rgb") || val.startsWith("oklch");
}

function ColorSwatch({ value }: { value: string }) {
  if (!isColorValue(value)) return null;
  return (
    <span
      className="inline-block w-3 h-3 rounded-full border border-border/50 flex-shrink-0 align-middle mr-1"
      style={{ backgroundColor: value }}
    />
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

// ── Top bar ────────────────────────────────────────────────────────────────────

function DocTopBar({ doc }: { doc: ComponentDoc | VariableGroupDoc }) {
  const statusCfg = STATUS_CONFIG[doc.status];

  return (
    <div className="space-y-3">
      {/* Back + status row */}
      <div className="flex items-center gap-3">
        <Link
          href="/docs"
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={10} />
          Component Docs
        </Link>
        <span className="text-border">·</span>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusCfg.dot}`} />
          <span className={`text-[10px] font-medium ${statusCfg.labelClass}`}>
            {statusCfg.label}
          </span>
        </div>
      </div>

      {/* Name */}
      <h1 className="text-lg font-bold text-foreground tracking-tight">{doc.name}</h1>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Bot size={10} />
          <span>Written by {doc.meta.writtenBy}</span>
          <span className="text-border">·</span>
          <span>{formatDate(doc.meta.writtenAt)}</span>
        </div>

        {doc.meta.figmaFileKey && doc.meta.figmaNodeId && (
          <a
            href={`https://figma.com/design/${doc.meta.figmaFileKey}?node-id=${doc.meta.figmaNodeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 transition-colors"
          >
            <ExternalLink size={10} />
            Figma
          </a>
        )}

        {doc.meta.sourceFile && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Code2 size={10} />
            <span className="font-mono">{doc.meta.sourceFile}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Component doc sections ─────────────────────────────────────────────────────

function ComponentDocView({ doc }: { doc: ComponentDoc }) {
  return (
    <>
      {/* 1. Summary */}
      <section id="summary" className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-0.5 h-6 rounded-full bg-violet-500 flex-shrink-0" />
          <h2 className="text-base font-semibold text-foreground">Summary</h2>
        </div>

        {/* Coverage */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Coverage
            </span>
            <span className="text-[10px] font-mono text-violet-400">
              {doc.coverageScore}%
            </span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-1 bg-violet-500 rounded-full"
              style={{ width: `${doc.coverageScore}%` }}
            />
          </div>
        </div>

        <p className="text-sm text-foreground/80 leading-relaxed">{doc.summary}</p>

        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
            {doc.category}
          </span>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
            {doc.storyCount} {doc.storyCount === 1 ? "story" : "stories"}
          </span>
        </div>
      </section>

      {/* 2. Props */}
      <section id="props" className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-0.5 h-6 rounded-full bg-violet-500 flex-shrink-0" />
          <h2 className="text-base font-semibold text-foreground">Props</h2>
        </div>

        <div className="w-full border border-border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_1.5fr_1fr_60px_2fr] bg-muted px-3 py-2 gap-3">
            {["Prop", "Type", "Default", "Req", "Description"].map((h) => (
              <span
                key={h}
                className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold"
              >
                {h}
              </span>
            ))}
          </div>

          {doc.props.map((prop, i) => (
            <div
              key={prop.name}
              className={`grid grid-cols-[1fr_1.5fr_1fr_60px_2fr] px-3 py-2 gap-3 items-start ${
                i > 0 ? "border-t border-border/50" : ""
              }`}
            >
              <span className="font-mono text-xs text-violet-400 break-all">
                {prop.name}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground break-all">
                {prop.type}
              </span>
              <span className="font-mono text-[10px] text-foreground/60 break-all">
                {prop.default ?? "—"}
              </span>
              <span>
                {prop.required ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/30 inline-block" />
                )}
              </span>
              <span className="text-[11px] text-foreground/70 leading-relaxed">
                {prop.description}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Tokens */}
      <section id="tokens" className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-0.5 h-6 rounded-full bg-teal-500 flex-shrink-0" />
          <h2 className="text-base font-semibold text-foreground">Tokens</h2>
        </div>

        <div className="w-full border border-border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1.5fr_1fr_1.2fr_1.5fr_80px] bg-muted px-3 py-2 gap-3">
            {["CSS Variable", "Property", "Current Value", "Figma Variable", "Status"].map((h) => (
              <span
                key={h}
                className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold"
              >
                {h}
              </span>
            ))}
          </div>

          {doc.tokens.map((token, i) => {
            const cfg = TOKEN_STATUS_CONFIG[token.status];
            return (
              <div
                key={token.cssVar}
                className={`grid grid-cols-[1.5fr_1fr_1.2fr_1.5fr_80px] px-3 py-2 gap-3 items-center ${
                  i > 0 ? "border-t border-border/50" : ""
                }`}
              >
                <span className="font-mono text-[11px] text-teal-400 break-all">
                  {token.cssVar}
                </span>
                <span className="text-[10px] text-foreground/70">{token.property}</span>
                <span className="text-[10px] font-mono text-foreground/80 flex items-center">
                  <ColorSwatch value={token.currentValue} />
                  {token.currentValue}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono break-all">
                  {token.figmaVariable}
                </span>
                <div className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                  <span className={`text-[10px] font-medium ${cfg.cls}`}>{cfg.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Drift */}
      <section id="drift" className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-0.5 h-6 rounded-full bg-red-500 flex-shrink-0" />
          <h2 className="text-base font-semibold text-foreground">Drift</h2>
        </div>

        {doc.driftInstances.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3">
            <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
            <span className="text-xs text-emerald-400 font-medium">
              No drift detected
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {doc.driftInstances.map((d, i) => {
              const sevCfg = SEVERITY_CONFIG[d.severity];
              return (
                <div
                  key={i}
                  className="border-l-2 border-red-500 bg-red-950/10 rounded-lg px-3 py-2 space-y-1"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {d.file}:{d.line}
                    </span>
                    <span
                      className={`text-[10px] font-medium border px-1.5 py-0.5 rounded uppercase tracking-wider ${sevCfg.cls}`}
                    >
                      {sevCfg.label}
                    </span>
                    {d.autoFixAvailable && (
                      <span className="text-[10px] font-medium text-violet-400 bg-violet-950/40 border border-violet-500/30 px-1.5 py-0.5 rounded">
                        Auto-fixable
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-mono text-red-400">{d.hardcodedValue}</span>
                    <span className="text-[10px] text-muted-foreground">&rarr;</span>
                    <span className="text-xs font-mono text-teal-400">{d.suggestedToken}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Usage */}
      <section id="usage" className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-0.5 h-6 rounded-full bg-amber-500 flex-shrink-0" />
          <h2 className="text-base font-semibold text-foreground">Usage</h2>
        </div>

        <pre className="bg-black/60 rounded-xl p-4 font-mono text-[11px] text-foreground/90 overflow-x-auto leading-relaxed">
          {doc.usageExample}
        </pre>
      </section>
    </>
  );
}

// ── Variable group doc sections ────────────────────────────────────────────────

function VariableGroupDocView({ doc }: { doc: VariableGroupDoc }) {
  const driftCount = doc.variables.filter((v) => v.syncStatus === "drift").length;

  return (
    <>
      {/* 1. Overview */}
      <section id="overview" className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-0.5 h-6 rounded-full bg-teal-500 flex-shrink-0" />
          <h2 className="text-base font-semibold text-foreground">Overview</h2>
        </div>

        <p className="text-sm text-foreground/80 leading-relaxed">{doc.description}</p>

        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
            {doc.variables.length} variables
          </span>
          {driftCount > 0 && (
            <span className="text-[10px] text-red-400 bg-red-950/30 border border-red-500/20 px-2 py-0.5 rounded font-mono">
              {driftCount} drifted
            </span>
          )}
        </div>
      </section>

      {/* 2. Variables */}
      <section id="variables" className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-0.5 h-6 rounded-full bg-teal-500 flex-shrink-0" />
          <h2 className="text-base font-semibold text-foreground">Variables</h2>
        </div>

        <div className="w-full border border-border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1.5fr_1fr_1.5fr_1.5fr_80px] bg-muted px-3 py-2 gap-3">
            {["Variable", "Value", "Figma Variable", "Used In", "Status"].map((h) => (
              <span
                key={h}
                className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold"
              >
                {h}
              </span>
            ))}
          </div>

          {doc.variables.map((v, i) => {
            const cfg = SYNC_STATUS_CONFIG[v.syncStatus];
            return (
              <div
                key={v.name}
                className={`grid grid-cols-[1.5fr_1fr_1.5fr_1.5fr_80px] px-3 py-2 gap-3 items-start ${
                  i > 0 ? "border-t border-border/50" : ""
                }`}
              >
                <span className="font-mono text-[11px] text-teal-400 break-all">
                  {v.name}
                </span>
                <span className="font-mono text-[11px] text-foreground/80 flex items-center flex-wrap">
                  <ColorSwatch value={v.value} />
                  {v.value}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono break-all">
                  {v.figmaVariable}
                </span>
                <div className="flex flex-wrap gap-1">
                  {v.usedIn.length === 0 ? (
                    <span className="text-[10px] text-muted-foreground/50">—</span>
                  ) : (
                    v.usedIn.map((comp) => (
                      <span
                        key={comp}
                        className="text-[10px] text-violet-400 bg-violet-950/30 border border-violet-500/20 px-1.5 py-0.5 rounded"
                      >
                        {comp}
                      </span>
                    ))
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    <span className={`text-[10px] font-medium ${cfg.cls}`}>{cfg.label}</span>
                  </div>
                  {v.description && (
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      {v.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function DocSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = docs.find((d) => d.slug === slug);
  if (!doc) notFound();

  const anchorItems: AnchorItem[] =
    doc.type === "component"
      ? [
          { id: "summary", label: "Summary" },
          { id: "props",   label: "Props"   },
          { id: "tokens",  label: "Tokens"  },
          { id: "drift",   label: "Drift"   },
          { id: "usage",   label: "Usage"   },
        ]
      : [
          { id: "overview",   label: "Overview"   },
          { id: "variables",  label: "Variables"  },
        ];

  const topBar = <DocTopBar doc={doc} />;

  return (
    <AppShell anchorItems={anchorItems} topBar={topBar}>
      <div className="space-y-12">
        {doc.type === "component" ? (
          <ComponentDocView doc={doc} />
        ) : (
          <VariableGroupDocView doc={doc} />
        )}
      </div>
    </AppShell>
  );
}
