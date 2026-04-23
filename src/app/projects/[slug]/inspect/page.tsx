"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { ALL_TOKENS, type DesignToken, type DriftStatus, type TokenGroup } from "@/lib/data/variables";
import { getProject } from "@/lib/data/mock-projects";

// ── Drift badge ───────────────────────────────────────────────────────────────

const DRIFT_STYLES: Record<DriftStatus, string> = {
  match:   "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  drifted: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  custom:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  missing: "bg-red-400/10 text-red-400 border-red-400/20",
  pending: "bg-muted/50 text-muted-foreground/50 border-border",
};

function DriftBadge({ status }: { status: DriftStatus }) {
  return (
    <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-wide border rounded px-1.5 py-0.5 leading-none ${DRIFT_STYLES[status]}`}>
      {status}
    </span>
  );
}

// ── Tree nav ──────────────────────────────────────────────────────────────────

const TREE_SECTIONS: { key: string; label: string; count?: number }[] = [
  { key: "tokens",     label: "Tokens" },
  { key: "components", label: "Components" },
  { key: "rationale",  label: "Rationale" },
  { key: "history",    label: "History" },
];

const GROUP_LABELS: Record<TokenGroup, string> = {
  semantic:   "Semantic",
  sidebar:    "Sidebar",
  status:     "Status",
  agent:      "Agent",
  typography: "Typography",
  spacing:    "Spacing",
  radius:     "Radius",
  shadow:     "Shadow",
  animation:  "Animation",
};

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({ token, onClose }: { token: DesignToken; onClose: () => void }) {
  const source = token.drift === "drifted" ? "code wins" : token.drift === "custom" ? "custom" : "in sync";

  return (
    <div className="w-72 shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
      <div className="h-10 border-b border-border flex items-center justify-between px-4">
        <span className="text-[11px] font-semibold text-foreground font-mono truncate">{token.name}</span>
        <button
          onClick={onClose}
          className="text-muted-foreground/50 hover:text-foreground transition-colors text-xs px-1"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Drift status */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">Status</p>
          <div className="flex items-center gap-2">
            <DriftBadge status={token.drift} />
            <span className="text-[10px] text-muted-foreground/60 font-mono">{source}</span>
          </div>
        </div>

        {/* Type */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">Type</p>
          <span className="text-[10px] font-mono text-muted-foreground">{token.type} · {GROUP_LABELS[token.group]}</span>
        </div>

        {/* Code value */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">Code</p>
          <code className="text-[10px] font-mono bg-muted/50 px-2 py-1 rounded block text-foreground/80 break-all">
            {token.codeValue}
          </code>
        </div>

        {/* Figma value */}
        {token.figmaValue !== undefined && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">Figma</p>
            <code className="text-[10px] font-mono bg-muted/50 px-2 py-1 rounded block text-foreground/80 break-all">
              {token.figmaValue ?? "—"}
            </code>
          </div>
        )}

        {/* CSS variable */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">CSS Variable</p>
          <code className="text-[10px] font-mono text-blue-400 break-all">--{token.name}</code>
        </div>

        {/* Note */}
        {token.note && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">Note</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{token.note}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const DRIFT_FILTERS: { label: string; value: DriftStatus | "all" }[] = [
  { label: "All",     value: "all" },
  { label: "Drifted", value: "drifted" },
  { label: "Match",   value: "match" },
  { label: "Custom",  value: "custom" },
  { label: "Pending", value: "pending" },
];

export default function InspectPage() {
  const { slug } = useParams<{ slug: string }>();
  const p = getProject(slug);

  const [section, setSection] = useState<string>("tokens");
  const [driftFilter, setDriftFilter] = useState<DriftStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DesignToken | null>(null);

  const tokens = useMemo(() => {
    let list = ALL_TOKENS;
    if (driftFilter !== "all") list = list.filter((t) => t.drift === driftFilter);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((t) => t.name.includes(q) || t.group.includes(q));
    }
    return list;
  }, [driftFilter, query]);

  const driftCounts = useMemo(() => ({
    drifted: ALL_TOKENS.filter((t) => t.drift === "drifted").length,
    pending: ALL_TOKENS.filter((t) => t.drift === "pending").length,
    match:   ALL_TOKENS.filter((t) => t.drift === "match").length,
    custom:  ALL_TOKENS.filter((t) => t.drift === "custom").length,
    missing: ALL_TOKENS.filter((t) => t.drift === "missing").length,
  }), []);

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Left tree */}
      <nav className="w-48 shrink-0 border-r border-border bg-card flex flex-col overflow-hidden">
        <div className="h-10 border-b border-border flex items-center px-4">
          <span className="text-[10px] font-black tracking-widest uppercase text-muted-foreground/40">
            Contract
          </span>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {TREE_SECTIONS.map(({ key, label }) => {
            const active = section === key;
            const badge =
              key === "tokens" ? ALL_TOKENS.length :
              key === "components" ? (p?.componentCount ?? 0) :
              undefined;
            return (
              <button
                key={key}
                onClick={() => setSection(key)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-2 text-[11px] transition-colors text-left",
                  active
                    ? "text-foreground bg-muted/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
                )}
              >
                <span>{label}</span>
                {badge != null && (
                  <span className="text-[10px] font-mono text-muted-foreground/40 tabular-nums">{badge}</span>
                )}
              </button>
            );
          })}

          {section === "tokens" && (
            <div className="mt-3 px-3 border-t border-border/40 pt-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 mb-1.5 px-1">Groups</p>
              {(Object.keys(GROUP_LABELS) as TokenGroup[]).map((g) => {
                const count = ALL_TOKENS.filter((t) => t.group === g).length;
                if (!count) return null;
                return (
                  <button
                    key={g}
                    onClick={() => setQuery(g)}
                    className="w-full flex items-center justify-between px-1 py-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  >
                    <span className="font-mono">{GROUP_LABELS[g]}</span>
                    <span className="font-mono tabular-nums">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {section === "tokens" ? (
          <>
            {/* Filter bar */}
            <div className="h-10 border-b border-border flex items-center gap-3 px-4 shrink-0">
              <input
                type="text"
                placeholder="Search tokens…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-6 text-[11px] font-mono bg-transparent border border-border/50 rounded px-2 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-border w-48"
              />
              <div className="flex items-center gap-1">
                {DRIFT_FILTERS.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setDriftFilter(value)}
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-mono transition-colors",
                      driftFilter === value
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground/50 hover:text-muted-foreground",
                    )}
                  >
                    {label}
                    {value !== "all" && driftCounts[value] > 0 && (
                      <span className="ml-1 opacity-60">{driftCounts[value as DriftStatus]}</span>
                    )}
                  </button>
                ))}
              </div>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground/30 tabular-nums">
                {tokens.length} tokens
              </span>
            </div>

            {/* Token table */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-card border-b border-border z-10">
                    <tr>
                      <th className="text-left px-4 py-2 font-mono text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 w-[36%]">Name</th>
                      <th className="text-left px-3 py-2 font-mono text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 w-[10%]">Group</th>
                      <th className="text-left px-3 py-2 font-mono text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 w-[26%]">Code</th>
                      <th className="text-left px-3 py-2 font-mono text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 w-[16%]">Figma</th>
                      <th className="text-left px-3 py-2 font-mono text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 w-[12%]">Drift</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {tokens.map((t) => (
                      <tr
                        key={t.name}
                        onClick={() => setSelected(selected?.name === t.name ? null : t)}
                        className={cn(
                          "cursor-pointer transition-colors",
                          selected?.name === t.name
                            ? "bg-muted/40"
                            : "hover:bg-muted/20",
                        )}
                      >
                        <td className="px-4 py-2 font-mono text-foreground/80">{t.name}</td>
                        <td className="px-3 py-2 text-muted-foreground/50 capitalize">{t.group}</td>
                        <td className="px-3 py-2 font-mono text-muted-foreground/70 truncate max-w-0">
                          <span className="block truncate">{t.codeValue}</span>
                        </td>
                        <td className="px-3 py-2 font-mono text-muted-foreground/50 truncate max-w-0">
                          <span className="block truncate">
                            {t.figmaValue === undefined ? <span className="text-muted-foreground/30 italic">not in Figma</span>
                              : t.figmaValue === null ? <span className="text-muted-foreground/30">—</span>
                              : t.figmaValue}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <DriftBadge status={t.drift} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Detail panel */}
              {selected && (
                <DetailPanel token={selected} onClose={() => setSelected(null)} />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[11px] font-mono text-muted-foreground/30">
              {section} — coming soon
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
