import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { agentRuns } from "@/lib/data/pipeline";

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

export function ActivityFeed() {
  const runs = agentRuns.slice(0, 10);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Recent Agent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {runs.map((run) => (
          <div key={run.id} className="flex items-start gap-3 p-2.5 rounded-md hover:bg-muted transition-colors">
            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
              run.status === "success" ? "bg-emerald-500" : run.status === "failure" ? "bg-red-500" : "bg-amber-500"
            }`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  {run.agent}
                </Badge>
                <code className="text-muted-foreground text-xs font-mono">{run.command}</code>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">{run.summary}</p>
            </div>
            <span className="text-muted-foreground text-xs whitespace-nowrap flex-shrink-0">
              {formatRelative(run.startedAt)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
