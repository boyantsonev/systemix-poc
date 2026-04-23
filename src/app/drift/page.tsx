"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/systemix/AppShell";
import { DriftScoreGauge } from "@/components/drift/DriftScoreGauge";
import { DriftSummaryRow } from "@/components/drift/DriftSummaryRow";
import { DriftFileTable } from "@/components/drift/DriftFileTable";
import { agentRuns } from "@/lib/data/pipeline";
import type { AnchorItem } from "@/components/systemix/RightAnchorNav";
import { Info } from "lucide-react";

const anchorItems: AnchorItem[] = [
  { id: "score",   label: "Drift Score"    },
  { id: "summary", label: "Summary"        },
  { id: "files",   label: "File Breakdown" },
  { id: "history", label: "Audit History"  },
];

const driftRuns = agentRuns.filter(r => r.agent === "design-drift-detector");

export default function DriftPage() {
  const [driftData, setDriftData] = useState<{ latest: unknown; history: unknown[] } | null>(null);

  useEffect(() => {
    fetch('/api/state/drift')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setDriftData(data); })
      .catch(() => {}); // silent fallback to mock
  }, []);

  void driftData; // available for future use by child components

  return (
    <AppShell anchorItems={anchorItems}>

      <section id="score">
        <h1 className="text-2xl font-black tracking-tight mb-1">Drift Monitor</h1>
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-border bg-muted/40 text-[11px] mb-4">
          <Info size={12} className="text-muted-foreground/50 flex-shrink-0 mt-0.5" />
          <p className="text-muted-foreground/70 leading-relaxed">
            Example output from <code className="font-mono text-foreground/60">/drift-report</code>.
            Run the skill against your codebase to see real data here.
          </p>
        </div>
        <DriftScoreGauge />
      </section>

      <section id="summary">
        <h2 className="text-[13px] font-semibold text-foreground mb-3">Summary</h2>
        <DriftSummaryRow />
      </section>

      <section id="files">
        <h2 className="text-[13px] font-semibold text-foreground mb-3">File Breakdown</h2>
        <div className="rounded-lg border border-border overflow-hidden">
          <DriftFileTable />
        </div>
      </section>

      <section id="history">
        <h2 className="text-[13px] font-semibold text-foreground mb-3">Audit History</h2>
        <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
          {driftRuns.map((run) => (
            <div key={run.id} className="flex items-start gap-3 bg-card px-4 py-3">
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                run.status === "success" ? "bg-foreground/40" : "bg-muted-foreground/30"
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <code className="text-[11px] font-mono text-muted-foreground">{run.command}</code>
                  <span className="text-[11px] font-mono text-muted-foreground/50 ml-auto">
                    {new Date(run.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{run.summary}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

    </AppShell>
  );
}
