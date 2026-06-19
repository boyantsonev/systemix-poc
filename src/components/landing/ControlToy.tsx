"use client";

import { useState } from "react";
import {
  mayWrite,
  tierFromLabel,
  MATRIX_ARTIFACTS,
  TIER_LABELS,
  type Disposition,
} from "@/lib/contract/write-policy";

type Opt<T extends string> = { key: T; label: string; note?: string };

const DESIGN: readonly Opt<"scaffold" | "existing" | "none">[] = [
  { key: "scaffold", label: "scaffold", note: "fresh code-first design/ substrate" },
  { key: "existing", label: "existing", note: "point at your own design system" },
  { key: "none", label: "none", note: "loop only — no design substrate" },
];

const SELF_IMP: readonly Opt<"off" | "audit" | "tuning" | "auto">[] = [
  { key: "off", label: "off", note: "fixed thresholds, never self-adjusts" },
  { key: "audit", label: "audit", note: "logs Hermes' hit-rate to a meta-contract" },
  { key: "tuning", label: "tuning", note: "proposes threshold changes as HITL cards" },
  { key: "auto", label: "auto", note: "adjusts within preset bounds, logs each change" },
];

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly Opt<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap rounded-lg border border-border/60 bg-card p-0.5 font-mono text-[12px]">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`rounded-md px-3 py-1.5 transition-colors ${
            value === o.key
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ControlToy() {
  const [design, setDesign] = useState<"scaffold" | "existing" | "none">("scaffold");
  const [autonomy, setAutonomy] = useState<"ghost" | "assisted" | "autonomous">("ghost");
  const [selfImp, setSelfImp] = useState<"off" | "audit" | "tuning" | "auto">("audit");

  const activeIdx = tierFromLabel(autonomy); // 0 ghost · 1 assisted · 2 autonomous

  const config = [
    "# systemix.config.yaml",
    "design:",
    `  source: ${design === "scaffold" ? "design" : design === "existing" ? "<your-ds>" : "none"}`,
    `autonomy: ${autonomy}`,
    "self_improvement:",
    `  mode: ${selfImp}`,
  ].join("\n");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* controls + synthesized config */}
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
            Design substrate
          </p>
          <Segmented options={DESIGN} value={design} onChange={setDesign} />
          <p className="text-[12px] text-muted-foreground">{DESIGN.find((d) => d.key === design)?.note}</p>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
            Autonomy dial
          </p>
          <Segmented
            options={TIER_LABELS.map((l) => ({ key: l, label: l }))}
            value={autonomy}
            onChange={setAutonomy}
          />
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
            Self-improvement
          </p>
          <Segmented options={SELF_IMP} value={selfImp} onChange={setSelfImp} />
          <p className="text-[12px] text-muted-foreground">{SELF_IMP.find((s) => s.key === selfImp)?.note}</p>
        </div>

        <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/30 p-4 text-[11.5px] font-mono leading-relaxed text-muted-foreground">
          {config}
        </pre>
      </div>

      {/* the matrix the code actually enforces */}
      <div className="space-y-3">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="px-3 py-2 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
                  The engine may write
                </th>
                {TIER_LABELS.map((b, i) => (
                  <th
                    key={b}
                    className={`px-3 py-2 text-left text-[10px] font-mono uppercase tracking-widest ${
                      i === activeIdx ? "text-foreground" : "text-muted-foreground/50"
                    }`}
                  >
                    {b}
                    {i === activeIdx ? " ·" : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX_ARTIFACTS.map(({ artifact, label }) => {
                const vals: Disposition[] = [
                  mayWrite(0, artifact),
                  mayWrite(1, artifact),
                  mayWrite(2, artifact),
                ];
                return (
                  <tr key={artifact} className="border-b border-border/40 last:border-0">
                    <td className="px-3 py-1.5 text-[12px] text-muted-foreground">{label}</td>
                    {vals.map((val, i) => (
                      <td
                        key={i}
                        className={`px-3 py-1.5 text-[11px] font-mono ${
                          i === activeIdx ? "bg-muted/40" : ""
                        } ${val === "auto" ? "text-emerald-500" : "text-muted-foreground/70"}`}
                      >
                        {val}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Watch the{" "}
          <span className="font-mono text-foreground/80">skills</span>,{" "}
          <span className="font-mono text-foreground/80">guardrails</span>, and{" "}
          <span className="font-mono text-foreground/80">goals</span> rows: they stay{" "}
          <span className="font-mono">propose</span> at every level — even autonomous. The covenant —
          the system never rewrites its own rules or sets its own goals without you.
        </p>
      </div>
    </div>
  );
}
