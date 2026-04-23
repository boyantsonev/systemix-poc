import { StatusDot } from "@/components/docs/StatusDot";
import type { AgentState } from "@/lib/data/pipeline";
import { AGENT_DISPLAY_MAP, getAgentDisplayInfo } from "@/lib/data/pipeline";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// Map agent names to CSS token names
const AGENT_TOKEN: Record<string, string> = {
  "figma-to-code":          "--agent-ada",
  "token-sync":             "--agent-flux",
  "design-drift-detector":  "--agent-scout",
  "component-themer":       "--agent-prism",
  "doc-sync":               "--agent-echo",
  "storybook-agent":        "--agent-sage",
  "deploy-agent":           "--agent-ship",
};

const AGENT_SURFACE_TOKEN: Record<string, string> = {
  "figma-to-code":          "--agent-ada-surface",
  "token-sync":             "--agent-flux-surface",
  "design-drift-detector":  "--agent-scout-surface",
  "component-themer":       "--agent-prism-surface",
  "doc-sync":               "--agent-echo-surface",
  "storybook-agent":        "--agent-sage-surface",
  "deploy-agent":           "--agent-ship-surface",
};

type AgentStatusCardProps = { agent: AgentState };

export function AgentStatusCard({ agent }: AgentStatusCardProps) {
  const successRate = Math.round((agent.runsSuccess / agent.runsTotal) * 100);
  const statusMap: Record<string, "healthy" | "warning" | "critical"> = {
    idle: "healthy", running: "warning", success: "healthy", error: "critical",
  };

  const colorToken = AGENT_TOKEN[agent.name] ?? "--agent-ship";
  const surfaceToken = AGENT_SURFACE_TOKEN[agent.name] ?? "--agent-ship-surface";

  const displayInfo = getAgentDisplayInfo(agent.name);
  const displayName = displayInfo?.displayName ?? agent.name;
  const personaName = Object.keys(AGENT_DISPLAY_MAP).find(
    k => AGENT_DISPLAY_MAP[k].technicalName === agent.name
  ) ?? null;

  function statusBadge() {
    if (agent.status === "running") {
      return (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: `var(${surfaceToken})`,
            color: `var(${colorToken})`,
          }}
        >
          <span className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: `var(${colorToken})` }} />
          running
        </span>
      );
    }
    if (agent.status === "error") {
      return (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: "var(--color-error-surface)",
            color: "var(--color-error)",
          }}
        >
          error
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
        {agent.status}
      </span>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex flex-col min-w-0">
          <p className="text-[12px] font-mono font-semibold" style={{ color: displayInfo?.color ?? `var(${colorToken})` }}>
            {displayName}
          </p>
          {personaName && (
            <p className="text-[10px] text-muted-foreground/50 font-mono">{personaName}</p>
          )}
        </div>
        <StatusDot status={statusMap[agent.status]} showLabel={false} pulse={agent.status === "running"} />
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{agent.description}</p>

      <div className="flex items-center gap-3 mb-1.5">
        {statusBadge()}
        <div className="flex gap-4 text-[11px] tabular-nums">
          <span className="text-muted-foreground/60">
            runs <span className="text-foreground">{agent.runsTotal}</span>
          </span>
          <span className="text-muted-foreground/60">
            ok <span className="text-foreground">{successRate}%</span>
          </span>
        </div>
      </div>

      {agent.lastRun && (
        <p className="text-[10px] text-muted-foreground/50 tabular-nums">
          last <span className="text-muted-foreground">{formatDate(agent.lastRun)}</span>
        </p>
      )}
      {agent.nextScheduled && (
        <p className="text-[10px] text-muted-foreground/50 tabular-nums">
          next <span className="text-muted-foreground">{formatDate(agent.nextScheduled)}</span>
        </p>
      )}
    </div>
  );
}
