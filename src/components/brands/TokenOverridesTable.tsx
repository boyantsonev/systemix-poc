import { Badge } from "@/components/ui/badge";
import { ColorSwatch } from "@/components/tokens/ColorSwatch";
import type { Brand } from "@/lib/data/brands";

const layerConfig = {
  semantic:  { cls: "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
  primitive: { cls: "text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800"   },
  component: { cls: "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"       },
};

type TokenOverridesTableProps = {
  overrides: Brand["tokenOverrides"];
};

export function TokenOverridesTable({ overrides }: TokenOverridesTableProps) {
  if (overrides.length === 0) {
    return <p className="text-muted-foreground text-sm">No token overrides — this is the base theme.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">Token</th>
            <th className="text-left py-3 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">Original</th>
            <th className="text-left py-3 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">Brand Value</th>
            <th className="text-left py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Layer</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {overrides.map((o) => {
            const isHex = (v: string) => /^#[0-9a-fA-F]{3,8}$/.test(v);
            return (
              <tr key={o.token} className="hover:bg-muted/50 transition-colors">
                <td className="py-3 pr-4">
                  <code className="text-violet-600 dark:text-violet-400 text-xs font-mono">{o.token}</code>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    {isHex(o.originalValue) && <ColorSwatch value={o.originalValue} size="sm" />}
                    <code className="text-muted-foreground text-xs font-mono">{o.originalValue}</code>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    {isHex(o.brandValue) && <ColorSwatch value={o.brandValue} size="sm" />}
                    <code className="text-foreground text-xs font-mono">{o.brandValue}</code>
                  </div>
                </td>
                <td className="py-3">
                  <Badge variant="outline" className={`text-xs ${layerConfig[o.layer].cls}`}>{o.layer}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
