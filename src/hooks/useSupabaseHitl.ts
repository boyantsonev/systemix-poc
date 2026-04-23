"use client";
import { useState, useEffect, useCallback } from 'react';
import type { HitlTask } from './useHitlQueue';

export function useSupabaseHitl(supabaseUrl?: string, supabaseAnonKey?: string) {
  const [tasks, setTasks] = useState<HitlTask[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch initial data via REST
  const fetchTasks = useCallback(async () => {
    if (!supabaseUrl || !supabaseAnonKey) return;
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/hitl_tasks?status=eq.pending&order=created_at.desc`,
        { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
        setPendingCount(data.length);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [supabaseUrl, supabaseAnonKey]);

  // Resolve a task via REST
  const resolve = useCallback(async (taskId: string, action: 'approved' | 'rejected' | 'skipped', note?: string) => {
    if (!supabaseUrl || !supabaseAnonKey) return false;
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/hitl_tasks?id=eq.${taskId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            status: action,
            resolved_at: new Date().toISOString(),
            resolution: { action, note, resolvedBy: 'dashboard' },
          }),
        }
      );
      if (res.ok) {
        // Also call local API to keep local file in sync
        await fetch('/api/hitl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId, action, note }),
        }).catch(() => { /* local sync best-effort */ });
        fetchTasks();
      }
      return res.ok;
    } catch { return false; }
  }, [supabaseUrl, supabaseAnonKey, fetchTasks]);

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) return;
    fetchTasks();

    // Supabase Realtime via SSE (no SDK needed — raw EventSource)
    const realtimeUrl = `${supabaseUrl}/realtime/v1/sse?apikey=${supabaseAnonKey}`;
    // Note: Full Supabase Realtime requires the @supabase/supabase-js SDK for channel subscriptions.
    // For now, poll every 5s as fallback since we can't use raw SSE without the SDK.
    // This is a progressive enhancement — works without Supabase, better with it.
    const interval = setInterval(fetchTasks, 5000);
    setConnected(true);

    return () => {
      clearInterval(interval);
      setConnected(false);
    };
  }, [supabaseUrl, supabaseAnonKey, fetchTasks]);

  return { tasks, pendingCount, connected, loading, resolve, refetch: fetchTasks };
}
