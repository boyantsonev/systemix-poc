import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusDot } from "@/components/docs/StatusDot";
import type { AgentState } from "@/lib/data/pipeline";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

type AgentStatusCardProps = { agent: AgentState };

export function AgentStatusCard({ agent }: AgentStatusCardProps) {
  const successRate = Math.round((agent.runsSuccess / agent.runsTotal) * 100);
  const statusMap: Record<string, "healthy" | "warning" | "critical"> = {
    idle: "healthy", running: "warning", success: "healthy", error: "critical",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-semibold text-foreground">{agent.displayName}</CardTitle>
              <code className="text-[10px] font-mono text-muted-foreground/60">{agent.name}</code>
            </div>
          </div>
          <StatusDot status={statusMap[agent.status]} showLabel={false} pulse={agent.status === "running"} />
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">{agent.description}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Runs</span>
            <span className="text-foreground ml-1.5 font-medium">{agent.runsTotal}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Success</span>
            <span className="text-emerald-600 dark:text-emerald-400 ml-1.5 font-medium">{successRate}%</span>
          </div>
        </div>
        {agent.lastRun && (
          <p className="text-muted-foreground text-xs">
            Last run: <span className="text-foreground">{formatDate(agent.lastRun)}</span>
          </p>
        )}
        {agent.nextScheduled && (
          <p className="text-muted-foreground text-xs">
            Next: <span className="text-foreground">{formatDate(agent.nextScheduled)}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
