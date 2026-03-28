import { Badge } from "@/components/ui/badge";
import { components } from "@/lib/data/components";

const severityConfig = {
  critical: { cls: "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",         dot: "bg-red-500"    },
  high:     { cls: "text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800", dot: "bg-orange-500" },
  medium:   { cls: "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800", dot: "bg-amber-500"  },
  low:      { cls: "text-muted-foreground border-border",                                        dot: "bg-muted-foreground" },
};

export function DriftFileTable() {
  const allDrift = components.flatMap((c) =>
    c.driftInstances.map((d) => ({ ...d, component: c.name, slug: c.slug }))
  );

  if (allDrift.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-emerald-600 dark:text-emerald-400 font-semibold mb-1">No drift detected</p>
        <p className="text-muted-foreground text-sm">All components are using tokens correctly.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">Component</th>
            <th className="text-left py-3 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">File</th>
            <th className="text-left py-3 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">Value</th>
            <th className="text-left py-3 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">Suggested Token</th>
            <th className="text-left py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Severity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {allDrift.map((d, i) => {
            const s = severityConfig[d.severity];
            return (
              <tr key={i} className="hover:bg-muted/50 transition-colors">
                <td className="py-3 pr-4">
                  <span className="text-foreground font-medium text-xs">{d.component}</span>
                </td>
                <td className="py-3 pr-4">
                  <code className="text-muted-foreground text-xs font-mono">{d.file}:{d.line}</code>
                </td>
                <td className="py-3 pr-4">
                  <code className="text-red-600 dark:text-red-400 text-xs font-mono">{d.value}</code>
                </td>
                <td className="py-3 pr-4">
                  <code className="text-emerald-600 dark:text-emerald-400 text-xs font-mono">{d.suggestedToken}</code>
                </td>
                <td className="py-3">
                  <Badge variant="outline" className={`text-xs ${s.cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot} mr-1.5`} />
                    {d.severity}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
