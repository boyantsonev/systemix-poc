/**
 * variables.ts — design token data for the workspace
 *
 * "code" values come from globals.css (source of truth in this repo).
 * "figma" values come from the shadcn Figma community file variables.
 *   → null means "not yet fetched" (pending Figma URL)
 *   → undefined means "not present in Figma" (custom token)
 *
 * drift: 'match' | 'drifted' | 'custom' | 'missing' | 'pending'
 */

export type DriftStatus = "match" | "drifted" | "custom" | "missing" | "pending";
export type TokenType = "color" | "dimension" | "string" | "duration" | "shadow";
export type TokenGroup =
  | "semantic"
  | "sidebar"
  | "status"
  | "agent"
  | "typography"
  | "spacing"
  | "radius"
  | "shadow"
  | "animation";

export type DesignToken = {
  name: string; // CSS var name without --
  group: TokenGroup;
  type: TokenType;
  codeValue: string; // value in globals.css
  figmaValue: string | null; // null = pending, undefined = not in Figma
  figmaName?: string; // Figma variable name if different
  drift: DriftStatus;
  note?: string;
};

// ── Semantic (core shadcn tokens) ────────────────────────────────────────────
// Standard shadcn baseline (new-york, default radius 0.625rem, pure white bg)
// vs this repo's "Nova" customisation

// Real Figma values from verolab shadcn-ui kit (node 17085:197681, fetched 2026-04-06)
// Figma uses base/* variable names — mapped to our CSS custom properties below.
// Note: this kit uses black borders (#000000) and yellow accent (#facc15) — intentional stylistic choices.
const SEMANTIC: DesignToken[] = [
  { name: "background",              group: "semantic", type: "color",     codeValue: "oklch(98% 0.002 250)",   figmaValue: "#fafafa",      drift: "match",   note: "Figma: base/background — very close" },
  { name: "foreground",              group: "semantic", type: "color",     codeValue: "oklch(0.145 0 0)",       figmaValue: "#000000",      drift: "drifted", note: "Figma: base/foreground — pure black vs dark gray" },
  { name: "card",                    group: "semantic", type: "color",     codeValue: "oklch(100% 0 0)",        figmaValue: null,           drift: "pending", note: "Not mapped in Figma kit" },
  { name: "card-foreground",         group: "semantic", type: "color",     codeValue: "oklch(0.145 0 0)",       figmaValue: null,           drift: "pending" },
  { name: "popover",                 group: "semantic", type: "color",     codeValue: "oklch(1 0 0)",           figmaValue: "#ffffff",      drift: "match",   note: "Figma: base/popover" },
  { name: "popover-foreground",      group: "semantic", type: "color",     codeValue: "oklch(0.145 0 0)",       figmaValue: null,           drift: "pending" },
  { name: "primary",                 group: "semantic", type: "color",     codeValue: "oklch(0.205 0 0)",       figmaValue: "#000000",      drift: "drifted", note: "Figma: base/primary — pure black vs #353535" },
  { name: "primary-foreground",      group: "semantic", type: "color",     codeValue: "oklch(0.985 0 0)",       figmaValue: "#ffffff",      drift: "match",   note: "Figma: base/primary-foreground" },
  { name: "secondary",               group: "semantic", type: "color",     codeValue: "oklch(0.97 0 0)",        figmaValue: null,           drift: "pending" },
  { name: "secondary-foreground",    group: "semantic", type: "color",     codeValue: "oklch(0.205 0 0)",       figmaValue: null,           drift: "pending" },
  { name: "muted",                   group: "semantic", type: "color",     codeValue: "oklch(96% 0.003 250)",   figmaValue: "#f5f5f5",      drift: "drifted", note: "Figma: base/muted — ours has cool blue tint" },
  { name: "muted-foreground",        group: "semantic", type: "color",     codeValue: "oklch(0.5 0 0)",         figmaValue: "#525252",      drift: "drifted", note: "Figma: base/muted-foreground — #808080 vs #525252" },
  { name: "accent",                  group: "semantic", type: "color",     codeValue: "oklch(0.97 0 0)",        figmaValue: "#facc15",      drift: "drifted", note: "⚠ CRITICAL — Figma: base/accent — bright yellow vs near-white. Selected state looks completely different." },
  { name: "accent-foreground",       group: "semantic", type: "color",     codeValue: "oklch(0.205 0 0)",       figmaValue: "#000000",      drift: "drifted", note: "Figma: base/accent-foreground — pure black vs dark gray" },
  { name: "destructive",             group: "semantic", type: "color",     codeValue: "oklch(0.577 0.245 27.325)", figmaValue: null,        drift: "pending" },
  { name: "destructive-foreground",  group: "semantic", type: "color",     codeValue: "oklch(98% 0 0)",         figmaValue: null,           drift: "pending" },
  { name: "border",                  group: "semantic", type: "color",     codeValue: "oklch(88% 0.005 250)",   figmaValue: "#000000",      drift: "drifted", note: "⚠ CRITICAL — Figma: base/border — pure black vs light gray. All borders look completely different." },
  { name: "input",                   group: "semantic", type: "color",     codeValue: "oklch(0.922 0 0)",       figmaValue: "#000000",      drift: "drifted", note: "⚠ CRITICAL — Figma: base/input — pure black (used as border) vs light gray" },
  { name: "ring",                    group: "semantic", type: "color",     codeValue: "oklch(0.708 0 0)",       figmaValue: null,           drift: "pending" },
  { name: "radius",                  group: "semantic", type: "dimension", codeValue: "0.5rem (8px)",           figmaValue: "0 (sharp)",    drift: "drifted", note: "Figma: rounded-md=0, rounded-sm=0. Kit uses sharp corners. Our radius=8px." },
  { name: "font-sans",               group: "semantic", type: "string",    codeValue: "Inter",                  figmaValue: "Instrument Sans", drift: "drifted", note: "Figma: font/font-sans — different typeface entirely" },
];

