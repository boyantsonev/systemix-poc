"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TIER_LABELS, tierLabel, tierFromLabel } from "@/lib/contract/write-policy";
import type { InstanceConfig, SignalStatus } from "@/lib/state/instance-config";

const CANONICAL_SURFACES = ["design-system", "landing", "onboarding"];
const SELF_MODES = ["off", "audit", "active"];

// The instance settings, as a centered modal. The save path is unchanged — POST
// /api/config → applyConfigPatch → writes systemix.config.yaml — plus a
// router.refresh() so the topology reflects it.
export function SettingsDialog({
  cfg,
  signals = [],
  open,
  onOpenChange,
}: {
  cfg: InstanceConfig;
  signals?: SignalStatus[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<InstanceConfig>(cfg);
  const initialRef = useRef<InstanceConfig>(cfg);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(cfg);
      initialRef.current = cfg;
      setSaved(false);
      setError(null);
    }
  }, [open, cfg]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(initialRef.current),
    [draft],
  );
  const autonomy = tierLabel(draft.trust?.hermes_tier ?? 0);
  const orchestratorTier = draft.trust?.orchestrator_tier ?? 0;
  const surfaceOptions = useMemo(
    () => Array.from(new Set([...CANONICAL_SURFACES, ...(draft.surfaces ?? [])])),
    [draft.surfaces],
  );
  // Wiring is only knowable for posthog (NEXT_PUBLIC_POSTHOG_KEY); others are null.
  const wiredById = useMemo(
    () => Object.fromEntries(signals.map((s) => [s.id, s.wired])),
    [signals],
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
  const setOrchestratorTier = (v: number) =>
    setDraft((d) => ({ ...d, trust: { ...d.trust, orchestrator_tier: Math.max(0, Math.min(3, v)) } }));

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
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Instance settings</DialogTitle>
          <DialogDescription>
            Saving writes <code className="font-mono text-foreground">systemix.config.yaml</code> and
            refreshes the topology.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-x-8 gap-y-6 py-1 sm:grid-cols-2">
          {/* Signals — the richest section: what the loop measures + how to connect */}
          <Group title="Signals" className="sm:col-span-2">
            <p className="-mt-1 mb-3 text-xs leading-relaxed text-muted-foreground">
              The sources your loop reads evidence from. Flip one on, then connect it in Claude Code —
              today <span className="text-foreground">PostHog</span> is the live adapter.
            </p>
            <div className="flex flex-col divide-y divide-border/60 rounded-lg border">
              {Object.entries(draft.signals ?? {}).map(([name, sig]) => {
                const enabled = !!sig.enabled;
                const wired = wiredById[name]; // true | false | null | undefined
                return (
                  <div key={name} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 text-sm">
                      <span className="text-foreground">{name}</span>
                      {sig.poll_interval_sec ? (
                        <span className="text-muted-foreground"> · poll {sig.poll_interval_sec}s</span>
                      ) : null}
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                      {enabled && wired === true && (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-500">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          connected
                        </span>
                      )}
                      {enabled && wired === false && (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-500">
                          <span className="size-1.5 rounded-full bg-amber-500" />
                          not connected
                        </span>
                      )}
                      <Switch checked={enabled} onCheckedChange={() => toggleSignal(name)} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Connect — leads to Claude Code (credentials never touch the web UI) */}
            <div className="mt-3 flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <code className="font-mono text-[13px] text-foreground">/connect-signal</code>
                <CopyButton text="/connect-signal" />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Connecting needs credentials, so it runs in{" "}
                <span className="text-foreground">Claude Code</span> — it walks you through the keys,
                verifies, then flips the signal on here.
              </p>
            </div>
          </Group>

          <Group title="Surfaces">
            {surfaceOptions.map((s) => (
              <SwitchRow key={s} label={s} checked={draft.surfaces.includes(s)} onChange={() => toggleSurface(s)} />
            ))}
          </Group>

          <Group title="Self-improvement">
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={draft.self_improvement?.mode ?? "audit"}
              onValueChange={(v) =>
                v && setDraft((d) => ({ ...d, self_improvement: { ...d.self_improvement, mode: v } }))
              }
              className="justify-start"
            >
              {SELF_MODES.map((m) => (
                <ToggleGroupItem key={m} value={m} className="px-4">
                  {m}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Group>

          <Group title="Autonomy" className="sm:col-span-2">
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={autonomy}
              onValueChange={(v) =>
                v &&
                setDraft((d) => ({
                  ...d,
                  trust: { ...d.trust, hermes_tier: tierFromLabel(v) },
                  hermes: { ...d.hermes, autonomy: v },
                }))
              }
              className="justify-start"
            >
              {TIER_LABELS.map((t) => (
                <ToggleGroupItem key={t} value={t} className="px-4">
                  {t}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              ghost proposes everything · assisted writes low-risk · autonomous writes most (never goals).
            </p>
          </Group>

          <Group title="Orchestrator trust" className="sm:col-span-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => setOrchestratorTier(orchestratorTier - 1)}
                aria-label="Lower orchestrator tier"
              >
                −
              </Button>
              <span className="w-14 text-center text-sm tabular-nums text-foreground">tier {orchestratorTier}</span>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => setOrchestratorTier(orchestratorTier + 1)}
                aria-label="Raise orchestrator tier"
              >
                +
              </Button>
            </div>
          </Group>
        </div>

        <DialogFooter className="items-center gap-3 sm:justify-start">
          <Button onClick={save} disabled={!dirty || saving} size="sm" className="w-full sm:w-auto">
            {saving ? "Saving…" : "Save config"}
          </Button>
          {saved && <span className="text-xs text-emerald-600">✓ written</span>}
          {dirty && !saved && <span className="text-xs text-muted-foreground">unsaved changes</span>}
          {error && <span className="text-xs text-rose-500">{error}</span>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Group({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <h3 className="mb-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 gap-1.5 text-xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked — no-op */
        }
      }}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "copied" : "copy"}
    </Button>
  );
}
