import { AppShell } from "@/components/systemix/AppShell";
import { SectionHeading } from "@/components/docs/SectionHeading";
import { TokenTable } from "@/components/tokens/TokenTable";
import { tokenRegistry } from "@/lib/data/tokens";
import type { AnchorItem } from "@/components/systemix/RightAnchorNav";

const anchorItems: AnchorItem[] = [
  { id: "visual", label: "Visual Scale" },
  { id: "tokens", label: "Spacing Tokens" },
];

const spacingTokens = tokenRegistry.tokens.filter(t => t.collection === "spacing");

export default function SpacingPage() {
  return (
    <AppShell anchorItems={anchorItems}>
      <section id="visual">
        <SectionHeading accent="#14b8a6">Spacing Scale</SectionHeading>
        <div className="space-y-3">
          {spacingTokens.map((token) => {
            const px = parseFloat(token.value) * 16;
            const barWidth = Math.min(px, 320);
            return (
              <div key={token.name} className="flex items-center gap-4">
                <div className="w-24 flex-shrink-0 text-right">
                  <code className="text-violet-600 dark:text-violet-400 text-xs font-mono">{token.name.replace("--spacing-", "")}</code>
                </div>
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="h-4 bg-emerald-500 rounded flex-shrink-0"
                    style={{ width: `${barWidth}px` }}
                  />
                  <code className="text-muted-foreground text-xs font-mono">{token.value}</code>
                  <code className="text-muted-foreground/60 text-xs font-mono">{px}px</code>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section id="tokens">
        <SectionHeading accent="#a855f7">Spacing Tokens</SectionHeading>
        <TokenTable tokens={spacingTokens} />
      </section>
    </AppShell>
  );
}
