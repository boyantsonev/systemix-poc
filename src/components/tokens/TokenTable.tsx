import { Badge } from "@/components/ui/badge";
import { ColorSwatch } from "./ColorSwatch";
import type { Token } from "@/lib/data/tokens";

const statusConfig = {
  synced: { label: "Synced", cls: "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
  drift:  { label: "Drift",  cls: "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"                 },
  stale:  { label: "Stale",  cls: "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"         },
  new:    { label: "New",    cls: "text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800"     },
};

type TokenTableProps = { tokens: Token[] };

export function TokenTable({ tokens }: TokenTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wider w-8" />
            <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">Token</th>
            <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">Value</th>
            <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wider hidden md:table-cell">Figma Variable</th>
            <th className="text-left py-2.5 text-muted-foreground font-medium text-xs uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tokens.map((token) => {
            const s = statusConfig[token.syncStatus];
            return (
              <tr key={token.name} className="hover:bg-muted/50 transition-colors">
                <td className="py-2.5 pr-4">
                  {token.collection === "color" && <ColorSwatch value={token.value} size="sm" />}
                </td>
                <td className="py-2.5 pr-4">
                  <code className="text-xs font-mono text-foreground">{token.name}</code>
                  {token.description && <p className="text-muted-foreground text-xs mt-0.5">{token.description}</p>}
                </td>
                <td className="py-2.5 pr-4">
                  <code className="text-muted-foreground text-xs font-mono">{token.value}</code>
                </td>
                <td className="py-2.5 pr-4 hidden md:table-cell">
                  <code className="text-muted-foreground text-xs font-mono">{token.figmaVariable}</code>
                </td>
                <td className="py-2.5">
                  <Badge variant="outline" className={`text-xs ${s.cls}`}>{s.label}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
