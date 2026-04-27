"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tier = 1 | 2 | 3;
type ConflictStatus = "pending" | "deferred" | "escalated" | "approved" | "rejected";
type ConflictType = "drifted" | "missing-in-figma";

type DriftConflict = {
  id: string;
  token: string;
  path: string;
  tier: Tier;
  codeValue: string;
  figmaValue: string;
  deltaE: number;
  proposedResolution: "code-wins" | "figma-wins";
  confidence: number;
  status: ConflictStatus;
  type: ConflictType;
  rationale: string;
  history: { ago: string; action: string; actor?: string }[];
};

type FilterTab = "pending" | "tier3" | "all" | "other";

// ── Mock data ─────────────────────────────────────────────────────────────────

const ALL_CONFLICTS: DriftConflict[] = [
  {
    id: "c1",
    token: "color.primary.500",
    path: "src/app/globals.css → Semantic/color.primary",
    tier: 3,
    codeValue: "#0063c4",
    figmaValue: "#0052a3",
    deltaE: 7.2,
    proposedResolution: "code-wins",
    confidence: 0.91,
    status: "pending",
    type: "drifted",
    rationale: "Code value reflects the brand refresh from Q1. Figma was not updated after the design handoff.",
    history: [
      { ago: "2h ago", action: "Drift detected by systemix-scan" },
      { ago: "1h ago", action: "Tier 3 classified (ΔE 7.2)" },
    ],
  },
  {
    id: "c2",
    token: "color.surface.overlay",
    path: "src/app/globals.css → Semantic/sidebar",
    tier: 2,
    codeValue: "rgba(0,0,0,0.48)",
    figmaValue: "rgba(0,0,0,0.40)",
    deltaE: 3.1,
    proposedResolution: "figma-wins",
    confidence: 0.78,
    status: "pending",
    type: "drifted",
    rationale: "Figma value matches accessibility guidelines for overlay contrast ratio. Code was set during an ad-hoc fix.",
    history: [
      { ago: "4h ago", action: "Drift detected" },
      { ago: "3h ago", action: "Hermes proposed figma-wins (78% conf)" },
    ],
  },
  {
    id: "c3",
    token: "radius.dialog",
    path: "src/app/globals.css → Spacing & Radius",
    tier: 1,
    codeValue: "12px",
    figmaValue: "10px",
    deltaE: 0,
    proposedResolution: "code-wins",
    confidence: 0.65,
    status: "deferred",
    type: "drifted",
    rationale: "Minor radius difference. Code rounded up for visual consistency with the modal spec.",
    history: [
      { ago: "1d ago", action: "Drift detected" },
      { ago: "1d ago", action: "Deferred — revisit in sprint 3", actor: "Boyan" },
    ],
  },
  {
    id: "c4",
    token: "color.accent.teal",
    path: "src/app/globals.css → Semantic",
    tier: 3,
    codeValue: "#00b4a2",
    figmaValue: "— not in Figma",
    deltaE: 0,
    proposedResolution: "code-wins",
    confidence: 0.88,
    status: "pending",
    type: "missing-in-figma",
    rationale: "Token was added in the teal accent sprint but was never backfilled into the Figma variable library.",
    history: [
      { ago: "3d ago", action: "Token added to globals.css" },
      { ago: "2d ago", action: "Missing-in-Figma detected" },
    ],
  },
  {
    id: "c5",
    token: "color.success.foreground",
    path: "src/app/globals.css → Status",
    tier: 2,
    codeValue: "#16a34a",
    figmaValue: "#15803d",
    deltaE: 2.4,
    proposedResolution: "figma-wins",
    confidence: 0.82,
    status: "pending",
    type: "drifted",
    rationale: "Figma value aligns with the brand green palette. Code was bumped to a lighter shade for button contrast.",
    history: [{ ago: "6h ago", action: "Drift detected (ΔE 2.4)" }],
  },
  {
    id: "c6",
    token: "color.warning.500",
    path: "src/app/globals.css → Status",
    tier: 3,
    codeValue: "#d97706",
    figmaValue: "#b45309",
    deltaE: 6.1,
    proposedResolution: "code-wins",
    confidence: 0.74,
    status: "pending",
    type: "drifted",
    rationale: "Code value passes WCAG AA against white background. Figma value fails at normal text size.",
    history: [{ ago: "8h ago", action: "Tier 3 classified (ΔE 6.1)" }],
  },
  {
    id: "c7",
    token: "spacing.page.padding",
    path: "src/app/globals.css → Spacing",
    tier: 1,
    codeValue: "24px",
    figmaValue: "20px",
    deltaE: 0,
    proposedResolution: "code-wins",
    confidence: 0.61,
    status: "escalated",
    type: "drifted",
    rationale: "Code uses 24px for better breathing room on large screens. Figma spec predates the responsive layout redesign.",
    history: [
      { ago: "2d ago", action: "Drift detected" },
      { ago: "1d ago", action: "Escalated — low confidence" },
    ],
  },
  {
    id: "c8",
    token: "color.brand.midnight",
    path: "src/app/globals.css → Semantic",
    tier: 3,
    codeValue: "#0f172a",
    figmaValue: "#1e293b",
    deltaE: 8.7,
    proposedResolution: "figma-wins",
    confidence: 0.93,
    status: "pending",
    type: "drifted",
    rationale: "Figma midnight was updated in the dark mode palette refresh. Code still has the legacy value from the original palette.",
    history: [
      { ago: "1d ago", action: "Tier 3 classified (ΔE 8.7)" },
      { ago: "22h ago", action: "Hermes proposed figma-wins (93% conf)" },
    ],
  },
];

