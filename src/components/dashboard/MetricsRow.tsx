import { Layers, Palette, Globe, AlertTriangle } from "lucide-react";
import { metrics } from "@/lib/data/metrics";

type MetricCardProps = {
  label: string;
  value: string | number;
  sub?: string;
  delta?: string;
  deltaPositive?: boolean;
  icon?: React.ReactNode;
  accentColor?: string;
};

function MetricCard({ label, value, sub, delta, deltaPositive, icon, accentColor }: MetricCardProps) {
  return (
    <div
      className="rounded-lg border border-border/60 bg-card px-4 py-3"
      style={accentColor ? { borderLeftWidth: "2px", borderLeftColor: accentColor } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-1.5">
            {label}
          </p>
          <p className="text-2xl font-black tabular-nums text-foreground leading-none">
            {value}
          </p>
          {sub && (
            <p className="text-[11px] text-muted-foreground mt-1 truncate">{sub}</p>
          )}
          {delta && (
            <p
              className={`text-[11px] mt-0.5 ${
                deltaPositive ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {delta}
            </p>
          )}
        </div>
        {icon && (
          <div className="text-muted-foreground/40 mt-0.5 shrink-0">{icon}</div>
        )}
      </div>
    </div>
  );
}

export function MetricsRow() {
  const driftColor =
    metrics.driftScore < 20
      ? "#22c55e"
      : metrics.driftScore < 50
      ? "#f59e0b"
      : "#ef4444";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard
        label="Components"
        value={metrics.componentCount}
        sub={`${metrics.componentsSynced} synced · ${metrics.componentsDrifted} drifted`}
        icon={<Layers size={14} />}
      />
      <MetricCard
        label="Tokens"
        value={metrics.tokenCount}
        sub={`${metrics.tokensSynced} synced · ${metrics.tokensDrifted} drift`}
        icon={<Palette size={14} />}
      />
      <MetricCard
        label="Brands"
        value={metrics.brandCount}
        sub={`${metrics.brandsReady} production-ready`}
        icon={<Globe size={14} />}
      />
      <MetricCard
        label="Drift Score"
        value={metrics.driftScore}
        sub={`${metrics.driftInstances} instances`}
        accentColor={driftColor}
        icon={<AlertTriangle size={14} />}
      />
    </div>
  );
}
