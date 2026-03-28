import { AppShell } from "@/components/systemix/AppShell";
import { figmaNodes, figmaNodesMeta, figmaFileName, figmaFileKey } from "@/lib/data/figma-nodes";
import { CheckCircle, ExternalLink } from "lucide-react";

export default function FigmaPage() {
  const inCodebase  = figmaNodes.filter(n => n.inCodebase);
  const notImported = figmaNodes.filter(n => !n.inCodebase);

  return (
    <AppShell>
      {/* Header */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Connected to{" "}
            <a
              href={`https://www.figma.com/design/${figmaFileKey}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:underline inline-flex items-center gap-1"
            >
              {figmaFileName} <ExternalLink size={9} className="opacity-50" />
            </a>
          </p>
        </div>

        <h1 className="text-2xl font-black text-foreground mt-3">Figma</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Design system nodes from the connected Figma file.</p>

        <div className="flex items-center gap-6 mt-4 flex-wrap">
          <div>
            <p className="text-xl font-black text-foreground">{figmaNodesMeta.totalCount}</p>
            <p className="text-xs text-muted-foreground">Total nodes</p>
          </div>
          <div>
            <p className="text-xl font-black text-foreground">{figmaNodesMeta.inCodebaseCount}</p>
            <p className="text-xs text-muted-foreground">In codebase</p>
          </div>
          <div>
            <p className="text-xl font-black text-foreground">{figmaNodesMeta.notImportedCount}</p>
            <p className="text-xs text-muted-foreground">Not imported</p>
          </div>
        </div>
      </section>

      {/* In codebase */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3">In Codebase</h2>
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {inCodebase.map((node) => (
            <div key={node.nodeId} className="flex items-center gap-3 bg-card px-4 py-3">
              <CheckCircle size={12} className="text-muted-foreground/50 flex-shrink-0" />
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-sm text-foreground">{node.name}</span>
                <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
                  {node.category}
                </span>
                {node.type === "component-set" && (
                  <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
                    set
                  </span>
                )}
              </div>
              {node.variants && (
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {node.variants.length} variants
                </span>
              )}
              <code className="text-xs font-mono text-muted-foreground flex-shrink-0 hidden sm:block">
                {node.codePath}
              </code>
              <span className="text-xs text-muted-foreground/50 flex-shrink-0 hidden md:block">
                {new Date(node.lastModified).toLocaleDateString()}
              </span>
              <a href={node.figmaUrl} target="_blank" rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                <ExternalLink size={10} />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Not imported */}
      {notImported.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">Not Imported</h2>
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
            {notImported.map((node) => (
              <div key={node.nodeId} className="flex items-center gap-3 bg-card px-4 py-3">
                <div className="w-3 h-3 rounded-full border-2 border-border flex-shrink-0" />
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-sm text-foreground">{node.name}</span>
                  <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
                    {node.category}
                  </span>
                </div>
                {node.variants && (
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {node.variants.length} variants
                  </span>
                )}
                <span className="text-xs text-muted-foreground flex-shrink-0">Not imported</span>
                <span className="text-xs text-muted-foreground/50 flex-shrink-0 hidden md:block">
                  {new Date(node.lastModified).toLocaleDateString()}
                </span>
                <a href={node.figmaUrl} target="_blank" rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                  <ExternalLink size={10} />
                </a>
              </div>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