function getConflicts(slug: string): DriftConflict[] {
  const counts: Record<string, number> = { finova: 4, verdure: 6, nexatech: 8 };
  return ALL_CONFLICTS.slice(0, counts[slug] ?? 4);
}

// ── Tier config ────────────────────────────────────────────────────────────────

const TIER: Record<Tier, { dot: string; badge: string; label: string }> = {
  3: { dot: "bg-red-400",    badge: "bg-red-500/10 text-red-400 border-red-500/20",       label: "Tier 3 — Obvious" },
  2: { dot: "bg-amber-400",  badge: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Tier 2 — Noticeable" },
  1: { dot: "bg-blue-400",   badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",    label: "Tier 1 — Subtle" },
};

const STATUS_COLOR: Record<ConflictStatus, string> = {
  pending:   "text-amber-400",
  deferred:  "text-muted-foreground/50",
  escalated: "text-purple-400",
  approved:  "text-emerald-400",
  rejected:  "text-red-400",
};

// ── Colour swatch ──────────────────────────────────────────────────────────────

function ColorSwatch({ value, label }: { value: string; label: string }) {
  const isColor = value.startsWith("#") || value.startsWith("rgb") || value.startsWith("oklch");
  return (
    <div className="flex items-start gap-2.5">
      {isColor && (
        <div
          className="w-8 h-8 rounded border border-border/40 shrink-0 mt-0.5"
          style={{ background: value }}
        />
      )}
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-1">{label}</p>
        <code className="text-[11px] font-mono text-foreground/80 break-all leading-snug">{value}</code>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DriftPage() {
  const { slug } = useParams<{ slug: string }>();

  const [conflicts, setConflicts] = useState<DriftConflict[]>(() => getConflicts(slug));
  const [selected, setSelected] = useState<DriftConflict | null>(() => {
    const initial = getConflicts(slug);
    return initial[0] ?? null;
  });
  const [filter, setFilter] = useState<FilterTab>("pending");
  const [proposeUpdate, setProposeUpdate] = useState(false);

  // Reset when navigating between projects
  useEffect(() => {
    const fresh = getConflicts(slug);
    setConflicts(fresh);
    setSelected(fresh[0] ?? null);
    setFilter("pending");
  }, [slug]);

  const filtered = useMemo(() => {
    const sorted = [...conflicts].sort((a, b) => b.tier - a.tier);
    switch (filter) {
      case "pending":  return sorted.filter(c => c.status === "pending");
      case "tier3":    return sorted.filter(c => c.tier === 3);
      case "other":    return sorted.filter(c => c.status === "deferred" || c.status === "escalated");
      default:         return sorted;
    }
  }, [conflicts, filter]);

  const pendingCount = conflicts.filter(c => c.status === "pending").length;
  const resolvedCount = conflicts.filter(c => c.status === "approved" || c.status === "rejected").length;
  const selectedIdx = selected ? filtered.findIndex(c => c.id === selected.id) : -1;

  const doAction = useCallback((action: "approved" | "rejected" | "deferred" | "escalated") => {
    if (!selected) return;
    const label = action[0].toUpperCase() + action.slice(1);
    setConflicts(prev =>
      prev.map(c =>
        c.id === selected.id
          ? { ...c, status: action, history: [...c.history, { ago: "just now", action: `${label} by user` }] }
          : c
      )
    );
    // Advance to next item in current filtered list (before it re-filters)
    const next = filtered[selectedIdx + 1] ?? filtered[selectedIdx - 1] ?? null;
    if (next && next.id !== selected.id) setSelected(next);
  }, [selected, filtered, selectedIdx]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey) return;
      switch (e.key) {
        case "j": case "ArrowDown": {
          e.preventDefault();
          const next = filtered[selectedIdx + 1];
          if (next) setSelected(next);
          break;
        }
        case "k": case "ArrowUp": {
          e.preventDefault();
          const prev = filtered[selectedIdx - 1];
          if (prev) setSelected(prev);
          break;
        }
        case "Enter": case "a": doAction("approved"); break;
        case "r": doAction("rejected"); break;
        case "d": doAction("deferred"); break;
        case "e": doAction("escalated"); break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, selectedIdx, doAction]);

  const FILTERS: { id: FilterTab; label: string }[] = [
    { id: "pending", label: "Pending" },
    { id: "tier3",   label: "Tier 3" },
    { id: "all",     label: "All" },
    { id: "other",   label: "Other" },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Sticky pending banner */}
      {pendingCount > 0 && (
        <div className="shrink-0 bg-amber-500/8 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          <span className="text-[11px] text-amber-500 font-medium">
            {pendingCount} conflict{pendingCount !== 1 ? "s" : ""} pending resolution
          </span>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground/30 hidden sm:block">
            J/K · Enter approve · R reject · D defer · E escalate
          </span>
        </div>
      )}

      {/* Three-pane layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left pane — queue */}
        <div className="w-56 shrink-0 border-r border-border bg-card flex flex-col overflow-hidden">
          {/* Filter tabs */}
          <div className="h-10 border-b border-border flex items-center gap-0.5 px-2 shrink-0">
            {FILTERS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={cn(
                  "px-2 py-1 text-[10px] rounded transition-colors font-mono",
                  filter === tab.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground/50 hover:text-muted-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Queue list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center h-20">
                <p className="text-[11px] font-mono text-muted-foreground/30">Empty</p>
              </div>
            ) : (
              filtered.map(c => {
                const t = TIER[c.tier];
                const isSelected = selected?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 border-b border-border/30 transition-colors",
                      isSelected ? "bg-muted/60" : "hover:bg-muted/20",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.dot}`} />
                      <span className="text-[11px] font-mono text-foreground/80 truncate flex-1">
                        {c.token}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pl-3.5">
                      <span className={`text-[9px] font-bold uppercase tracking-wide ${STATUS_COLOR[c.status]}`}>
                        {c.status}
                      </span>
                      {c.deltaE > 0 && (
                        <span className="text-[9px] font-mono text-muted-foreground/35 tabular-nums">
                          ΔE {c.deltaE.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Queue footer */}
          <div className="shrink-0 border-t border-border px-3 py-2">
            <p className="text-[10px] font-mono text-muted-foreground/35 tabular-nums">
              {resolvedCount} resolved · {pendingCount} pending
            </p>
          </div>
        </div>

        {/* Center pane — conflict detail */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {selected ? (
            <>
              {/* Breadcrumb + tier */}
              <div className="h-10 border-b border-border flex items-center px-4 gap-3 shrink-0">
                <span className="text-[10px] font-mono text-muted-foreground/40 truncate flex-1">
                  {selected.path}
                </span>
                <span className={cn(
                  "shrink-0 text-[9px] font-bold uppercase tracking-wide border rounded px-1.5 py-0.5 leading-none",
                  TIER[selected.tier].badge,
                )}>
                  {TIER[selected.tier].label}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {/* Token header */}
                <div className="mb-6">
                  <h2 className="text-[15px] font-bold font-mono text-foreground mb-1.5">{selected.token}</h2>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wide ${STATUS_COLOR[selected.status]}`}>
                      {selected.status}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/40">
                      {selected.type === "missing-in-figma" ? "Missing in Figma" : "Value drift"}
                    </span>
                    {selected.deltaE > 0 && (
                      <span className="text-[10px] font-mono text-muted-foreground/40 tabular-nums">
                        ΔE {selected.deltaE.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Side-by-side values */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="border border-border/40 rounded-lg p-4 bg-muted/10">
                    <ColorSwatch value={selected.codeValue} label="Code" />
                  </div>
                  <div className={cn(
                    "border rounded-lg p-4",
                    selected.type === "missing-in-figma"
                      ? "border-blue-500/20 bg-blue-500/5"
                      : "border-border/40 bg-muted/10",
                  )}>
                    <ColorSwatch value={selected.figmaValue} label="Figma" />
                  </div>
                </div>

                {/* Proposed resolution */}
                <div className="mb-6 border border-border/40 rounded-lg px-4 py-3.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">
                    Proposed by Hermes
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] font-bold font-mono text-foreground">
                      {selected.proposedResolution === "code-wins" ? "code wins" : "figma wins"}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-foreground/25 transition-all"
                        style={{ width: `${selected.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground/50 tabular-nums">
                      {Math.round(selected.confidence * 100)}%
                    </span>
                  </div>
                </div>

                {/* Rationale */}
                <div className="mb-6">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">
                    Rationale
                  </p>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    {selected.rationale}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <ActionBtn
                    label="Approve"
                    shortcut="⏎"
                    className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                    onClick={() => doAction("approved")}
                  />
                  <ActionBtn
                    label="Reject"
                    shortcut="R"
                    className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                    onClick={() => doAction("rejected")}
                  />
                  <ActionBtn
                    label="Defer"
                    shortcut="D"
                    className="bg-muted border-border text-muted-foreground hover:bg-muted/70"
                    onClick={() => doAction("deferred")}
                  />
                  <ActionBtn
                    label="Escalate"
                    shortcut="E"
                    className="bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20"
                    onClick={() => doAction("escalated")}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-[12px] font-mono text-muted-foreground/40 mb-1">No conflict selected</p>
                <p className="text-[10px] font-mono text-muted-foreground/25">Select a conflict from the queue</p>
              </div>
            </div>
          )}
        </div>

        {/* Right pane — history + rationale */}
        <div className="w-56 shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
          <div className="h-10 border-b border-border flex items-center px-4 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
              Context
            </span>
          </div>

          {selected ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-5">
              {/* Timeline */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 mb-2">
                  Timeline
                </p>
                <div className="space-y-2.5">
                  {selected.history.map((h, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="shrink-0 w-1 h-1 rounded-full bg-muted-foreground/25 mt-1.5" />
                      <div>
                        <p className="text-[11px] text-muted-foreground/70 leading-snug">{h.action}</p>
                        {h.actor && (
                          <p className="text-[10px] text-muted-foreground/40">{h.actor}</p>
                        )}
                        <p className="text-[10px] font-mono text-muted-foreground/30">{h.ago}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* After-resolution option */}
              <div className="pt-3 border-t border-border/40">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 mb-2">
                  After resolution
                </p>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={proposeUpdate}
                    onChange={e => setProposeUpdate(e.target.checked)}
                    className="mt-0.5 accent-foreground"
                  />
                  <span className="text-[11px] text-muted-foreground/55 leading-snug">
                    Ask Hermes to update the rationale prose in the MDX contract
                  </span>
                </label>
              </div>

              {/* Cross-project note */}
              <div className="pt-3 border-t border-border/40">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 mb-2">
                  Cross-project
                </p>
                <p className="text-[10px] text-muted-foreground/40 leading-relaxed">
                  Similar drift pattern seen in 2 other projects. Resolution here won&apos;t propagate — each project resolves independently.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[11px] font-mono text-muted-foreground/25">Select a conflict</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Action button ─────────────────────────────────────────────────────────────

function ActionBtn({
  label,
  shortcut,
  className,
  onClick,
}: {
  label: string;
  shortcut: string;
  className: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3.5 py-1.5 rounded-lg border text-[11px] font-bold transition-colors flex items-center gap-1.5",
        className,
      )}
    >
      {label}
      <span className="opacity-35 font-mono text-[10px]">{shortcut}</span>
    </button>
  );
}
