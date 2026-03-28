import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { agentRuns } from "@/lib/data/pipeline";

function formatDuration(ms?: number) {
  if (!ms) return "";
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function PipelineActivityLog() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Run History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {agentRuns.map((run) => (
            <div key={run.id} className="flex items-start gap-3 p-2.5 rounded-md hover:bg-muted transition-colors">
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                run.status === "success" ? "bg-emerald-500" : run.status === "failure" ? "bg-red-500" : "bg-amber-500"
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">{run.agent}</Badge>
                  <code className="text-muted-foreground text-xs font-mono">{run.command}</code>
                  <span className="ml-auto text-muted-foreground text-xs">{formatDate(run.startedAt)}</span>
                  {run.durationMs && <span className="text-muted-foreground text-xs">{formatDuration(run.durationMs)}</span>}
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">{run.summary}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