// ── Sidebar tokens (shadcn sidebar extension) ─────────────────────────────────
const SIDEBAR: DesignToken[] = [
  { name: "sidebar",                       group: "sidebar", type: "color", codeValue: "oklch(0.985 0 0)",   figmaValue: "oklch(0.985 0 0)",   drift: "match" },
  { name: "sidebar-foreground",            group: "sidebar", type: "color", codeValue: "oklch(0.145 0 0)",   figmaValue: "oklch(0.145 0 0)",   drift: "match" },
  { name: "sidebar-primary",               group: "sidebar", type: "color", codeValue: "oklch(0.205 0 0)",   figmaValue: "oklch(0.205 0 0)",   drift: "match" },
  { name: "sidebar-primary-foreground",    group: "sidebar", type: "color", codeValue: "oklch(0.985 0 0)",   figmaValue: "oklch(0.985 0 0)",   drift: "match" },
  { name: "sidebar-accent",                group: "sidebar", type: "color", codeValue: "oklch(0.97 0 0)",    figmaValue: "oklch(0.97 0 0)",    drift: "match" },
  { name: "sidebar-accent-foreground",     group: "sidebar", type: "color", codeValue: "oklch(0.205 0 0)",   figmaValue: "oklch(0.205 0 0)",   drift: "match" },
  { name: "sidebar-border",                group: "sidebar", type: "color", codeValue: "oklch(0.922 0 0)",   figmaValue: "oklch(0.922 0 0)",   drift: "match" },
  { name: "sidebar-ring",                  group: "sidebar", type: "color", codeValue: "oklch(0.708 0 0)",   figmaValue: "oklch(0.708 0 0)",   drift: "match" },
];

// ── Status / state tokens (custom — not in shadcn Figma) ──────────────────────
const STATUS: DesignToken[] = [
  { name: "color-synced",          group: "status", type: "color", codeValue: "oklch(68% 0.16 160)",        figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "color-drifted",         group: "status", type: "color", codeValue: "oklch(72% 0.18 75)",         figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "color-stale",           group: "status", type: "color", codeValue: "oklch(60% 0.12 30)",         figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "color-new",             group: "status", type: "color", codeValue: "oklch(65% 0.17 240)",        figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "color-error",           group: "status", type: "color", codeValue: "oklch(62% 0.22 25)",         figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "color-warning",         group: "status", type: "color", codeValue: "oklch(75% 0.18 80)",         figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "color-info",            group: "status", type: "color", codeValue: "oklch(65% 0.15 245)",        figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "color-synced-surface",  group: "status", type: "color", codeValue: "oklch(68% 0.16 160 / 0.10)",figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "color-drifted-surface", group: "status", type: "color", codeValue: "oklch(72% 0.18 75 / 0.10)", figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "color-error-surface",   group: "status", type: "color", codeValue: "oklch(62% 0.22 25 / 0.10)", figmaValue: undefined as unknown as null, drift: "custom" },
];

// ── Agent tokens (custom) ─────────────────────────────────────────────────────
const AGENT: DesignToken[] = [
  { name: "agent-ada",          group: "agent", type: "color", codeValue: "oklch(68% 0.18 280)", figmaValue: undefined as unknown as null, drift: "custom", note: "Figma→Code agent" },
  { name: "agent-flux",         group: "agent", type: "color", codeValue: "oklch(70% 0.16 185)", figmaValue: undefined as unknown as null, drift: "custom", note: "Token Sync agent" },
  { name: "agent-scout",        group: "agent", type: "color", codeValue: "oklch(72% 0.18 75)",  figmaValue: undefined as unknown as null, drift: "custom", note: "Drift Detector" },
  { name: "agent-prism",        group: "agent", type: "color", codeValue: "oklch(68% 0.20 350)", figmaValue: undefined as unknown as null, drift: "custom", note: "Component Themer" },
  { name: "agent-echo",         group: "agent", type: "color", codeValue: "oklch(65% 0.17 240)", figmaValue: undefined as unknown as null, drift: "custom", note: "Doc Sync" },
  { name: "agent-sage",         group: "agent", type: "color", codeValue: "oklch(68% 0.16 160)", figmaValue: undefined as unknown as null, drift: "custom", note: "Storybook" },
  { name: "agent-ship",         group: "agent", type: "color", codeValue: "oklch(60% 0.08 240)", figmaValue: undefined as unknown as null, drift: "custom", note: "Deploy" },
];

