import { MetricCard } from "@/components/docs/MetricCard";
import { componentsMeta } from "@/lib/data/components";
import { tokenRegistry } from "@/lib/data/tokens";
import { AlertTriangle, Zap, Clock, PlusCircle } from "lucide-react";

export function DriftSummaryRow() {
  const driftedTokens = tokenRegistry.tokens.filter(t => t.syncStatus === "drift").length;
  const staleTokens = tokenRegistry.tokens.filter(t => t.syncStatus === "stale").length;
  const newTokens = tokenRegistry.tokens.filter(t => t.syncStatus === "new").length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        label="Drifted Components"
        value={componentsMeta.driftedCount}
        sub="Have hardcoded values"
        accent="#ef4444"
        icon={<AlertTriangle size={20} />}
      />
      <MetricCard
        label="Stale Components"
        value={componentsMeta.staleCount}
        sub="Not synced in 14+ days"
        accent="#f59e0b"
        icon={<Clock size={20} />}
      />
      <MetricCard
        label="Token Drift"
        value={driftedTokens}
        sub={`${staleTokens} stale tokens`}
        accent="#f97316"
        icon={<Zap size={20} />}
      />
      <MetricCard
        label="New in Figma"
        value={newTokens}
        sub="Not yet in codebase"
        accent="#a855f7"
        icon={<PlusCircle size={20} />}
      />
    </div>
  );
}
