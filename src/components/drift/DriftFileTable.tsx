import { components } from "@/lib/data/components";

const severityTokens: Record<string, string> = {
  critical: "var(--color-drifted)",
  high:     "var(--color-drifted)",
  medium:   "var(--color-stale)",
  low:      "var(--color-synced)",
};

export function DriftFileTable() {
  const allDrift = components.flatMap((c) =>
    c.driftInstances.map((d) => ({ ...d, component: c.name, slug: c.slug }))
  );

  if (allDrift.length === 0) {
    return (
      <div className="bg-card px-4 py-8 text-center">
        <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--color-synced)" }}>No drift detected</p>
        <p className="text-[12px] text-muted-foreground">All components are using tokens correctly.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/30">
            <th className="text-left pl-4 py-2 pr-4 text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium">Component</th>
            <th className="text-left py-2 pr-4 text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium">File</th>
            <th className="text-left py-2 pr-4 text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium">Value</th>
            <th className="text-left py-2 pr-4 text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium">Suggested Token</th>
            <th className="text-left py-2 text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium">Severity</th>
          </tr>
        </thead>
        <tbody>
          {allDrift.map((d, i) => {
            const badgeColor = severityTokens[d.severity] ?? "var(--color-stale)";
            return (
              <tr key={i} className="py-2 border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                <td className="pl-4 py-2 pr-4">
                  <span className="text-[11px] text-foreground font-medium">{d.component}</span>
                </td>
                <td className="py-2 pr-4">
                  <code className="text-[11px] font-mono text-muted-foreground">{d.file}:{d.line}</code>
                </td>
                <td className="py-2 pr-4">
                  <code className="text-[11px] font-mono" style={{ color: "var(--color-drifted)" }}>{d.value}</code>
                </td>
                <td className="py-2 pr-4">
                  <code className="text-[11px] font-mono" style={{ color: "var(--color-synced)" }}>{d.suggestedToken}</code>
                </td>
                <td className="py-2">
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border"
                    style={{ color: badgeColor, borderColor: `${badgeColor}40`, background: `${badgeColor}10` }}
                  >
                    <span className="w-1 h-1 rounded-full inline-block" style={{ background: badgeColor }} />
                    {d.severity}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
