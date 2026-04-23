"use client";
import { useState, useEffect, useCallback, useRef } from 'react';

export interface RealtimeEvent {
  id: string;
  type: string;
  agent?: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

interface UseSupabaseRealtimeOptions {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  projectId?: string;
  pollInterval?: number;
  enabled?: boolean;
}

export function useSupabaseRealtime({
  supabaseUrl,
  supabaseAnonKey,
  projectId,
  pollInterval = 3000,
  enabled = true,
}: UseSupabaseRealtimeOptions) {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const lastSeenRef = useRef<string>(new Date(0).toISOString());

  const fetchNewEvents = useCallback(async () => {
    if (!supabaseUrl || !supabaseAnonKey || !projectId) return;
    try {
      const since = lastSeenRef.current;
      const res = await fetch(
        `${supabaseUrl}/rest/v1/events?project_id=eq.${projectId}&created_at=gt.${since}&order=created_at.asc&limit=50`,
        { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` } }
      );
      if (!res.ok) return;
      const rows = await res.json();
      if (rows.length > 0) {
        const mapped: RealtimeEvent[] = rows.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          type: r.type as string,
          agent: r.agent as string | undefined,
          timestamp: r.created_at as string,
          data: r.data as Record<string, unknown> | undefined,
        }));
        setEvents(prev => [...mapped, ...prev].slice(0, 200));
        lastSeenRef.current = rows[rows.length - 1].created_at;
      }
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, [supabaseUrl, supabaseAnonKey, projectId]);

  useEffect(() => {
    if (!enabled || !supabaseUrl) return;
    fetchNewEvents();
    const id = setInterval(fetchNewEvents, pollInterval);
    return () => clearInterval(id);
  }, [enabled, supabaseUrl, fetchNewEvents, pollInterval]);

  return { events, connected };
}
