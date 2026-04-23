"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Combobox } from "@/components/ui/combobox";
import { ALL_TOKENS, COMBOBOX_TOKENS, COMBOBOX_HARDCODED } from "@/lib/data/variables";
import { hexToOklchString } from "@/lib/utils/color";
import { AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";

// Real Figma variable values for combobox tokens (fetched 2026-04-06)
const FIGMA_VALUES: Record<string, string> = {
  "background":         "#fafafa",
  "foreground":         "#000000",
  "popover":            "#ffffff",
  "primary":            "#000000",
  "primary-foreground": "#ffffff",
  "muted":              "#f5f5f5",
  "muted-foreground":   "#525252",
  "accent":             "#facc15",   // ← CRITICAL: yellow, not near-white
  "accent-foreground":  "#000000",
  "border":             "#000000",   // ← CRITICAL: black borders
  "input":              "#000000",   // ← CRITICAL: black (used as border color)
  "ring":               null as unknown as string,
};

const CRITICAL_TOKENS = ["accent", "border", "input"];

// ── Figma token overrides — scoped to the preview container only ──────────────
// These are the exact values from the Figma file (verolab shadcn kit).
// Applied as inline CSS custom properties so they never affect the Systemix UI.
const FIGMA_PREVIEW_VARS: React.CSSProperties = {
  "--background":         "#fafafa",
  "--foreground":         "#000000",
  "--card":               "#ffffff",
  "--card-foreground":    "#000000",
  "--popover":            "#ffffff",
  "--popover-foreground": "#000000",
  "--primary":            "#000000",
  "--primary-foreground": "#ffffff",
  "--muted":              "#f5f5f5",
  "--muted-foreground":   "#525252",
  "--accent":             "#facc15",
  "--accent-foreground":  "#000000",
  "--border":             "#000000",
  "--input":              "#000000",
  "--ring":               "#000000",
  "--radius":             "0px",
} as React.CSSProperties;

// ── Demo data ─────────────────────────────────────────────────────────────────

const FRAMEWORKS = [
  { value: "next.js", label: "Next.js" },
  { value: "sveltekit", label: "SvelteKit" },
  { value: "nuxt.js", label: "Nuxt.js" },
  { value: "remix", label: "Remix" },
  { value: "astro", label: "Astro" },
];

// ── Token usage panel ─────────────────────────────────────────────────────────

function TokenUsageRow({ name }: { name: string }) {
  const token = ALL_TOKENS.find((t) => t.name === name);
  const isDrifted = token?.drift === "drifted";
  const isCritical = CRITICAL_TOKENS.includes(name);
  const figmaHex = FIGMA_VALUES[name];
  const figmaOklch = figmaHex ? hexToOklchString(figmaHex) : null;

  return (
    <div className={cn(
      "py-2 px-3 rounded-md",
      isCritical ? "bg-red-500/5 border border-red-500/10" : isDrifted ? "bg-amber-500/5" : "hover:bg-muted/30",
    )}>
      <div className="flex items-center gap-2">
        {/* Code swatch */}
        <span
          className="w-3.5 h-3.5 rounded border border-border/60 flex-shrink-0"
          style={{ background: `var(--${name})` }}
          title="Code value"
        />
        {/* Figma swatch */}
        {figmaHex && (
          <span
            className="w-3.5 h-3.5 rounded border border-border/60 flex-shrink-0"
            style={{ background: figmaHex }}
            title={`Figma: ${figmaHex}`}
          />
        )}

        <code className="text-xs font-mono text-foreground/80 flex-1">--{name}</code>

        {isCritical && (
          <span className="text-[10px] font-bold text-red-400">CRITICAL</span>
        )}
        {isDrifted && !isCritical && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-500">
            <AlertCircle size={10} /> Drift
          </span>
        )}
        {token?.drift === "match" && (
          <CheckCircle2 size={10} className="text-emerald-500" />
        )}
      </div>

      {/* Figma hex → oklch */}
      {figmaOklch && isDrifted && (
        <div className="mt-1 pl-8 space-y-0.5">
          <p className="text-[10px] font-mono text-muted-foreground/50">
            code: <span className="text-foreground/60">{token?.codeValue.slice(0, 28)}</span>
          </p>
          <p className="text-[10px] font-mono text-muted-foreground/50">
            figma: <span className="text-foreground/60">{figmaHex}</span>
            <span className="ml-1 text-muted-foreground/30">→ {figmaOklch}</span>
          </p>
        </div>
      )}
    </div>
  );
}

// ── Hardcoded value row ────────────────────────────────────────────────────────

function HardcodedRow({ item }: { item: typeof COMBOBOX_HARDCODED[number] }) {
  return (
    <div className="flex items-start gap-3 py-2.5 px-3 rounded-md bg-red-500/5 border border-red-500/10">
      <AlertCircle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs text-muted-foreground">{item.location}</span>
          <code className="text-[10px] font-mono bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded">
            {item.value}
          </code>
        </div>
        <p className="text-[10px] text-muted-foreground/60">
          Suggestion: <span className="text-muted-foreground font-mono">{item.suggestion}</span>
        </p>
      </div>
    </div>
  );
}

// ── Viewport controls ─────────────────────────────────────────────────────────

type Viewport = "mobile" | "tablet" | "desktop";

