import { metrics } from "@/lib/data/metrics";

export function DriftScoreGauge() {
  const score = metrics.driftScore;
  const maxScore = 100;
  const isLow = score < 20;
  const isMed = score >= 20 && score < 50;
  const color = isLow ? "#14b8a6" : isMed ? "#f59e0b" : "#ef4444";
  const label = isLow ? "Low Drift" : isMed ? "Moderate Drift" : "High Drift";

  // Segmented bar: 5 segments (0-20, 20-40, 40-60, 60-80, 80-100)
  const segments = [20, 40, 60, 80, 100];

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-4">
        Drift Score
      </p>
      <div className="flex items-end gap-4 mb-6">
        <span className="text-6xl font-black" style={{ color }}>{score}</span>
        <span className="text-muted-foreground text-xl mb-2">/100</span>
        <span className="text-sm font-bold mb-2" style={{ color }}>{label}</span>
      </div>

      {/* Segmented bar */}
      <div className="flex gap-1 h-3 mb-2">
        {segments.map((seg, i) => {
          const segStart = i * 20;
          const filled = Math.min(Math.max(score - segStart, 0), 20) / 20;
          const segColor = segStart < 20 ? "#14b8a6" : segStart < 40 ? "#22c55e" : segStart < 60 ? "#f59e0b" : segStart < 80 ? "#f97316" : "#ef4444";

          return (
            <div key={seg} className="flex-1 bg-muted rounded overflow-hidden">
              <div
                className="h-full transition-all"
                style={{ width: `${filled * 100}%`, background: segColor }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-muted-foreground/60 text-xs mb-4">
        <span>0</span>
        <span>20</span>
        <span>40</span>
        <span>60</span>
        <span>80</span>
        <span>100</span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs pt-4 border-t border-border">
        <div>
          <p className="text-muted-foreground mb-0.5">Drift instances</p>
          <p className="text-foreground font-bold text-lg">{metrics.driftInstances}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5">Last audit</p>
          <p className="text-foreground font-semibold">
            {new Date(metrics.lastDriftRun).toLocaleString("en-US", {
              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
