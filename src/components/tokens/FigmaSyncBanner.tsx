import { Info } from "lucide-react";

export function FigmaSyncBanner() {
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-border bg-muted/40 text-xs mb-4">
      <Info size={12} className="text-muted-foreground/50 flex-shrink-0 mt-0.5" />
      <p className="text-muted-foreground/70 leading-relaxed">
        Example output from{" "}
        <code className="font-mono text-foreground/60">/tokens</code>.
        Run the skill against your Figma file to populate this page with your real design tokens.
      </p>
    </div>
  );
}
