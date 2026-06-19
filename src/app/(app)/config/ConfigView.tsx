"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { Settings, Activity, Network, X } from "lucide-react";
import { SystemGraph3D } from "@/components/graph/SystemGraph3D";
import { NodeCard } from "@/components/graph/NodeCardPanel";
import { RuntimeContent } from "./RuntimePanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  TYPE_COLOR_DARK,
  TYPE_COLOR_LIGHT,
  TYPE_LABEL,
} from "@/lib/data/system-graph";
import { useTheme } from "next-themes";
import type { InstanceConfig } from "@/lib/state/instance-config";
import type { InstanceTopology } from "@/lib/state/instance-topology";
import type { RuntimeState } from "@/lib/state/runtime-state";
import { TIER_LABELS, tierLabel, tierFromLabel } from "@/lib/contract/write-policy";

const CANONICAL_SURFACES = ["design-system", "landing", "onboarding"];
const SELF_MODES = ["off", "audit", "active"];

export function ConfigView({
  cfg,
  runtime,
  unwiredSignals = [],
  topology,
}: {
  cfg: InstanceConfig;
  runtime: RuntimeState;
  unwiredSignals?: string[];
  topology: InstanceTopology;
}) {
  const isMobile = useIsMobile();
  const initialRef = useRef<InstanceConfig>(cfg);
  const [draft, setDraft] = useState<InstanceConfig>(cfg);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [runtimeOpen, setRuntimeOpen] = useState(false); // mobile/tablet runtime sheet
  const [graphOpen, setGraphOpen] = useState(false); // mobile topology sheet
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Inactive nodes (no live data) dim but stay visible; the builder marks active ones.
  const activeSet = useMemo(() => new Set(topology.activeIds), [topology.activeIds]);
  const dimNodeIds = useMemo(
    () => new Set(topology.nodes.filter((n) => !activeSet.has(n.id)).map((n) => n.id)),
    [topology.nodes, activeSet],
  );
  const selectedNode = selectedId ? topology.nodes.find((n) => n.id === selectedId) ?? null : null;
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initialRef.current), [draft]);
  const autonomy = tierLabel(draft.trust?.hermes_tier ?? 0);
  const signalsOn = Object.values(draft.signals ?? {}).filter((s) => s.enabled).length;
  const signalsTotal = Object.keys(draft.signals ?? {}).length;

  const surfaceOptions = useMemo(
    () => Array.from(new Set([...CANONICAL_SURFACES, ...(draft.surfaces ?? [])])),
    [draft.surfaces],
  );
  const toggleSurface = (s: string) =>
    setDraft((d) => ({
      ...d,
      surfaces: d.surfaces.includes(s) ? d.surfaces.filter((x) => x !== s) : [...d.surfaces, s],
    }));
  const toggleSignal = (name: string) =>
    setDraft((d) => ({
      ...d,
      signals: { ...d.signals, [name]: { ...d.signals[name], enabled: !d.signals[name].enabled } },
    }));
  const setTier = (key: "orchestrator_tier" | "hermes_tier", v: number) =>
    setDraft((d) => ({ ...d, trust: { ...d.trust, [key]: v } }));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Save failed");
      initialRef.current = json.config;
      setDraft(json.config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
    setSaving(false);
  }

  const select = (id: string | null) => setSelectedId(id);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
        <span className="text-sm font-medium text-foreground">Instance</span>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {signalsOn}/{signalsTotal} signals · {autonomy}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {isMobile && (
            <Button variant="outline" size="sm" onClick={() => setRuntimeOpen(true)}>
              <Activity className="size-3.5" />
              Runtime
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings className="size-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </Button>
        </div>
      </div>

      {/* Body: resizable rails (md+) — runtime · graph · inspector. Drag the
          handles to resize (min/max bounded); the runtime rail collapses.
          Mobile (<md) uses the summary + sheets below. */}
      {isMobile ? (
        <div className="min-h-0 flex-1">
          <MobileSummary
            topology={topology}
            dimNodeIds={dimNodeIds}
            onSelect={select}
            onViewGraph={() => setGraphOpen(true)}
          />
        </div>
      ) : (
        <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
          <ResizablePanel id="runtime" defaultSize="22%" minSize="15%" maxSize="34%" collapsible collapsedSize="0%">
            <div className="h-full overflow-y-auto">
              <RuntimeContent
                lastUpdated={runtime.lastUpdated}
                activeRuns={runtime.activeRuns}
                autonomy={autonomy}
                unwiredSignals={unwiredSignals}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel id="graph" minSize="30%" className="relative">
            <SystemGraph3D
              nodes={topology.nodes}
              links={topology.links}
              selectedId={selectedId}
              onSelectNode={select}
              dimNodeIds={dimNodeIds}
            />
            {/* Inspector — a floating card over the graph (overlays, doesn't push) */}
            {selectedNode && (
              <div className="absolute right-4 top-4 z-20 flex max-h-[calc(100%-2rem)] w-80 flex-col overflow-hidden rounded-xl border bg-popover/95 shadow-lg backdrop-blur">
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
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      {/* Node inspector — Sheet on mobile only (md+ uses the push panel above) */}
      <Sheet open={!!selectedNode && isMobile} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-sm">
          <SheetHeader>
            <SheetTitle className="sr-only">Node inspector</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">{selectedNode && <NodeCard node={selectedNode} />}</div>
        </SheetContent>
      </Sheet>

      {/* Runtime — Sheet below lg */}
      <Sheet open={runtimeOpen} onOpenChange={setRuntimeOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-sm">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle>Runtime</SheetTitle>
          </SheetHeader>
          <RuntimeContent
            lastUpdated={runtime.lastUpdated}
            activeRuns={runtime.activeRuns}
            autonomy={autonomy}
            unwiredSignals={unwiredSignals}
          />
        </SheetContent>
      </Sheet>

      {/* Mobile topology — full-height Sheet, graph mounts only when open */}
      <Sheet open={graphOpen} onOpenChange={setGraphOpen}>
        <SheetContent side="bottom" className="h-[88vh] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Topology</SheetTitle>
          </SheetHeader>
          <div className="relative h-full w-full">
            {graphOpen && (
              <SystemGraph3D
                nodes={topology.nodes}
                links={topology.links}
                selectedId={selectedId}
                onSelectNode={select}
                dimNodeIds={dimNodeIds}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Instance settings — Sheet */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-sm">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle>Instance settings</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <Section title="Surfaces">
              {surfaceOptions.map((s) => (
                <Toggle key={s} label={s} on={draft.surfaces.includes(s)} onClick={() => toggleSurface(s)} />
              ))}
            </Section>
            <Section title="Signals">
              {Object.entries(draft.signals ?? {}).map(([name, sig]) => (
                <Toggle
                  key={name}
                  label={sig.poll_interval_sec ? `${name} · poll ${sig.poll_interval_sec}s` : name}
                  on={!!sig.enabled}
                  onClick={() => toggleSignal(name)}
                />
              ))}
            </Section>
            <Section title="Autonomy">
              <Segmented
                value={autonomy}
                options={[...TIER_LABELS]}
                onChange={(label) =>
                  setDraft((d) => ({
                    ...d,
                    trust: { ...d.trust, hermes_tier: tierFromLabel(label) },
                    hermes: { ...d.hermes, autonomy: label },
                  }))
                }
              />
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                ghost proposes everything · assisted writes low-risk · autonomous writes most (never goals).
              </p>
            </Section>
            <Section title="Self-improvement">
              <Segmented
                value={draft.self_improvement?.mode ?? "audit"}
                options={SELF_MODES}
                onChange={(mode) => setDraft((d) => ({ ...d, self_improvement: { ...d.self_improvement, mode } }))}
              />
            </Section>
            <Section title="Orchestrator trust">
              <Stepper
                label="orchestrator"
                value={draft.trust?.orchestrator_tier ?? 0}
                onChange={(v) => setTier("orchestrator_tier", v)}
              />
            </Section>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Saving writes <code className=" text-foreground">systemix.config.yaml</code>; the graph
              reflects it on reload.
            </p>
          </div>
          <div className="flex items-center gap-3 border-t p-4">
            <Button onClick={save} disabled={!dirty || saving} size="sm">
              {saving ? "Saving…" : "Save config"}
            </Button>
            {saved && <span className="text-xs text-emerald-600">✓ written</span>}
            {dirty && !saved && <span className="text-xs text-muted-foreground">unsaved changes</span>}
            {error && <span className="text-xs text-rose-500">{error}</span>}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── Mobile summary (the 3D graph is not the mobile hero) ──────────────────────
function MobileSummary({
  topology,
  dimNodeIds,
  onSelect,
  onViewGraph,
}: {
  topology: InstanceTopology;
  dimNodeIds: Set<string>;
  onSelect: (id: string) => void;
  onViewGraph: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const palette = resolvedTheme === "light" ? TYPE_COLOR_LIGHT : TYPE_COLOR_DARK;
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      <Button variant="outline" className="w-full justify-center gap-2" onClick={onViewGraph}>
        <Network className="size-4" />
        View topology
      </Button>
      <Card>
        <CardContent className="flex flex-col gap-1 p-2">
          {topology.nodes.length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground">No topology yet — run the loop to populate it.</p>
          ) : (
            topology.nodes.map((n) => {
              const active = !dimNodeIds.has(n.id);
              return (
                <button
                  key={n.id}
                  onClick={() => onSelect(n.id)}
                  className="flex items-center gap-2.5 rounded-md px-2 py-2 text-left hover:bg-muted"
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: palette[n.type].stroke, opacity: active ? 1 : 0.4 }}
                  />
                  <span className="truncate text-sm text-foreground">{n.label}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {active ? TYPE_LABEL[n.type] : "inactive"}
                  </span>
                </button>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Settings form controls (kept compact; live behind the Settings sheet) ─────
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center justify-between gap-3 border-b py-2 last:border-0"
    >
      <span className="text-sm text-foreground transition-colors group-hover:text-foreground">{label}</span>
      <span
        className="relative h-4 w-7 shrink-0 rounded-full transition-colors"
        style={{ background: on ? "#059669" : "var(--border)" }}
      >
        <span
          className="absolute top-0.5 size-3 rounded-full bg-white transition-all"
          style={{ left: on ? "14px" : "2px" }}
        />
      </span>
    </button>
  );
}

function Segmented({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
              active
                ? "border-foreground/30 bg-accent text-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const clamp = (v: number) => Math.max(0, Math.min(3, v));
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="size-6" onClick={() => onChange(clamp(value - 1))}>
          −
        </Button>
        <span className="w-12 text-center text-sm text-foreground">tier {value}</span>
        <Button variant="outline" size="icon" className="size-6" onClick={() => onChange(clamp(value + 1))}>
          +
        </Button>
      </div>
    </div>
  );
}
