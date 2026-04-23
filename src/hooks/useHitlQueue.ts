"use client";
import { useState, useEffect, useCallback } from 'react';

export interface HitlTask {
  id: string;
  createdAt: string;
  resolvedAt?: string;
  agent: string;
  type: 'approve' | 'reject' | 'input' | 'review';
  priority: 'critical' | 'high' | 'normal' | 'low';
  title: string;
  description: string;
  payload?: unknown;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  resolution?: { action: string; note?: string; resolvedBy?: string };
}

export function useHitlQueue(pollInterval = 3000, useSupabase = false) {
  const [tasks, setTasks] = useState<HitlTask[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const apiEndpoint =
    useSupabase && typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL
      ? '/api/hitl/supabase'
      : '/api/hitl';

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(apiEndpoint);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks ?? []);
        setPendingCount(data.pendingCount ?? 0);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [apiEndpoint]);

  const resolve = useCallback(async (taskId: string, action: 'approved' | 'rejected' | 'skipped', note?: string) => {
    const res = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, action, resolvedBy: 'dashboard' }),
    });
    if (res.ok) fetchQueue();
    return res.ok;
  }, [apiEndpoint, fetchQueue]);

  useEffect(() => {
    fetchQueue();
    const id = setInterval(fetchQueue, pollInterval);
    return () => clearInterval(id);
  }, [fetchQueue, pollInterval]);

  return { tasks, pendingCount, loading, resolve, refetch: fetchQueue };
}
