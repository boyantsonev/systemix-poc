"use client";

import { useMemo, type ReactNode } from "react";
import { SystemGraph, GraphLegend } from "@/components/graph/SystemGraph";
import type { InstanceConfig } from "@/lib/state/instance-config";

// Which graph nodes belong to which instance dimension. When a dimension is off
// in systemix.config.yaml, its nodes are dimmed in the graph.
const SIGNAL_FIGMA = ["figma-src", "s-figma", "s-sync-figma", "s-tokens"];
const SIGNAL_POSTHOG = ["posthog"];
const DESIGN_SURFACE = [
  "storybook-src", "s-component", "s-storybook", "s-deploy", "s-drift",
  "ada", "flux", "sage", "ship", "scout", "components", "tokens-bridge",
];

function computeDimSet(cfg: InstanceConfig): Set<string> {
  const dim = new Set<string>();
  if (!cfg.signals?.figma?.enabled) SIGNAL_FIGMA.forEach((id) => dim.add(id));
  if (!cfg.signals?.posthog?.enabled) SIGNAL_POSTHOG.forEach((id) => dim.add(id));
  if (!cfg.surfaces?.includes("design-system")) DESIGN_SURFACE.forEach((id) => dim.add(id));
  return dim;
}

function Dot({ on }: { on: boolean }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
      style={{ background: on ? "#059669" : "var(--muted-foreground, #94a3b8)", opacity: on ? 1 : 0.4 }}
    />
  );
}

function Row({ label, value, on }: { label: string; value: string; on?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border/30 last:border-0">
      <span className="text-[11px] font-mono text-muted-foreground/70 flex items-center gap-2">
        {on !== undefined && <Dot on={on} />}
        {label}
      </span>
      <span className="text-[11px] font-mono text-foreground/80">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-1.5">{title}</div>
      {children}
    </div>
  );
}

export function InstanceView({ cfg }: { cfg: InstanceConfig }) {
  const dimNodeIds = useMemo(() => computeDimSet(cfg), [cfg]);
  const signals = cfg.signals || {};

  return (
    <div className="flex-1 flex min-h-0">
      {/* Config summary */}
      <aside className="w-72 shrink-0 border-r border-border/30 overflow-y-auto p-4 bg-background">
        <Section title="Surfaces">
          <div className="flex flex-wrap gap-1.5">
            {(cfg.surfaces || []).map((s) => (
              <span key={s} className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-border/50 text-foreground/70">
                {s}
              </span>
            ))}
            {(cfg.surfaces || []).length === 0 && <span className="text-[11px] font-mono text-muted-foreground/40">none</span>}
          </div>
        </Section>

        <Section title="Signals">
          {Object.entries(signals).map(([name, s]) => (
            <Row
              key={name}
              label={name}
              on={!!s?.enabled}
              value={s?.enabled ? (s.poll_interval_sec ? `poll ${s.poll_interval_sec}s` : "on") : "off"}
            />
          ))}
        </Section>

        <Section title="Hermes">
          <Row label="model" value={cfg.hermes?.model ?? "—"} />
          <Row label="autonomy" value={cfg.hermes?.autonomy ?? "—"} />
          {cfg.hermes?.thresholds && (
            <Row label="thresholds" value={`${cfg.hermes.thresholds.high} / ${cfg.hermes.thresholds.medium}`} />
          )}
        </Section>

        <Section title="Self-improvement">
          <Row label="mode" value={cfg.self_improvement?.mode ?? "—"} on={cfg.self_improvement?.mode !== "off"} />
        </Section>

        <Section title="Trust">
          <Row label="orchestrator" value={`tier ${cfg.trust?.orchestrator_tier ?? "—"}`} />
          <Row label="hermes" value={`tier ${cfg.trust?.hermes_tier ?? "—"}`} />
        </Section>

        <p className="text-[10px] font-mono text-muted-foreground/40 leading-relaxed mt-2">
          Dimmed nodes are surfaces/signals this instance does not use. Edit{" "}
          <code className="text-foreground/60">systemix.config.yaml</code> or run{" "}
          <code className="text-foreground/60">systemix init --reconfigure</code>.
        </p>
      </aside>

      {/* Graph, filtered by config */}
      <div className="flex-1 relative min-w-0">
        <SystemGraph dimNodeIds={dimNodeIds} />
        <div className="absolute bottom-5 left-5 z-10">
          <GraphLegend />
        </div>
      </div>
    </div>
  );
}
