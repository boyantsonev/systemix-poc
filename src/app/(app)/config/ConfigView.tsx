"use client";

import { useMemo, useState } from "react";
import { Settings, X, ArrowUpRight } from "lucide-react";
import { SystemGraph3D } from "@/components/graph/SystemGraph3D";
import { NodeCard } from "@/components/graph/NodeCardPanel";
import { HitlQueue } from "@/components/systemix/HitlQueue";
import { SettingsDialog } from "./SettingsDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { tierLabel } from "@/lib/contract/write-policy";
import type { InstanceConfig, SignalStatus } from "@/lib/state/instance-config";
import type { InstanceTopology } from "@/lib/state/instance-topology";
import type { RuntimeState } from "@/lib/state/runtime-state";

const cardCls = "flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm";

// Format an ISO timestamp with plain string ops (no Date()/locale → no hydration mismatch).
function fmt(ts: string | null): string {
  if (!ts) return "—";
  const m = ts.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return m ? `${m[1]} · ${m[2]}` : ts.slice(0, 16);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="truncate text-sm font-medium leading-none text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function ConfigView({
  cfg,
  runtime,
  signals = [],
  topology,
}: {
  cfg: InstanceConfig;
  runtime: RuntimeState;
  signals?: SignalStatus[];
  topology: InstanceTopology;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Inactive nodes (no live data) dim but stay visible; the builder marks active ones.
  const activeSet = useMemo(() => new Set(topology.activeIds), [topology.activeIds]);
  const dimNodeIds = useMemo(
    () => new Set(topology.nodes.filter((n) => !activeSet.has(n.id)).map((n) => n.id)),
    [topology.nodes, activeSet],
  );
  const selectedNode = selectedId ? topology.nodes.find((n) => n.id === selectedId) ?? null : null;

  const autonomy = tierLabel(cfg.trust?.hermes_tier ?? 0);
  const signalsOn = Object.values(cfg.signals ?? {}).filter((s) => s.enabled).length;
  const signalsTotal = Object.keys(cfg.signals ?? {}).length;
  // Enabled in config but not actually wired (e.g. posthog with no key).
  const unwiredSignals = useMemo(
    () => signals.filter((s) => s.enabled && s.wired === false).map((s) => s.id),
    [signals],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
        <span className="text-sm font-medium text-foreground">Instance</span>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {signalsOn}/{signalsTotal} signals · {autonomy}
        </span>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => setSettingsOpen(true)}>
          <Settings className="size-3.5" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </div>

      {/* Bento dashboard */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="grid gap-4 lg:h-full lg:grid-cols-3 lg:grid-rows-[auto_minmax(0,1fr)]">
          {/* Runtime — stats + active runs (top-left) */}
          <div className={cn(cardCls, "gap-5 p-5 lg:col-span-2")}>
            {unwiredSignals.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-2.5">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-500" />
                <p className="text-xs text-muted-foreground">
                  {unwiredSignals.join(", ")} not connected — run{" "}
                  <code className="text-foreground">/connect-signal</code> to gather live evidence.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Last updated" value={fmt(runtime.lastUpdated)} />
              <Stat label="Active runs" value={String(runtime.activeRuns.length)} />
              <Stat label="Autonomy" value={autonomy} />
              <Stat label="Status" value={runtime.activeRuns.length ? "running" : "idle"} />
            </div>
            <div>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Active runs
              </h3>
              {runtime.activeRuns.length === 0 ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  No active runs — the pipeline is idle. Skill and agent runs appear here while they execute.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {runtime.activeRuns.map((r, i) => (
                    <div key={r.id ?? i} className="rounded-lg border p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm text-foreground">
                          {r.skill ?? r.label ?? r.id ?? "run"}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{r.status ?? "running"}</span>
                      </div>
                      {r.startedAt && <span className="text-xs text-muted-foreground">{fmt(r.startedAt)}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Architecture — calm topology preview, expands to the full graph (bottom-left) */}
          <div className={cn(cardCls, "relative h-[340px] lg:col-span-2 lg:row-start-2 lg:h-auto")}>
            <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2.5">
              <div className="flex min-w-0 items-baseline gap-2">
                <span className="text-sm font-medium text-foreground">Architecture</span>
                <span className="truncate text-xs text-muted-foreground">
                  {topology.nodes.length} nodes · {topology.links.length} links
                </span>
              </div>
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setGraphOpen(true)}>
                Expand
                <ArrowUpRight className="size-3.5" />
              </Button>
            </div>
            <div className="relative min-h-0 flex-1">
              <SystemGraph3D
                preview
                nodes={topology.nodes}
                links={topology.links}
                selectedId={null}
                onSelectNode={() => {}}
                dimNodeIds={dimNodeIds}
              />
              <button
                onClick={() => setGraphOpen(true)}
                aria-label="Expand topology"
                className="absolute inset-0 z-10 cursor-zoom-in"
              />
            </div>
          </div>

          {/* Hermes queue (right column, full height) */}
          <div className={cn(cardCls, "h-[460px] lg:col-start-3 lg:row-span-2 lg:h-auto")}>
            <div className="flex shrink-0 items-center border-b px-4 py-2.5">
              <span className="text-sm font-medium text-foreground">Hermes queue</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <HitlQueue className="w-full" hideDemo />
            </div>
          </div>
        </div>
      </div>

      {/* Settings — centered modal */}
      <SettingsDialog cfg={cfg} signals={signals} open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Full topology — modal with the interactive graph + node inspector */}
      <Dialog
        open={graphOpen}
        onOpenChange={(o) => {
          setGraphOpen(o);
          if (!o) setSelectedId(null);
        }}
      >
        <DialogContent className="flex h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
          <DialogHeader className="shrink-0 border-b px-4 py-2.5 text-left">
            <DialogTitle className="text-sm font-medium">Instance topology</DialogTitle>
          </DialogHeader>
          <div className="relative min-h-0 flex-1">
            <SystemGraph3D
              nodes={topology.nodes}
              links={topology.links}
              selectedId={selectedId}
              onSelectNode={setSelectedId}
              dimNodeIds={dimNodeIds}
            />
            {selectedNode && (
              <div className="absolute inset-x-3 bottom-3 z-20 flex max-h-[55%] flex-col overflow-hidden rounded-xl border bg-popover/95 shadow-lg backdrop-blur sm:inset-x-auto sm:right-4 sm:top-4 sm:bottom-auto sm:max-h-[calc(100%-2rem)] sm:w-80">
                <div className="flex h-11 shrink-0 items-center justify-between border-b px-4">
                  <span className="text-sm font-medium text-foreground">Inspector</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => setSelectedId(null)}
                    aria-label="Close inspector"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  <NodeCard node={selectedNode} />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
