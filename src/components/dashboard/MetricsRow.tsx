import { Layers, Palette, Globe, AlertTriangle } from "lucide-react";
import { MetricCard } from "@/components/docs/MetricCard";
import { metrics } from "@/lib/data/metrics";

export function MetricsRow() {
  const driftColor = metrics.driftScore < 20 ? "#22c55e" : metrics.driftScore < 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard
        label="Components"
        value={metrics.componentCount}
        sub={`${metrics.componentsSynced} synced · ${metrics.componentsDrifted} drifted`}
        icon={<Layers size={16} />}
      />
      <MetricCard
        label="Tokens"
        value={metrics.tokenCount}
        sub={`${metrics.tokensSynced} synced · ${metrics.tokensDrifted} drift`}
        icon={<Palette size={16} />}
      />
      <MetricCard
        label="Brands"
        value={metrics.brandCount}
        sub={`${metrics.brandsReady} production-ready`}
        icon={<Globe size={16} />}
      />
      <MetricCard
        label="Drift Score"
        value={metrics.driftScore}
        sub={`${metrics.driftInstances} instances`}
        accent={driftColor}
        icon={<AlertTriangle size={16} />}
      />
    </div>
  );
}
