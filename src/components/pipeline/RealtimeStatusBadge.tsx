"use client";

interface Props {
  connected: boolean;
  source: 'supabase' | 'local' | 'offline';
}

export function RealtimeStatusBadge({ connected, source }: Props) {
  const label = source === 'supabase' ? 'Supabase Live' : source === 'local' ? 'Local SSE' : 'Offline';
  const color = connected ? (source === 'supabase' ? 'bg-emerald-500' : 'bg-teal-500') : 'bg-muted-foreground';

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`w-1.5 h-1.5 rounded-full ${color} ${connected ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  );
}
