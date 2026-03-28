import { AppShell } from "@/components/systemix/AppShell";
import { SectionHeading } from "@/components/docs/SectionHeading";
import { tokenRegistry } from "@/lib/data/tokens";
import type { AnchorItem } from "@/components/systemix/RightAnchorNav";

const anchorItems: AnchorItem[] = [
  { id: "primitives", label: "Primitive Colors" },
  { id: "semantic", label: "Semantic Colors" },
];

const primitiveColors = [
  { label: "Purple", shades: [
    { name: "400", value: "#c084fc" }, { name: "500", value: "#a855f7" }, { name: "700", value: "#7e22ce" }, { name: "900", value: "#581c87" },
  ]},
  { label: "Teal", shades: [
    { name: "400", value: "#2dd4bf" }, { name: "500", value: "#14b8a6" }, { name: "700", value: "#0f766e" }, { name: "900", value: "#134e4a" },
  ]},
  { label: "Amber", shades: [
    { name: "400", value: "#fbbf24" }, { name: "500", value: "#f59e0b" }, { name: "700", value: "#b45309" }, { name: "900", value: "#78350f" },
  ]},
  { label: "Red", shades: [
    { name: "400", value: "#f87171" }, { name: "500", value: "#ef4444" }, { name: "700", value: "#b91c1c" }, { name: "900", value: "#7f1d1d" },
  ]},
  { label: "Gray", shades: [
    { name: "700", value: "#374151" }, { name: "800", value: "#1f2937" }, { name: "900", value: "#111827" }, { name: "950", value: "#030712" },
  ]},
];

const semanticColors = tokenRegistry.tokens.filter(t => t.collection === "color" && t.name.startsWith("--color-") && !t.name.match(/-(50|100|200|300|400|500|600|700|800|900|950)$/));

export default function ColorsPage() {
  return (
    <AppShell anchorItems={anchorItems}>
      <section id="primitives">
        <SectionHeading accent="#a855f7">Primitive Color Palettes</SectionHeading>
        <div className="space-y-8">
          {primitiveColors.map(({ label, shades }) => (
            <div key={label}>
              <h3 className="text-foreground font-semibold text-sm mb-3">{label}</h3>
              <div className="flex gap-2 flex-wrap">
                {shades.map(({ name, value }) => (
                  <div key={name} className="flex flex-col items-center gap-1">
                    <div
                      className="w-16 h-16 rounded-xl border border-border"
                      style={{ background: value }}
                    />
                    <span className="text-muted-foreground text-xs">{name}</span>
                    <code className="text-muted-foreground/70 text-xs font-mono">{value}</code>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="semantic">
        <SectionHeading accent="#14b8a6">Semantic Color Tokens</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {semanticColors.map((token) => (
            <div key={token.name} className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
              <div
                className="w-10 h-10 rounded-lg border border-border flex-shrink-0"
                style={{ background: token.value.startsWith("var(") ? "var(--muted-foreground)" : token.value }}
              />
              <div className="min-w-0">
                <code className="text-violet-600 dark:text-violet-400 text-xs font-mono block truncate">{token.name}</code>
                <code className="text-muted-foreground text-xs font-mono block truncate">{token.value}</code>
                <code className="text-muted-foreground/50 text-xs font-mono block truncate">{token.figmaVariable}</code>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
