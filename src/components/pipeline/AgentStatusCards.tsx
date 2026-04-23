"use client";

import { useAgentStates } from "@/hooks/useAgentStates";
import { AgentStatusCard } from "@/components/pipeline/AgentStatusCard";
import { agentStates } from "@/lib/data/pipeline";
import type { AgentState } from "@/lib/data/pipeline";

export function AgentStatusCards() {
  const { agents: liveAgents, loading } = useAgentStates();

  // Map live agents to the mock shape, falling back to mock metadata for
  // displayName and description (which the API does not return).
  const mergedAgents: AgentState[] =
    liveAgents.length > 0
      ? liveAgents.map((live) => {
          const mock = agentStates.find((m) => m.name === live.name);
          return {
            name: live.name,
            displayName: mock?.displayName ?? live.name,
            status: live.status,
            lastRun: live.lastRun,
            nextScheduled: live.nextScheduled,
            runsTotal: live.runsTotal,
            runsSuccess: live.runsSuccess,
            description: mock?.description ?? "",
          };
        })
      : agentStates;

  if (loading && liveAgents.length === 0) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {agentStates.map((agent) => (
          <AgentStatusCard key={agent.name} agent={agent} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
      {mergedAgents.map((agent) => (
        <AgentStatusCard key={agent.name} agent={agent} />
      ))}
    </div>
  );
}
