"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SystemGraph3D } from "@/components/graph/SystemGraph3D";
import { RuntimePanel } from "./RuntimePanel";
import {
  SIGNAL_FIGMA_NODES,
  SIGNAL_POSTHOG_NODES,
  DESIGN_SURFACE_NODES,
} from "@/lib/data/system-graph";
import type { InstanceConfig } from "@/lib/state/instance-config";
import type { RuntimeState } from "@/lib/state/runtime-state";

const CANONICAL_SURFACES = ["design-system", "landing", "onboarding"];
const AUTONOMY = ["ghost", "conservative", "balanced", "aggressive"];
const SELF_MODES = ["off", "audit", "active"];

function computeDimSet(cfg: InstanceConfig): Set<string> {
  const dim = new Set<string>();
  if (!cfg.signals?.figma?.enabled) SIGNAL_FIGMA_NODES.forEach((id) => dim.add(id));
  if (!cfg.signals?.posthog?.enabled) SIGNAL_POSTHOG_NODES.forEach((id) => dim.add(id));
  if (!cfg.surfaces?.includes("design-system")) DESIGN_SURFACE_NODES.forEach((id) => dim.add(id));
  return dim;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-2">{title}</div>
      {children}
    </div>
  );
}

function Toggle({ on, onClick, label, warning }: { on: boolean; onClick: () => void; label: string; warning?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full gap-3 py-1.5 border-b border-border/30 last:border-0 group"
    >
      <span className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground/70 group-hover:text-foreground transition-colors">
        {label}
        {warning && <span className="text-amber-500/80">⚠ {warning}</span>}
      </span>
      <span
        className="relative w-7 h-4 rounded-full shrink-0 transition-colors"
        style={{ background: on ? "#059669" : "var(--border)" }}
      >
        <span
          className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
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
            className={`text-[10px] font-mono px-2 py-1 rounded-md border transition-colors ${
              active
                ? "border-foreground/30 bg-foreground/5 text-foreground"
                : "border-border/40 text-muted-foreground/60 hover:text-foreground hover:border-border"
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
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border/30 last:border-0">
      <span className="text-[11px] font-mono text-muted-foreground/70">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(clamp(value - 1))}
          className="w-5 h-5 rounded border border-border/50 text-muted-foreground hover:text-foreground hover:border-border text-[11px] leading-none transition-colors"
        >
          −
        </button>
        <span className="text-[11px] font-mono text-foreground/80 w-10 text-center">tier {value}</span>
        <button
          onClick={() => onChange(clamp(value + 1))}
          className="w-5 h-5 rounded border border-border/50 text-muted-foreground hover:text-foreground hover:border-border text-[11px] leading-none transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

const STORAGE_KEY = "systemix.config";

export function ConfigView({ cfg, runtime, readonlyFs, posthogConfigured }: { cfg: InstanceConfig; runtime: RuntimeState; readonlyFs?: boolean; posthogConfigured?: boolean }) {
  const initialRef = useRef<InstanceConfig>(cfg);
  const [draft, setDraft] = useState<InstanceConfig>(cfg);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runtimeOpen, setRuntimeOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const saved = JSON.parse(stored) as InstanceConfig;
        setDraft(saved);
        initialRef.current = saved;
      }
    } catch {}
  }, []);

  const dimNodeIds = useMemo(() => computeDimSet(draft), [draft]);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initialRef.current), [draft]);

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
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch {}

      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const json = await res.json();

      if (res.status === 501) {
        // Read-only env (Vercel) — localStorage write above is the persistent store
        initialRef.current = draft;
      } else {
        if (!json.ok) throw new Error(json.error || "Save failed");
        initialRef.current = json.config;
        setDraft(json.config);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const signalsOn = Object.values(draft.signals ?? {}).filter((s) => s.enabled).length;

  return (
    <div className="flex-1 flex min-h-0">
      {/* Editable config */}
      <aside className="w-80 shrink-0 border-r border-border/30 overflow-y-auto bg-background flex flex-col">
        <div className="p-4 flex-1">
          {/* Overview */}
          <div className="mb-5 pb-4 border-b border-border/30">
            <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-2">
              Instance
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="surfaces" value={String(draft.surfaces?.length ?? 0)} />
              <Stat label="signals" value={`${signalsOn}/${Object.keys(draft.signals ?? {}).length}`} />
              <Stat label="autonomy" value={draft.hermes?.autonomy ?? "—"} />
            </div>
          </div>

          <Section title="Surfaces">
            <div className="flex flex-col">
              {surfaceOptions.map((s) => (
                <Toggle key={s} label={s} on={draft.surfaces.includes(s)} onClick={() => toggleSurface(s)} />
              ))}
            </div>
          </Section>

          <Section title="Signals">
            <div className="flex flex-col">
              {Object.entries(draft.signals ?? {}).map(([name, sig]) => (
                <Toggle
                  key={name}
                  label={sig.poll_interval_sec ? `${name} · poll ${sig.poll_interval_sec}s` : name}
                  on={!!sig.enabled}
                  onClick={() => toggleSignal(name)}
                  warning={name === "posthog" && posthogConfigured === false ? "key missing" : undefined}
                />
              ))}
            </div>
          </Section>

          <Section title="Hermes autonomy">
            <Segmented
              value={draft.hermes?.autonomy ?? "balanced"}
              options={AUTONOMY}
              onChange={(autonomy) => setDraft((d) => ({ ...d, hermes: { ...d.hermes, autonomy } }))}
            />
          </Section>

          <Section title="Self-improvement">
            <Segmented
              value={draft.self_improvement?.mode ?? "audit"}
              options={SELF_MODES}
              onChange={(mode) => setDraft((d) => ({ ...d, self_improvement: { ...d.self_improvement, mode } }))}
            />
          </Section>

          <Section title="Trust tiers">
            <div className="flex flex-col">
              <Stepper label="orchestrator" value={draft.trust?.orchestrator_tier ?? 0} onChange={(v) => setTier("orchestrator_tier", v)} />
              <Stepper label="hermes" value={draft.trust?.hermes_tier ?? 0} onChange={(v) => setTier("hermes_tier", v)} />
            </div>
          </Section>

          <p className="text-[10px] font-mono text-muted-foreground/40 leading-relaxed">
            {readonlyFs ? (
              <>Changes are saved in this browser. To persist across devices, commit{" "}
              <code className="text-foreground/60">systemix.config.yaml</code>.</>
            ) : (
              <>Toggling a surface or signal dims its nodes in the graph live. Saving writes{" "}
              <code className="text-foreground/60">systemix.config.yaml</code>.</>
            )}
          </p>
        </div>

        {/* Save bar */}
        <div className="sticky bottom-0 p-4 border-t border-border/30 bg-background flex items-center gap-3">
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="text-[11px] font-mono px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:border-border border-border/50 text-foreground"
          >
            {saving ? "saving…" : "Save config"}
          </button>
          {saved && <span className="text-[10px] font-mono text-emerald-600">✓ written</span>}
          {dirty && !saved && <span className="text-[10px] font-mono text-muted-foreground/50">unsaved changes</span>}
          {error && <span className="text-[10px] font-mono text-rose-500">{error}</span>}
        </div>
      </aside>

      {/* 3D topology */}
      <div className="flex-1 relative min-w-0">
        <SystemGraph3D dimNodeIds={dimNodeIds} />
      </div>

      {/* Runtime feed + HITL */}
      {runtimeOpen ? (
        <RuntimePanel
          lastUpdated={runtime.lastUpdated}
          activeRuns={runtime.activeRuns}
          autonomy={draft.hermes?.autonomy ?? "balanced"}
          onCollapse={() => setRuntimeOpen(false)}
        />
      ) : (
        <button
          onClick={() => setRuntimeOpen(true)}
          className="w-7 shrink-0 border-l border-border/30 bg-background flex items-center justify-center hover:bg-muted/40 transition-colors"
          aria-label="Expand runtime panel"
        >
          <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/50 [writing-mode:vertical-rl] rotate-180">
            Runtime
          </span>
        </button>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[13px] font-mono text-foreground/85 leading-none truncate">{value}</span>
      <span className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-wide">{label}</span>
    </div>
  );
}
