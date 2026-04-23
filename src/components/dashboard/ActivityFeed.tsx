import { agentRuns } from "@/lib/data/pipeline";

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

const AGENT_COLORS: Record<string, string> = {
  "token-sync": "var(--agent-flux)",
  "design-drift-detector": "var(--agent-scout)",
  "figma-to-code": "var(--agent-ada)",
  "component-themer": "var(--agent-prism)",
  "doc-sync": "var(--agent-echo)",
  "storybook": "var(--agent-sage)",
  "deploy": "var(--agent-ship)",
};

const STATUS_COLORS: Record<string, string> = {
  success: "bg-emerald-500",
  failure: "bg-red-500",
  running: "bg-amber-500",
};

export function ActivityFeed() {
  const runs = agentRuns.slice(0, 10);

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
        Recent Agent Activity
      </p>
      <div className="rounded-lg border border-border/60 bg-card">
        {runs.map((run) => (
          <div
            key={run.id}
            className="flex items-start gap-3 px-4 py-2 border-b border-border/40 last:border-0"
          >
            <span
              className={`size-1.5 rounded-full mt-1.5 shrink-0 ${
                STATUS_COLORS[run.status] ?? "bg-muted-foreground/40"
              }`}
            />
            <div className="flex-1 min-w-0">
              <span
                className="text-[11px] font-mono font-medium"
                style={{ color: AGENT_COLORS[run.agent] ?? "var(--muted-foreground)" }}
              >
                {run.agent}
              </span>
              <code className="text-[11px] text-muted-foreground/60 font-mono ml-2">
                {run.command}
              </code>
              <p className="text-[12px] text-muted-foreground truncate">{run.summary}</p>
            </div>
            <span className="text-[10px] text-muted-foreground/50 tabular-nums ml-auto shrink-0 mt-0.5">
              {formatRelative(run.startedAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
