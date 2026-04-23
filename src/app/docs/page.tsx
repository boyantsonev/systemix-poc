import Link from "next/link";
import { Bot, FileText, Layers, AlertTriangle, GitCommit, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/systemix/AppShell";
import { SectionHeading } from "@/components/docs/SectionHeading";
import { WorkflowBeam } from "@/components/docs/WorkflowBeam";
import { docs, docsMeta, type ComponentDoc, type VariableGroupDoc } from "@/lib/data/docs";

const anchorItems = [
  { id: "overview", label: "Overview" },
  { id: "components", label: "Components" },
  { id: "variables", label: "Variables" },
];

const docStatusDot: Record<string, string> = {
  current:  "bg-emerald-500",
  drifted:  "bg-red-500",
  stale:    "bg-amber-500",
  draft:    "bg-violet-500",
};

const docStatusText: Record<string, string> = {
  current:  "text-emerald-400",
  drifted:  "text-red-400",
  stale:    "text-amber-400",
  draft:    "text-violet-400",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours   = Math.floor(diff / 3_600_000);
  const days    = Math.floor(diff / 86_400_000);
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24)   return `${hours}h ago`;
  return `${days}d ago`;
}

const componentDocs  = docs.filter((d): d is ComponentDoc      => d.type === "component");
const variableGroups = docs.filter((d): d is VariableGroupDoc  => d.type === "variable-group");

export default function DocsPage() {
  return (
    <AppShell anchorItems={anchorItems}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section id="overview" className="space-y-6 pb-2">

        {/* Context banner */}
        <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 mb-6">
          <p className="text-[12px] font-medium text-foreground mb-0.5">Agent-generated component docs</p>
          <p className="text-[11px] text-muted-foreground">
            This section is written by the <code className="font-mono text-[10px] bg-muted px-1 py-0.5 rounded">Echo</code> agent when you run{" "}
            <code className="font-mono text-[10px] bg-muted px-1 py-0.5 rounded">/sync-docs</code>.{" "}
            Content updates automatically as your design system evolves.
          </p>
        </div>

        {/* Title + description */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground tracking-tight">Component Docs</h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-[520px]">
            A closed-loop agentic pipeline — Claude agents generate components from Figma designs,
            sync tokens back, and keep documentation up to date automatically.
          </p>
        </div>

        {/* Beam diagram */}
        <WorkflowBeam />

        {/* Inline metrics strip */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground border-t border-border pt-4">
          <span className="flex items-center gap-1.5">
            <FileText size={11} className="opacity-60" />
            <span className="font-semibold text-foreground">{docsMeta.componentDocs}</span> components
          </span>
          <span className="flex items-center gap-1.5">
            <Layers size={11} className="opacity-60" />
            <span className="font-semibold text-foreground">{docsMeta.variableGroupDocs}</span> variable groups
          </span>
          {docsMeta.driftedDocs > 0 && (
            <span className="flex items-center gap-1.5 text-red-400">
              <AlertTriangle size={11} />
              <span className="font-semibold">{docsMeta.driftedDocs}</span> drifted
            </span>
          )}
          <span className="flex items-center gap-1.5 ml-auto">
            <GitCommit size={11} className="opacity-60" />
            Updated {relativeTime(docsMeta.lastUpdated)}
          </span>
        </div>

        {/* Agent contract note */}
        <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-2">
          <Bot size={11} className="text-teal-400 mt-0.5 flex-shrink-0" />
          Agents write directly to{" "}
          <code className="font-mono bg-muted px-1 py-0.5 rounded text-[10px] text-foreground mx-0.5">
            lib/data/docs.ts
          </code>
          — run{" "}
          <code className="font-mono bg-muted px-1 py-0.5 rounded text-[10px] text-foreground mx-0.5">
            /sync-docs
          </code>
          to refresh.
        </p>
      </section>

      {/* ── Components ────────────────────────────────────────────────────── */}
      <section id="components" className="space-y-3">
        <SectionHeading accent="#a855f7">Components</SectionHeading>
        <p className="text-muted-foreground text-xs -mt-6 mb-2">
          {docsMeta.componentDocs} documented &middot; {docsMeta.driftedDocs} drifted &middot; {docsMeta.draftDocs} draft
        </p>

        <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {componentDocs.map((doc) => (
            <Link
              key={doc.slug}
              href={`/docs/${doc.slug}`}
              className="flex items-center gap-4 bg-card px-5 py-3.5 hover:bg-muted/30 transition-colors group"
            >
              <span className={`inline-flex w-1.5 h-1.5 rounded-full flex-shrink-0 ${docStatusDot[doc.status]}`} />

              <div className="flex items-center gap-2 min-w-0 w-40 flex-shrink-0">
                <span className="text-sm font-semibold text-foreground truncate">{doc.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground whitespace-nowrap">
                  {doc.category}
                </span>
              </div>

              <p className="flex-1 text-xs text-muted-foreground truncate min-w-0">
                {doc.summary}
              </p>

              <div className="flex items-center gap-3 flex-shrink-0">
                {doc.driftInstances.length > 0 && (
                  <span className="text-[10px] font-medium text-red-400">
                    {doc.driftInstances.length} drift
                  </span>
                )}
                <div className="text-right hidden sm:block">
                  <p className={`text-[10px] font-mono ${docStatusText[doc.status]}`}>
                    {doc.coverageScore}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {relativeTime(doc.meta.writtenAt)}
                  </p>
                </div>
                <ChevronRight size={12} className="text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Variable Groups ───────────────────────────────────────────────── */}
      <section id="variables" className="space-y-3">
        <SectionHeading accent="#14b8a6">Variables</SectionHeading>

        <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {variableGroups.map((doc) => (
            <Link
              key={doc.slug}
              href={`/docs/${doc.slug}`}
              className="flex items-center gap-4 bg-card px-5 py-3.5 hover:bg-muted/30 transition-colors group"
            >
              <span className={`inline-flex w-1.5 h-1.5 rounded-full flex-shrink-0 ${docStatusDot[doc.status]}`} />

              <div className="flex items-center gap-2 min-w-0 w-40 flex-shrink-0">
                <span className="text-sm font-semibold text-foreground truncate">{doc.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground whitespace-nowrap">
                  {doc.variables.length} vars
                </span>
              </div>

              <p className="flex-1 text-xs text-muted-foreground truncate min-w-0">
                {doc.description}
              </p>

              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <p className={`text-[10px] font-mono ${docStatusText[doc.status]}`}>
                    {doc.status}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {relativeTime(doc.meta.writtenAt)}
                  </p>
                </div>
                <ChevronRight size={12} className="text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </section>

    </AppShell>
  );
}