const VIEWPORTS: { id: Viewport; label: string; width: string }[] = [
  { id: "mobile",  label: "375",  width: "375px" },
  { id: "tablet",  label: "768",  width: "768px" },
  { id: "desktop", label: "1280", width: "100%" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ComboboxPage() {
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [selected, setSelected] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);
  const vp = VIEWPORTS.find((v) => v.id === viewport)!;

  const driftedTokens = COMBOBOX_TOKENS.filter(
    (name) => ALL_TOKENS.find((t) => t.name === name)?.drift === "drifted",
  );
  const criticalCount = COMBOBOX_TOKENS.filter((n) => CRITICAL_TOKENS.includes(n)).length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Canvas header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm flex items-center gap-4 px-6 h-12 flex-shrink-0">
        <h1 className="text-sm font-semibold text-foreground">Combobox</h1>
        <code className="text-[10px] font-mono text-muted-foreground/50">shadcn/ui · verolab kit</code>
        <a
          href="https://www.figma.com/design/VevEvC0Ime1LHAlgz3PkPI/verolab---shadcn-ui-kit-for-Figma---Pro-Blocks---August-2025?node-id=17085-197681"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <ExternalLink size={10} /> Open in Figma
        </a>

        {/* Viewport switcher */}
        <div className="ml-auto flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
          {VIEWPORTS.map((v) => (
            <button
              key={v.id}
              onClick={() => setViewport(v.id)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-mono transition-colors",
                viewport === v.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Drift warning */}
        {driftedTokens.length > 0 && (
          <div className="flex items-center gap-1.5 text-amber-500">
            <AlertCircle size={12} />
            <span className="text-xs">{driftedTokens.length} drifted tokens</span>
          </div>
        )}
      </div>

      {/* Critical drift banner */}
      {criticalCount > 0 && (
        <div className="flex items-start gap-3 px-6 py-3 bg-red-500/5 border-b border-red-500/10">
          <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-semibold text-red-400">3 critical token mismatches</span>
            {" "}between Figma and code:{" "}
            <span className="font-mono text-foreground/70">--accent</span> is{" "}
            <span className="font-mono" style={{ color: "#facc15" }}>#facc15 (yellow)</span> in Figma but{" "}
            <span className="font-mono text-foreground/70">oklch(0.97 0 0)</span> in code —
            the selected state looks completely different.{" "}
            <span className="font-mono text-foreground/70">--border</span> and{" "}
            <span className="font-mono text-foreground/70">--input</span> are{" "}
            <span className="font-mono text-foreground/70">#000000</span> (black) in Figma vs light grays in code.
          </div>
        </div>
      )}

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Canvas preview */}
        <div className="flex-1 bg-muted/20 flex flex-col overflow-auto">
          {/* Viewport frame */}
          <div className="flex-1 flex items-center justify-center p-8">
            <div
              className="bg-background rounded-xl border border-border shadow-lg transition-all duration-300 overflow-hidden"
              style={{
                width: vp.width,
                maxWidth: "100%",
                minHeight: "320px",
              }}
            >
              {/* Page chrome */}
              <div className="border-b border-border px-4 py-2 flex items-center gap-2 bg-muted/30">
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/40" />
                </div>
                <span className="text-[10px] text-muted-foreground/40 font-mono ml-2">localhost:3001</span>
              </div>

              {/* Component canvas — Figma token scope injected here */}
              <div
                ref={previewRef}
                className="flex flex-col items-center justify-center py-16 px-8 gap-6"
                style={FIGMA_PREVIEW_VARS}
              >
                <div className="text-center mb-2">
                  <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground/40 mb-1">Component Preview</p>
                  <p className="text-xs text-muted-foreground/60">Isolated on canvas — built from your tokens</p>
                </div>

                <Combobox
                  options={FRAMEWORKS}
                  placeholder="Select framework..."
                  searchPlaceholder="Search framework..."
                  emptyText="No framework found."
                  value={selected}
                  onChange={setSelected}
                  portalContainer={previewRef.current}
                />

                {selected && (
                  <p className="text-xs text-muted-foreground">
                    Selected: <code className="font-mono text-foreground">{selected}</code>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Canvas footer — token highlight overlay */}
          <div className="border-t border-border bg-background/80 px-6 py-3 flex items-center gap-4">
            <p className="text-[11px] text-muted-foreground/60">
              Component rendered using <span className="font-semibold text-foreground">{COMBOBOX_TOKENS.length} design tokens</span> from <code className="font-mono">globals.css</code>
            </p>
            {driftedTokens.length > 0 && (
              <p className="text-[11px] text-amber-500">
                {driftedTokens.length} of those tokens have drift vs standard shadcn Figma
              </p>
            )}
          </div>
        </div>

        {/* Analysis panel */}
        <aside className="w-72 flex-shrink-0 border-l border-border overflow-y-auto bg-card">

          {/* Tokens section */}
          <div className="p-4 border-b border-border">
            <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground/50 mb-3">
              Tokens used ({COMBOBOX_TOKENS.length})
            </p>
            <div className="space-y-0.5">
              {COMBOBOX_TOKENS.map((name) => (
                <TokenUsageRow key={name} name={name} />
              ))}
            </div>
          </div>

          {/* Hardcoded values section */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground/50">
                Hardcoded values ({COMBOBOX_HARDCODED.length})
              </p>
              <span className="text-[10px] text-red-400 font-semibold">needs tokens</span>
            </div>
            <div className="space-y-2">
              {COMBOBOX_HARDCODED.map((item) => (
                <HardcodedRow key={`${item.location}-${item.property}`} item={item} />
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                These hardcoded values should be extracted to CSS custom properties so they can be
                tracked in Figma and managed as part of the design system.
              </p>
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}