// ── Typography ────────────────────────────────────────────────────────────────
const TYPOGRAPHY: DesignToken[] = [
  { name: "font-size-2xs",  group: "typography", type: "dimension", codeValue: "0.6875rem (11px)", figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "font-size-xs",   group: "typography", type: "dimension", codeValue: "0.75rem (12px)",   figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "font-size-sm",   group: "typography", type: "dimension", codeValue: "0.8125rem (13px)", figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "font-size-base", group: "typography", type: "dimension", codeValue: "0.875rem (14px)",  figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "font-size-md",   group: "typography", type: "dimension", codeValue: "1rem (16px)",      figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "font-size-lg",   group: "typography", type: "dimension", codeValue: "1.125rem (18px)",  figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "font-size-xl",   group: "typography", type: "dimension", codeValue: "1.25rem (20px)",   figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "font-size-2xl",  group: "typography", type: "dimension", codeValue: "1.5rem (24px)",    figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "font-size-3xl",  group: "typography", type: "dimension", codeValue: "1.875rem (30px)",  figmaValue: undefined as unknown as null, drift: "custom" },
];

// ── Spacing ───────────────────────────────────────────────────────────────────
const SPACING: DesignToken[] = [
  { name: "space-1",  group: "spacing", type: "dimension", codeValue: "0.25rem (4px)",  figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "space-2",  group: "spacing", type: "dimension", codeValue: "0.5rem (8px)",   figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "space-3",  group: "spacing", type: "dimension", codeValue: "0.75rem (12px)", figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "space-4",  group: "spacing", type: "dimension", codeValue: "1rem (16px)",    figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "space-6",  group: "spacing", type: "dimension", codeValue: "1.5rem (24px)",  figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "space-8",  group: "spacing", type: "dimension", codeValue: "2rem (32px)",    figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "space-12", group: "spacing", type: "dimension", codeValue: "3rem (48px)",    figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "space-16", group: "spacing", type: "dimension", codeValue: "4rem (64px)",    figmaValue: undefined as unknown as null, drift: "custom" },
];

// ── Animation ─────────────────────────────────────────────────────────────────
const ANIMATION: DesignToken[] = [
  { name: "duration-instant", group: "animation", type: "duration", codeValue: "50ms",  figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "duration-fast",    group: "animation", type: "duration", codeValue: "100ms", figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "duration-normal",  group: "animation", type: "duration", codeValue: "200ms", figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "duration-slow",    group: "animation", type: "duration", codeValue: "350ms", figmaValue: undefined as unknown as null, drift: "custom" },
  { name: "duration-slower",  group: "animation", type: "duration", codeValue: "500ms", figmaValue: undefined as unknown as null, drift: "custom" },
];

// ── All tokens ────────────────────────────────────────────────────────────────
export const ALL_TOKENS: DesignToken[] = [
  ...SEMANTIC,
  ...SIDEBAR,
  ...STATUS,
  ...AGENT,
  ...TYPOGRAPHY,
  ...SPACING,
  ...ANIMATION,
];

export const TOKEN_GROUPS: { id: TokenGroup; label: string; description: string }[] = [
  { id: "semantic",    label: "Semantic Colors",   description: "Core shadcn/ui variables — mapped to Figma" },
  { id: "sidebar",     label: "Sidebar",           description: "shadcn sidebar extension variables" },
  { id: "status",      label: "Status",            description: "Synced, drifted, error states — custom" },
  { id: "agent",       label: "Agent Colors",      description: "Per-agent identity colors — custom" },
  { id: "typography",  label: "Typography Scale",  description: "Font size scale — custom" },
  { id: "spacing",     label: "Spacing",           description: "4px base grid scale — custom" },
  { id: "animation",   label: "Animation",         description: "Duration + easing tokens — custom" },
];

// Tokens used by the shadcn Combobox component
export const COMBOBOX_TOKENS: string[] = [
  "background", "foreground",
  "border", "input", "ring",
  "popover", "popover-foreground",
  "primary", "primary-foreground",
  "accent", "accent-foreground",
  "muted", "muted-foreground",
  "radius",
];

// Hardcoded values detected in shadcn's combobox implementation
export const COMBOBOX_HARDCODED = [
  { location: "Button trigger", property: "width", value: "w-[200px]", suggestion: "var(--combobox-width)" },
  { location: "Command item padding", property: "padding", value: "py-1.5 pl-8 pr-4", suggestion: "use --space-* tokens" },
  { location: "Check icon", property: "size", value: "h-4 w-4 (16px)", suggestion: "use --icon-sm token" },
  { location: "ChevronsUpDown icon", property: "size", value: "h-4 w-4 ml-2 (16px)", suggestion: "use --icon-sm token" },
  { location: "Popover content", property: "width", value: "w-[200px]", suggestion: "inherit from trigger" },
];
