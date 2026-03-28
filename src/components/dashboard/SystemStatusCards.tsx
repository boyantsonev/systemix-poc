import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusDot } from "@/components/docs/StatusDot";
import { metrics } from "@/lib/data/metrics";

export function SystemStatusCards() {
  const componentHealth = Math.round((metrics.componentsSynced / metrics.componentCount) * 100);
  const tokenHealth = Math.round((metrics.tokensSynced / metrics.tokenCount) * 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Figma Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <StatusDot status={metrics.figmaConnectionStatus} />
          <p className="text-muted-foreground text-xs">Variables API · File access OK</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Component Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-foreground font-semibold">{componentHealth}%</span>
            <span className="text-muted-foreground text-xs">{metrics.componentsSynced}/{metrics.componentCount}</span>
          </div>
          <Progress value={componentHealth} className="h-1" />
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="text-emerald-600 dark:text-emerald-400">{metrics.componentsSynced} synced</span>
            <span className="text-red-600 dark:text-red-400">{metrics.componentsDrifted} drifted</span>
            <span className="text-amber-600 dark:text-amber-400">{metrics.componentsStale} stale</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Token Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-foreground font-semibold">{tokenHealth}%</span>
            <span className="text-muted-foreground text-xs">{metrics.tokensSynced}/{metrics.tokenCount}</span>
          </div>
          <Progress value={tokenHealth} className="h-1" />
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="text-emerald-600 dark:text-emerald-400">{metrics.tokensSynced} synced</span>
            <span className="text-red-600 dark:text-red-400">{metrics.tokensDrifted} drift</span>
            <span className="text-violet-600 dark:text-violet-400">{metrics.tokensNew} new</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
