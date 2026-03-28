type StatusVariant = "Synced" | "Drifted" | "Stale" | "New" | "healthy" | "warning" | "critical" | "connected" | "disconnected" | "syncing";

const variantMap: Record<StatusVariant, { dot: string; text: string; label: string }> = {
  Synced:       { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "Synced"       },
  Drifted:      { dot: "bg-red-500",     text: "text-red-600 dark:text-red-400",         label: "Drifted"      },
  Stale:        { dot: "bg-amber-500",   text: "text-amber-600 dark:text-amber-400",     label: "Stale"        },
  New:          { dot: "bg-violet-500",  text: "text-violet-600 dark:text-violet-400",   label: "New"          },
  healthy:      { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "Healthy"      },
  warning:      { dot: "bg-amber-500",   text: "text-amber-600 dark:text-amber-400",     label: "Warning"      },
  critical:     { dot: "bg-red-500",     text: "text-red-600 dark:text-red-400",         label: "Critical"     },
  connected:    { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "Connected"    },
  disconnected: { dot: "bg-red-500",     text: "text-red-600 dark:text-red-400",         label: "Disconnected" },
  syncing:      { dot: "bg-amber-500",   text: "text-amber-600 dark:text-amber-400",     label: "Syncing"      },
};

type StatusDotProps = {
  status: StatusVariant;
  showLabel?: boolean;
  pulse?: boolean;
};

export function StatusDot({ status, showLabel = true, pulse = false }: StatusDotProps) {
  const config = variantMap[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`relative inline-flex w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot}`}>
        {pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.dot} opacity-75`} />
        )}
      </span>
      {showLabel && <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>}
    </span>
  );
}
