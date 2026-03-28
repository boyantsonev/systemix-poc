import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/systemix/AppShell";
import { CodeInline } from "@/components/docs/CodeInline";
import { IntegrationStatus } from "@/components/library/IntegrationStatus";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { components } from "@/lib/data/components";
import { agentRuns } from "@/lib/data/pipeline";
import { figmaFileKey } from "@/lib/data/figma-nodes";
import { ExternalLink, GitPullRequest } from "lucide-react";

const driftSeverityColor = {
  critical: "text-red-600 dark:text-red-400",
  high:     "text-orange-600 dark:text-orange-400",
  medium:   "text-amber-600 dark:text-amber-400",
  low:      "text-muted-foreground",
};

const integrationLabel = {
  figma: {
    synced:   { text: "Synced",   cls: "text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800" },
    drifted:  { text: "Drifted",  cls: "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"     },
    unlinked: { text: "Unlinked", cls: "text-muted-foreground border-border"                                           },
  },
  storybook: {
    synced:  { text: "Synced",  cls: "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
    drifted: { text: "Drifted", cls: "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"         },
    missing: { text: "Missing", cls: "text-muted-foreground border-border"                                               },
  },
  github: {
    clean:      { text: "Clean",     cls: "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"          },
    "pr-open":  { text: "PR Open",   cls: "text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800" },
    "pr-merged":{ text: "PR Merged", cls: "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
  },
};

export async function generateStaticParams() {
  return components.map((c) => ({ slug: c.slug }));
}

export default async function ComponentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const component = components.find((c) => c.slug === slug);
  if (!component) notFound();

  // Grab 3 agent runs for this component (just use the most recent ones)
  const recentRuns = agentRuns.slice(0, 3);

  const figmaUrl = component.figmaNodeId
    ? `https://www.figma.com/design/${figmaFileKey}/Design-System-v2-1?node-id=${encodeURIComponent(component.figmaNodeId)}`
    : null;
  const storybookUrl = component.storybookId
    ? `http://localhost:6006/?path=/story/${component.storybookId}`
    : null;
  const githubUrl = `https://github.com/acme/design-system/blob/main/${component.githubPath}`;

  const driftCount = component.driftInstances.length;

  return (
    <AppShell>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground -mb-8">
        <Link href="/components" className="hover:text-foreground transition-colors">Components</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{component.name}</span>
      </div>

      {/* Hero */}
      <section>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black text-foreground mb-1">{component.name}</h1>
            <p className="text-muted-foreground text-sm capitalize">{component.category}</p>
          </div>
          <IntegrationStatus integrations={component.integrations} size="md" />
        </div>
        <p className="text-muted-foreground leading-relaxed mb-6">{component.description}</p>

        {/* Two-panel hero: Figma + Storybook */}
        <div className="grid grid-cols-2 gap-4">
          {/* Figma panel */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Figma</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      component.integrations.figma === "synced" ? "bg-violet-500" :
                      component.integrations.figma === "drifted" ? "bg-amber-500" : "bg-slate-400"
                    }`}
                    title={`Figma: ${component.integrations.figma}`}
                  />
                </div>
                {figmaUrl && (
                  <a
                    href={figmaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Open <ExternalLink size={10} />
                  </a>
                )}
              </div>
              <div className="h-28 bg-muted rounded-md border border-border flex flex-col items-center justify-center gap-1">
                <span className="text-muted-foreground/60 text-xs font-mono">{component.name}</span>
                {component.figmaNodeId && (
                  <span className="text-muted-foreground/40 text-[10px] font-mono">node {component.figmaNodeId}</span>
                )}
              </div>
              {component.integrations.figma === "drifted" && (
                <p className="text-amber-600 dark:text-amber-400 text-xs mt-2">
                  {driftCount} drift instance{driftCount !== 1 ? "s" : ""} detected
                </p>
              )}
            </CardContent>
          </Card>

          {/* Storybook panel */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Storybook</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      component.integrations.storybook === "synced" ? "bg-emerald-500" :
                      component.integrations.storybook === "drifted" ? "bg-amber-500" : "bg-slate-400"
                    }`}
                    title={`Storybook: ${component.integrations.storybook}`}
                  />
                </div>
                {storybookUrl && (
                  <a
                    href={storybookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Open <ExternalLink size={10} />
                  </a>
                )}
              </div>
              <div className="h-28 bg-muted rounded-md border border-border flex flex-col items-center justify-center gap-2">
                {component.integrations.storybook === "missing" ? (
                  <span className="text-muted-foreground/60 text-xs">No stories yet</span>
                ) : (
                  <>
                    <span className="text-muted-foreground/60 text-xs font-mono">{component.name} stories</span>
                    <div className="flex flex-wrap gap-1 justify-center px-2">
                      {component.variants.slice(0, 4).map((v) => (
                        <span key={v} className="text-[9px] font-mono bg-background text-muted-foreground border border-border rounded px-1 py-0.5">
                          {v}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {component.storybookId && (
                <p className="text-muted-foreground/60 text-[10px] font-mono mt-2 truncate">{component.storybookId}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Integration status strip */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <Badge variant="outline" className={`text-xs ${integrationLabel.figma[component.integrations.figma].cls}`}>
            Figma · {integrationLabel.figma[component.integrations.figma].text}
          </Badge>
          <Badge variant="outline" className={`text-xs ${integrationLabel.storybook[component.integrations.storybook].cls}`}>
            Storybook · {integrationLabel.storybook[component.integrations.storybook].text}
          </Badge>
          <Badge variant="outline" className={`text-xs ${integrationLabel.github[component.integrations.github].cls}`}>
            GitHub · {integrationLabel.github[component.integrations.github].text}
          </Badge>
        </div>
      </section>

      {/* Tabs */}
      <section>
        <Tabs defaultValue="props">
          <TabsList className="mb-4">
            <TabsTrigger value="props">Props</TabsTrigger>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
            <TabsTrigger value="drift">
              Drift {driftCount > 0 && <span className="ml-1 text-amber-500">({driftCount})</span>}
            </TabsTrigger>
            <TabsTrigger value="github">GitHub</TabsTrigger>
            <TabsTrigger value="history">Agent History</TabsTrigger>
          </TabsList>

          {/* Props */}
          <TabsContent value="props">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">Default</TableHead>
                  <TableHead className="text-muted-foreground">Required</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {component.props.map((prop) => (
                  <TableRow key={prop.name}>
                    <TableCell><CodeInline color="text-emerald-600 dark:text-emerald-400">{prop.name}</CodeInline></TableCell>
                    <TableCell><CodeInline>{prop.type}</CodeInline></TableCell>
                    <TableCell><CodeInline>{prop.default ?? "—"}</CodeInline></TableCell>
                    <TableCell>
                      {prop.required
                        ? <Badge variant="outline" className="text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800 text-xs">required</Badge>
                        : <span className="text-muted-foreground text-xs">optional</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Tokens */}
          <TabsContent value="tokens">
            <div className="space-y-2">
              {component.tokenMappings.map(({ token, property }) => (
                <div key={token} className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
                  <CodeInline color="text-violet-600 dark:text-violet-400">{token}</CodeInline>
                  <span className="text-muted-foreground/60">→</span>
                  <span className="text-muted-foreground text-xs">{property}</span>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Drift */}
          <TabsContent value="drift">
            {driftCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mb-3">
                  <span className="text-emerald-600 dark:text-emerald-400 text-sm">✓</span>
                </div>
                <p className="text-foreground font-medium text-sm">No drift detected</p>
                <p className="text-muted-foreground text-xs mt-1">All values use design tokens correctly.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {component.driftInstances.map((d, i) => (
                  <Card key={i} className="border-red-200 dark:border-red-900">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold uppercase ${driftSeverityColor[d.severity]}`}>
                          {d.severity}
                        </span>
                        <code className="text-muted-foreground text-xs font-mono">{d.file}:{d.line}</code>
                      </div>
                      <p className="text-foreground text-sm">
                        <CodeInline color="text-red-600 dark:text-red-400">{d.value}</CodeInline>
                        <span className="text-muted-foreground/60 mx-2">→ should use</span>
                        <CodeInline color="text-emerald-600 dark:text-emerald-400">{d.suggestedToken}</CodeInline>
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* GitHub */}
          <TabsContent value="github">
            <div className="space-y-4">
              {component.openPR && (
                <Card className="border-violet-200 dark:border-violet-900">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <GitPullRequest size={14} className="text-violet-500" />
                          <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">Open PR #{component.openPR.number}</span>
                          {component.openPR.skill && (
                            <Badge variant="outline" className="text-xs font-mono text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800">
                              {component.openPR.skill}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-foreground">{component.openPR.title}</p>
                      </div>
                      <a
                        href={`https://github.com/acme/design-system/pull/${component.openPR.number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                      >
                        View PR <ExternalLink size={10} />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )}

              {component.githubLastCommit && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Last Commit</p>
                  <div className="bg-card border border-border rounded-lg p-3 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm text-foreground">{component.githubLastCommit.message}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <code className="font-mono">{component.githubLastCommit.sha}</code>
                        <span>·</span>
                        <span>{component.githubLastCommit.author}</span>
                        <span>·</span>
                        <span>{new Date(component.githubLastCommit.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <a
                      href={`https://github.com/acme/design-system/commit/${component.githubLastCommit.sha}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                    >
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              )}

              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink size={11} />
                View {component.githubPath} on GitHub
              </a>
            </div>
          </TabsContent>

          {/* Agent History */}
          <TabsContent value="history">
            <div className="space-y-3">
              {recentRuns.map((run) => (
                <div key={run.id} className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          run.status === "success" ? "bg-emerald-500" :
                          run.status === "failure" ? "bg-red-500" : "bg-amber-500"
                        }`}
                      />
                      <code className="text-xs font-mono text-foreground">{run.command}</code>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {new Date(run.startedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{run.summary}</p>
                  {run.filesChanged !== undefined && (
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{run.filesChanged} files changed</p>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </section>

      {/* Agent actions */}
      <section>
        <div className="flex items-center gap-2 flex-wrap">
          <button disabled className="text-xs px-3 py-1.5 rounded border border-border bg-card text-muted-foreground cursor-not-allowed opacity-60">
            Verify with Sage
          </button>
          <button disabled className="text-xs px-3 py-1.5 rounded border border-violet-300 dark:border-violet-800 bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 cursor-not-allowed opacity-60">
            Fix with Ada
          </button>
          <button disabled className="text-xs px-3 py-1.5 rounded border border-border bg-card text-muted-foreground cursor-not-allowed opacity-60">
            Sync to Figma
          </button>
          {component.openPR && (
            <a
              href={`https://github.com/acme/design-system/pull/${component.openPR.number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center gap-1"
            >
              <GitPullRequest size={11} />
              View PR #{component.openPR.number}
            </a>
          )}
        </div>
      </section>
    </AppShell>
  );
}
