import { Progress } from "@/components/ui/progress";
import { StatusDot } from "@/components/docs/StatusDot";
import { metrics } from "@/lib/data/metrics";

export function SystemStatusCards() {
  const componentHealth = Math.round(
    (metrics.componentsSynced / metrics.componentCount) * 100
  );
  const tokenHealth = Math.round(
    (metrics.tokensSynced / metrics.tokenCount) * 100
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* Figma Connection */}
      <div className="rounded-lg border border-border/60 bg-card px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
          Figma Connection
        </p>
        <StatusDot status={metrics.figmaConnectionStatus} />
        <p className="text-[12px] text-muted-foreground mt-1">Variables API · File access OK</p>
      </div>

      {/* Component Health */}
      <div className="rounded-lg border border-border/60 bg-card px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
          Component Health
        </p>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-2xl font-black tabular-nums text-foreground leading-none">
            {componentHealth}%
          </span>
          <span className="text-[11px] text-muted-foreground">
            {metrics.componentsSynced}/{metrics.componentCount}
          </span>
        </div>
        <Progress value={componentHealth} className="h-[3px] mb-1.5" />
        <div className="flex gap-3 text-[11px] text-muted-foreground">
          <span className="text-emerald-500">{metrics.componentsSynced} synced</span>
          <span className="text-red-500">{metrics.componentsDrifted} drifted</span>
          <span className="text-amber-500">{metrics.componentsStale} stale</span>
        </div>
      </div>

      {/* Token Health */}
      <div className="rounded-lg border border-border/60 bg-card px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
          Token Health
        </p>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-2xl font-black tabular-nums text-foreground leading-none">
            {tokenHealth}%
          </span>
          <span className="text-[11px] text-muted-foreground">
            {metrics.tokensSynced}/{metrics.tokenCount}
          </span>
        </div>
        <Progress value={tokenHealth} className="h-[3px] mb-1.5" />
        <div className="flex gap-3 text-[11px] text-muted-foreground">
          <span className="text-emerald-500">{metrics.tokensSynced} synced</span>
          <span className="text-red-500">{metrics.tokensDrifted} drift</span>
          <span className="text-violet-500">{metrics.tokensNew} new</span>
        </div>
      </div>
    </div>
  );
}
