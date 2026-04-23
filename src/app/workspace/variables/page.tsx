"use client";

import { useState } from "react";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import { FigmaLogo } from "@/components/ui/figma-logo";
import { ALL_TOKENS, TOKEN_GROUPS, type DesignToken, type DriftStatus, type TokenGroup } from "@/lib/data/variables";
import { adaptBundleToTokens, type BundlePayload } from "@/lib/data/bundle-adapter";
import { hexToOklchString, deltaE, driftLabel } from "@/lib/utils/color";
import { AlertCircle, CheckCircle2, Minus, Sparkles, WifiOff } from "lucide-react";

// ── SWR fetcher ───────────────────────────────────────────────────────────────

const fetcher = async (url: string): Promise<BundlePayload> => {
  const res = await fetch(url);
  if (res.status === 404) {
    // Surface 404 as a special error so the caller can detect "no bundle yet"
    const err = new Error("no_bundle") as Error & { status: number };
    err.status = 404;
    throw err;
  }
  if (!res.ok) throw new Error(`Bundle fetch failed: ${res.status}`);
  return res.json();
};

// ── Drift badge ───────────────────────────────────────────────────────────────

const DRIFT_CONFIG: Record<DriftStatus, {
  label: string;
  className: string;
  icon: React.ReactNode;
}> = {
  match:   { label: "Match",   className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: <CheckCircle2 size={10} /> },
  drifted: { label: "Drift",   className: "bg-amber-500/10 text-amber-500 border-amber-500/20",      icon: <AlertCircle size={10} /> },
  custom:  { label: "Custom",  className: "bg-violet-500/10 text-violet-400 border-violet-500/20",   icon: <Sparkles size={10} /> },
  missing: { label: "Missing", className: "bg-red-500/10 text-red-400 border-red-500/20",            icon: <AlertCircle size={10} /> },
  pending: { label: "Pending", className: "bg-muted text-muted-foreground border-border",            icon: <Minus size={10} /> },
};

function DriftBadge({ status }: { status: DriftStatus }) {
  const cfg = DRIFT_CONFIG[status];
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] font-bold border rounded px-1.5 py-0.5 leading-none",
      cfg.className,
    )}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ── Color swatch ──────────────────────────────────────────────────────────────

function ColorSwatch({ value, varName }: { value: string; varName?: string }) {
  if (value === "—") return <span className="text-muted-foreground/40">—</span>;
  const style = varName
    ? { background: `var(--${varName})` }
    : { background: value };
  return (
    <span
      className="inline-block w-4 h-4 rounded border border-border/60 flex-shrink-0"
      style={style}
      title={value}
    />
  );
}

// ── Token row ─────────────────────────────────────────────────────────────────

function TokenRow({ token }: { token: DesignToken }) {
  const isColor = token.type === "color";
  const hasFigma = token.figmaValue !== null && token.figmaValue !== undefined;
  const isHex = hasFigma && (token.figmaValue as string).startsWith("#");

  // Compute oklch equivalent of Figma hex + perceptual distance
  const figmaOklch = isHex ? hexToOklchString(token.figmaValue as string) : null;
  const de = isHex && token.drift === "drifted" ? deltaE(token.figmaValue as string, "#808080") : null; // rough proxy

  const isCritical = token.note?.startsWith("⚠ CRITICAL");

  return (
    <tr className={cn(
      "border-b border-border/40 hover:bg-muted/20 transition-colors",
      isCritical && "bg-red-500/3",
    )}>
      {/* Name */}
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-2">
          {isCritical && <AlertCircle size={11} className="text-red-400 flex-shrink-0" />}
          <code className="text-xs font-mono text-foreground/80">--{token.name}</code>
        </div>
        {token.note && (
          <p className={cn(
            "text-[10px] mt-0.5",
            isCritical ? "text-red-400/70" : "text-muted-foreground/50",
          )}>
            {token.note.replace("⚠ CRITICAL — ", "")}
          </p>
        )}
      </td>

      {/* Code value */}
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-2">
          {isColor && <ColorSwatch value={token.codeValue} varName={token.name} />}
          <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
            {token.codeValue}
          </span>
        </div>
      </td>

      {/* Figma value — hex + oklch equivalent */}
      <td className="py-2.5 px-3">
        {!hasFigma ? (
          <span className="text-[10px] text-muted-foreground/40 italic">
            {token.figmaValue === undefined ? "Not in Figma" : "—"}
          </span>
        ) : (
          <div className="flex items-center gap-2">
            {isColor && <ColorSwatch value={token.figmaValue as string} />}
            <div>
              <span className="text-[11px] font-mono text-muted-foreground tabular-nums block">
                {token.figmaValue}
              </span>
              {figmaOklch && (
                <span className="text-[10px] font-mono text-muted-foreground/40 tabular-nums block">
                  {figmaOklch}
                </span>
              )}
            </div>
          </div>
        )}
      </td>

      {/* Drift */}
      <td className="py-2.5 px-3">
        <DriftBadge status={token.drift} />
      </td>
    </tr>
  );
}

// ── Group section ─────────────────────────────────────────────────────────────

