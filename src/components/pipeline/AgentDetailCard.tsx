import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusDot } from "@/components/docs/StatusDot";
import type { AgentDefinition, AgentState } from "@/lib/data/pipeline";
import { FileInput, FileOutput, Cpu, Database, Plug } from "lucide-react";

type AgentDetailCardProps = {
  definition: AgentDefinition;
  state?: AgentState;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const statusMap: Record<string, "healthy" | "warning" | "critical"> = {
  idle: "healthy", running: "warning", success: "healthy", error: "critical",
};

export function AgentDetailCard({ definition, state }: AgentDetailCardProps) {
  const successRate = state ? Math.round((state.runsSuccess / state.runsTotal) * 100) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-foreground">{definition.displayName}</span>
              <code className="text-muted-foreground font-mono text-xs">{definition.name}</code>
              {state && (
                <StatusDot
                  status={statusMap[state.status]}
                  showLabel={true}
                  pulse={state.status === "running"}
                />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <code className="bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 px-1.5 py-0 rounded text-xs font-mono">
                {definition.triggerSkill}
              </code>
              <span className="text-muted-foreground/40 text-xs">triggers this agent</span>
              {definition.mcpServers && definition.mcpServers.map(s => (
                <span key={s} className="inline-flex items-center gap-0.5 bg-indigo-100 text-indigo-700 border border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-500/20 rounded px-1.5 py-0.5 text-[10px] font-mono">
                  <Plug size={8} />
                  {s.replace("-mcp", "")}
                </span>
              ))}
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">{definition.description}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Reads + Writes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <FileInput size={12} className="text-muted-foreground" />
              <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Reads</span>
            </div>
            <ul className="space-y-1">
              {definition.reads.map((r) => (
                <li key={r} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <span className="text-muted-foreground/40 mt-0.5 flex-shrink-0">·</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <FileOutput size={12} className="text-muted-foreground" />
              <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Writes</span>
            </div>
            <ul className="space-y-1">
              {definition.writes.map((w) => (
                <li key={w} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <span className="text-muted-foreground/40 mt-0.5 flex-shrink-0">·</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Capabilities */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Cpu size={12} className="text-muted-foreground" />
            <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Capabilities</span>
          </div>
          <ul className="space-y-1">
            {definition.capabilities.map((c) => (
              <li key={c} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0">✓</span>
                {c}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer: stats + memory */}
        {state && (
          <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <span>{state.runsTotal} runs · <span className="text-emerald-600 dark:text-emerald-400">{successRate}% success</span></span>
              {state.lastRun && <span>Last: {formatDate(state.lastRun)}</span>}
            </div>
            <div className="flex items-center gap-1.5">
              <Database size={11} />
              <code className="font-mono text-xs">{definition.memoryPath}</code>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
