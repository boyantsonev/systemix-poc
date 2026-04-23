"use client";
import { useEffect, useRef, useState, useCallback } from 'react';

export interface StreamEvent {
  id?: string;
  type: string;
  agent?: string;
  timestamp: string;
  data?: Record<string, unknown>;
  runId?: string;
}

interface UseEventStreamOptions {
  enabled?: boolean;
  since?: Date;
  onEvent?: (event: StreamEvent) => void;
}

export function useEventStream({ enabled = true, since, onEvent }: UseEventStreamOptions = {}) {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const stableOnEvent = useCallback((event: StreamEvent) => {
    onEventRef.current?.(event);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const params = since ? `?since=${since.toISOString()}` : '';
    const es = new EventSource(`/api/events/stream${params}`);
    esRef.current = es;

    es.onopen = () => { setConnected(true); setError(null); };
    es.onerror = () => { setConnected(false); setError('Stream disconnected'); };
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as StreamEvent;
        if (event.type === 'connected') { setConnected(true); return; }
        setEvents(prev => [event, ...prev].slice(0, 200)); // keep last 200
        stableOnEvent(event);
      } catch {}
    };

    return () => { es.close(); setConnected(false); };
  }, [enabled, since?.toISOString(), stableOnEvent]);

  return { events, connected, error, clear: () => setEvents([]) };
}