function GroupSection({ groupId, tokens }: { groupId: TokenGroup; tokens: DesignToken[] }) {
  const group = TOKEN_GROUPS.find((g) => g.id === groupId);
  if (!group) return null;

  const driftCount = tokens.filter((t) => t.drift === "drifted").length;
  const matchCount = tokens.filter((t) => t.drift === "match").length;

  return (
    <section className="mb-8">
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="text-sm font-semibold text-foreground">{group.label}</h2>
        <p className="text-xs text-muted-foreground">{group.description}</p>
        <div className="ml-auto flex items-center gap-2">
          {driftCount > 0 && (
            <span className="text-[10px] text-amber-500 font-mono">{driftCount} drifted</span>
          )}
          {matchCount > 0 && (
            <span className="text-[10px] text-emerald-500 font-mono">{matchCount} matched</span>
          )}
          <span className="text-[10px] text-muted-foreground/50 font-mono">{tokens.length} tokens</span>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="py-2 px-3 text-[10px] font-black tracking-widest uppercase text-muted-foreground/50 w-1/3">Variable</th>
              <th className="py-2 px-3 text-[10px] font-black tracking-widest uppercase text-muted-foreground/50 w-1/3">Code</th>
              <th className="py-2 px-3 text-[10px] font-black tracking-widest uppercase text-muted-foreground/50 w-1/4">Figma</th>
              <th className="py-2 px-3 text-[10px] font-black tracking-widest uppercase text-muted-foreground/50">Status</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((t) => (
              <TokenRow key={t.name} token={t} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Not-connected banner ──────────────────────────────────────────────────────

function NotConnectedBanner() {
  return (
    <div className="flex items-start gap-3 mb-6 px-4 py-3 rounded-lg border border-border bg-muted/30">
      <WifiOff size={14} className="text-muted-foreground/60 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-muted-foreground leading-relaxed">
        No Figma data yet — open the Systemix plugin in Figma and it will sync here automatically.
        The tokens below are static reference data.
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const ALL_GROUPS = TOKEN_GROUPS.map((g) => g.id);

export default function VariablesPage() {
  const [activeGroup, setActiveGroup] = useState<TokenGroup | "all">("all");

  // Fetch live bundle data from the plugin, polling every 10 s
  const { data: bundle, error } = useSWR<BundlePayload>("/api/bundle", fetcher, {
    refreshInterval: 10000,
    // Don't retry on 404 — it just means no bundle exists yet
    shouldRetryOnError: (err) => (err as { status?: number }).status !== 404,
  });

  const isNotConnected =
    error != null && (error as { status?: number }).status === 404;

  // Prefer live tokens when the bundle loaded successfully; fall back to static
  const displayTokens: DesignToken[] =
    bundle != null ? adaptBundleToTokens(bundle.collections) : ALL_TOKENS;

  // Derive unique groups present in the live tokens so the filter tabs stay
  // accurate when the plugin sends a different set of collections.
  const liveGroupIds = new Set(displayTokens.map((t) => t.group));
  const visibleGroupDefs = TOKEN_GROUPS.filter(
    (g) => liveGroupIds.has(g.id) || bundle == null
  );
  const visibleGroupIds = visibleGroupDefs.map((g) => g.id);

  const totalDrifted = displayTokens.filter((t) => t.drift === "drifted").length;
  const totalMatched = displayTokens.filter((t) => t.drift === "match").length;
  const totalCustom  = displayTokens.filter((t) => t.drift === "custom").length;

  const activeGroups: TokenGroup[] =
    activeGroup === "all"
      ? visibleGroupIds
      : visibleGroupIds.includes(activeGroup)
        ? [activeGroup]
        : visibleGroupIds;

  return (
    <div className="min-h-screen">
      {/* Canvas header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-4 px-6 h-12">
          <h1 className="text-sm font-semibold text-foreground">Variables</h1>
          <span className="text-[10px] font-mono text-muted-foreground/50 tabular-nums">
            {displayTokens.length} tokens
          </span>

          {/* Stats */}
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-[10px] text-muted-foreground">{totalDrifted} drifted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-muted-foreground">{totalMatched} matched</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
              <span className="text-[10px] text-muted-foreground">{totalCustom} custom</span>
            </div>
          </div>

          {/* Figma connect indicator */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
            bundle != null
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-border bg-muted/40",
          )}>
            <FigmaLogo size={12} />
            {bundle != null ? (
              <span className="text-[11px] text-emerald-600">
                Synced from Figma
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                Paste Figma URL to populate Figma column
              </span>
            )}
          </div>
        </div>

        {/* Group filter tabs */}
        <div className="flex items-center gap-0.5 px-6 pb-0 border-t border-border/50">
          <button
            onClick={() => setActiveGroup("all")}
            className={cn(
              "px-3 py-2 text-xs transition-colors border-b-2 -mb-px",
              activeGroup === "all"
                ? "border-foreground text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            All
          </button>
          {visibleGroupDefs.map((g) => {
            const count = displayTokens.filter((t) => t.group === g.id).length;
            return (
              <button
                key={g.id}
                onClick={() => setActiveGroup(g.id)}
                className={cn(
                  "px-3 py-2 text-xs transition-colors border-b-2 -mb-px flex items-center gap-1.5",
                  activeGroup === g.id
                    ? "border-foreground text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {g.label}
                <span className="text-[10px] text-muted-foreground/40 font-mono tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Canvas body */}
      <div className="px-6 py-6">
        {/* Show banner when no bundle exists yet */}
        {isNotConnected && <NotConnectedBanner />}

        {activeGroups.map((groupId) => {
          const tokens = displayTokens.filter((t) => t.group === groupId);
          if (tokens.length === 0) return null;
          return <GroupSection key={groupId} groupId={groupId} tokens={tokens} />;
        })}
      </div>
    </div>
  );
}
