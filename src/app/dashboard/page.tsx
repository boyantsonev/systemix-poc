import { AppShell } from "@/components/systemix/AppShell";
import { HeroRow } from "@/components/dashboard/HeroRow";
import { Info } from "lucide-react";

export default function DashboardPage() {
  return (
    <AppShell>
      <HeroRow />
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-border bg-muted/40 text-xs">
        <Info size={12} className="text-muted-foreground/50 flex-shrink-0 mt-0.5" />
        <p className="text-muted-foreground/70 leading-relaxed">
          Showing example data. Run skills in Claude Code — agents write results to{" "}
          <code className="font-mono text-foreground/60">lib/data/</code> and this dashboard updates.
        </p>
      </div>
    </AppShell>
  );
}
