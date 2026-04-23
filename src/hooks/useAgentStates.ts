"use client";
import { useState, useEffect } from 'react';

export interface AgentState {
  name: string;
  status: 'idle' | 'running' | 'error' | 'success';
  lastRun?: string;
  nextScheduled?: string;
  runsTotal: number;
  runsSuccess: number;
}

export function useAgentStates(pollInterval = 5000) {
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch('/api/state/agents');
        if (res.ok) {
          const data = await res.json();
          setAgents(Array.isArray(data) ? data : (data.agents ?? []));
          setError(null);
        }
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    };
    fetchAgents();
    const id = setInterval(fetchAgents, pollInterval);
    return () => clearInterval(id);
  }, [pollInterval]);

  return { agents, loading, error };
}
