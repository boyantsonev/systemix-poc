import { AppShell } from "@/components/systemix/AppShell";
import { SectionHeading } from "@/components/docs/SectionHeading";
import { TokenTable } from "@/components/tokens/TokenTable";
import { tokenRegistry } from "@/lib/data/tokens";
import type { AnchorItem } from "@/components/systemix/RightAnchorNav";

const anchorItems: AnchorItem[] = [
  { id: "scale", label: "Type Scale" },
  { id: "tokens", label: "Typography Tokens" },
];

const typeScale = [
  { label: "xs", size: "0.75rem", weight: "400", sample: "Extra small text — captions and labels" },
  { label: "sm", size: "0.875rem", weight: "400", sample: "Small text — secondary content and metadata" },
  { label: "base", size: "1rem", weight: "400", sample: "Base text — body copy and descriptions" },
  { label: "lg", size: "1.125rem", weight: "400", sample: "Large text — emphasized body content" },
  { label: "xl", size: "1.25rem", weight: "600", sample: "Card title and section labels" },
  { label: "2xl", size: "1.5rem", weight: "700", sample: "Page subheadings and panel titles" },
  { label: "3xl", size: "1.875rem", weight: "800", sample: "Section headings" },
  { label: "4xl", size: "2.25rem", weight: "900", sample: "Page hero headings" },
];

const typographyTokens = tokenRegistry.tokens.filter(t => t.collection === "typography");

export default function TypographyPage() {
  return (
    <AppShell anchorItems={anchorItems}>
      <section id="scale">
        <SectionHeading accent="#f59e0b">Type Scale</SectionHeading>
        <div className="space-y-6">
          {typeScale.map(({ label, size, weight, sample }) => (
            <div key={label} className="flex items-baseline gap-6 border-b border-border pb-6">
              <div className="w-20 flex-shrink-0">
                <code className="text-violet-600 dark:text-violet-400 text-xs font-mono">{label}</code>
                <p className="text-muted-foreground text-xs mt-0.5">{size}</p>
                <p className="text-muted-foreground text-xs">w-{weight}</p>
              </div>
              <p
                className="text-foreground"
                style={{ fontSize: size, fontWeight: weight, lineHeight: 1.3 }}
              >
                {sample}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="tokens">
        <SectionHeading accent="#a855f7">Typography Tokens</SectionHeading>
        <TokenTable tokens={typographyTokens} />
      </section>
    </AppShell>
  );
}
