"use client";

import { useEffect, useState } from "react";

type Row = {
  artifact: string;
  label: string;
  ghost: "auto" | "propose";
  balanced: "auto" | "propose";
  high: "auto" | "propose";
};

type Instance = {
  currentTier: number;
  matrix: Row[];
  trackRecord: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    deferred: number;
  };
};

const BANDS = ["ghost", "balanced", "high"] as const;

function bandOfTier(tier: number): (typeof BANDS)[number] {
  if (tier <= 0) return "ghost";
  if (tier === 1) return "balanced";
  return "high";
}

function Cell({ value, active }: { value: string; active: boolean }) {
  const auto = value === "auto";
  return (
    <td
      className={`px-3 py-1.5 text-[11px] font-mono ${active ? "bg-muted/40" : ""} ${
        auto ? "text-emerald-500" : "text-muted-foreground/70"
      }`}
    >
      {value}
    </td>
  );
}

// The autonomy dial rendered as a contract clause with a track record: the
// write-access matrix the code actually enforces, plus the receipts from the
// queue archive. Live from /api/instance — matrix and current tier come from
// the same write-policy module the write sites consult, so the surface can
// never disagree with the enforcement.
export function AutonomyClause() {
  const [d, setD] = useState<Instance | null>(null);

  useEffect(() => {
    fetch("/api/instance")
      .then((r) => r.json())
      .then(setD)
      .catch(() => {});
  }, []);

  if (!d?.matrix) return null;
  const band = bandOfTier(d.currentTier);
  const tr = d.trackRecord;

  return (
    <div className="not-prose space-y-4">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-3 py-2 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
                The engine may write
              </th>
              {BANDS.map((b) => (
                <th
                  key={b}
                  className={`px-3 py-2 text-left text-[10px] font-mono uppercase tracking-widest ${
                    b === band ? "text-foreground" : "text-muted-foreground/60"
                  }`}
                >
                  {b}
                  {b === band ? " ·" : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.matrix.map((row) => (
              <tr key={row.artifact} className="border-b border-border/40 last:border-0">
                <td className="px-3 py-1.5 text-[12px] text-muted-foreground">{row.label}</td>
                <Cell value={row.ghost} active={band === "ghost"} />
                <Cell value={row.balanced} active={band === "balanced"} />
                <Cell value={row.high} active={band === "high"} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] font-mono text-muted-foreground">
        <span className="text-muted-foreground/50 uppercase tracking-widest text-[10px]">
          Track record
        </span>
        <span>{tr.total} proposed</span>
        <span className="text-emerald-500">{tr.approved} approved</span>
        <span className="text-red-500">{tr.rejected} rejected</span>
        <span className="text-amber-500">{tr.deferred} deferred</span>
        <span className="text-muted-foreground/60">{tr.pending} pending</span>
      </div>
    </div>
  );
}
