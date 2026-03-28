import { brandsMeta } from "@/lib/data/brands";

export function ThemeReadinessScore() {
  const score = brandsMeta.systemReadinessScore;
  const verdict = score >= 90 ? "Ready" : score >= 70 ? "Partially Ready" : "Needs Refactor";
  const color = score >= 90 ? "#14b8a6" : score >= 70 ? "#f59e0b" : "#ef4444";

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-4">
        System Theme Readiness
      </p>
      <div className="flex items-end gap-4 mb-4">
        <span className="text-5xl font-black text-foreground">{score}</span>
        <span className="text-muted-foreground text-lg mb-1">/100</span>
        <span className="text-sm font-bold mb-1" style={{ color }}>{verdict}</span>
      </div>

      {/* Segmented bar */}
      <div className="flex gap-0.5 h-3 rounded-full overflow-hidden mb-2">
        <div className="bg-emerald-500 rounded-l-full" style={{ width: `${score}%` }} />
        <div className="bg-muted rounded-r-full flex-1" />
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4 text-xs">
        <div>
          <p className="text-muted-foreground mb-0.5">Components using semantic tokens</p>
          <p className="text-foreground font-semibold">38 / 42 <span className="text-emerald-600 dark:text-emerald-400">(90%)</span></p>
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5">Using primitive tokens directly</p>
          <p className="text-foreground font-semibold">3 <span className="text-amber-600 dark:text-amber-400">(partial coverage)</span></p>
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5">Hardcoded values</p>
          <p className="text-foreground font-semibold">1 <span className="text-red-600 dark:text-red-400">(won't be themed)</span></p>
        </div>
      </div>
    </div>
  );
}
