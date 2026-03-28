// AGENT-WRITTEN — tokens.ts
// Updated by: token-sync agent

export type SyncStatus = "synced" | "drift" | "stale" | "new";
export type TokenCollection = "color" | "spacing" | "typography" | "radius" | "shadow";

export type Token = {
  name: string;
  value: string;
  figmaVariable: string;
  syncStatus: SyncStatus;
  collection: TokenCollection;
  description?: string;
};

export type TokenRegistry = {
  tokens: Token[];
  lastSynced: string;
  figmaFileKey: string;
  connectionStatus: "connected" | "disconnected";
};

export const tokenRegistry: TokenRegistry = {
  lastSynced: "2026-02-26T09:45:00Z",
  figmaFileKey: "abc123xyz",
  connectionStatus: "connected",
  tokens: [
    // Colors — Primitive
    { name: "--color-purple-500", value: "#a855f7", figmaVariable: "color/purple/500", syncStatus: "synced", collection: "color" },
    { name: "--color-purple-400", value: "#c084fc", figmaVariable: "color/purple/400", syncStatus: "synced", collection: "color" },
    { name: "--color-teal-500", value: "#14b8a6", figmaVariable: "color/teal/500", syncStatus: "synced", collection: "color" },
    { name: "--color-teal-400", value: "#2dd4bf", figmaVariable: "color/teal/400", syncStatus: "synced", collection: "color" },
    { name: "--color-amber-500", value: "#f59e0b", figmaVariable: "color/amber/500", syncStatus: "synced", collection: "color" },
    { name: "--color-amber-400", value: "#fbbf24", figmaVariable: "color/amber/400", syncStatus: "synced", collection: "color" },
    { name: "--color-red-500", value: "#ef4444", figmaVariable: "color/red/500", syncStatus: "synced", collection: "color" },
    { name: "--color-gray-950", value: "#030712", figmaVariable: "color/gray/950", syncStatus: "synced", collection: "color" },
    { name: "--color-gray-900", value: "#111827", figmaVariable: "color/gray/900", syncStatus: "synced", collection: "color" },
    { name: "--color-gray-800", value: "#1f2937", figmaVariable: "color/gray/800", syncStatus: "synced", collection: "color" },
    { name: "--color-gray-700", value: "#374151", figmaVariable: "color/gray/700", syncStatus: "synced", collection: "color" },
    // Colors — Semantic
    { name: "--color-primary", value: "var(--color-purple-500)", figmaVariable: "semantic/color/primary", syncStatus: "synced", collection: "color" },
    { name: "--color-secondary", value: "var(--color-teal-500)", figmaVariable: "semantic/color/secondary", syncStatus: "drift", collection: "color", description: "Figma uses #0d9488, code has #14b8a6" },
    { name: "--color-accent", value: "var(--color-amber-500)", figmaVariable: "semantic/color/accent", syncStatus: "synced", collection: "color" },
    { name: "--color-success", value: "#22c55e", figmaVariable: "semantic/color/success", syncStatus: "synced", collection: "color" },
    { name: "--color-danger", value: "var(--color-red-500)", figmaVariable: "semantic/color/danger", syncStatus: "synced", collection: "color" },
    { name: "--color-background", value: "#030712", figmaVariable: "semantic/color/background", syncStatus: "synced", collection: "color" },
    { name: "--color-surface", value: "#111827", figmaVariable: "semantic/color/surface", syncStatus: "synced", collection: "color" },
    { name: "--color-border", value: "rgba(255,255,255,0.1)", figmaVariable: "semantic/color/border", syncStatus: "stale", collection: "color", description: "Last synced 14 days ago" },
    // Spacing
    { name: "--spacing-1", value: "0.25rem", figmaVariable: "spacing/1", syncStatus: "synced", collection: "spacing" },
    { name: "--spacing-2", value: "0.5rem", figmaVariable: "spacing/2", syncStatus: "synced", collection: "spacing" },
    { name: "--spacing-3", value: "0.75rem", figmaVariable: "spacing/3", syncStatus: "synced", collection: "spacing" },
    { name: "--spacing-4", value: "1rem", figmaVariable: "spacing/4", syncStatus: "synced", collection: "spacing" },
    { name: "--spacing-5", value: "1.25rem", figmaVariable: "spacing/5", syncStatus: "synced", collection: "spacing" },
    { name: "--spacing-6", value: "1.5rem", figmaVariable: "spacing/6", syncStatus: "synced", collection: "spacing" },
    { name: "--spacing-8", value: "2rem", figmaVariable: "spacing/8", syncStatus: "synced", collection: "spacing" },
    { name: "--spacing-10", value: "2.5rem", figmaVariable: "spacing/10", syncStatus: "synced", collection: "spacing" },
    { name: "--spacing-12", value: "3rem", figmaVariable: "spacing/12", syncStatus: "synced", collection: "spacing" },
    { name: "--spacing-16", value: "4rem", figmaVariable: "spacing/16", syncStatus: "new", collection: "spacing", description: "Added in Figma, not yet in codebase" },
    // Typography
    { name: "--font-size-xs", value: "0.75rem", figmaVariable: "typography/size/xs", syncStatus: "synced", collection: "typography" },
    { name: "--font-size-sm", value: "0.875rem", figmaVariable: "typography/size/sm", syncStatus: "synced", collection: "typography" },
    { name: "--font-size-base", value: "1rem", figmaVariable: "typography/size/base", syncStatus: "synced", collection: "typography" },
    { name: "--font-size-lg", value: "1.125rem", figmaVariable: "typography/size/lg", syncStatus: "synced", collection: "typography" },
    { name: "--font-size-xl", value: "1.25rem", figmaVariable: "typography/size/xl", syncStatus: "synced", collection: "typography" },
    { name: "--font-size-2xl", value: "1.5rem", figmaVariable: "typography/size/2xl", syncStatus: "synced", collection: "typography" },
    { name: "--font-size-3xl", value: "1.875rem", figmaVariable: "typography/size/3xl", syncStatus: "drift", collection: "typography", description: "Figma: 2rem, Code: 1.875rem" },
    { name: "--font-size-4xl", value: "2.25rem", figmaVariable: "typography/size/4xl", syncStatus: "synced", collection: "typography" },
    { name: "--line-height-tight", value: "1.25", figmaVariable: "typography/leading/tight", syncStatus: "synced", collection: "typography" },
    { name: "--line-height-normal", value: "1.5", figmaVariable: "typography/leading/normal", syncStatus: "synced", collection: "typography" },
    { name: "--line-height-relaxed", value: "1.625", figmaVariable: "typography/leading/relaxed", syncStatus: "synced", collection: "typography" },
    // Radius
    { name: "--radius-sm", value: "0.25rem", figmaVariable: "radius/sm", syncStatus: "synced", collection: "radius" },
    { name: "--radius-md", value: "0.375rem", figmaVariable: "radius/md", syncStatus: "synced", collection: "radius" },
    { name: "--radius-lg", value: "0.5rem", figmaVariable: "radius/lg", syncStatus: "synced", collection: "radius" },
    { name: "--radius-xl", value: "0.75rem", figmaVariable: "radius/xl", syncStatus: "synced", collection: "radius" },
    { name: "--radius-2xl", value: "1rem", figmaVariable: "radius/2xl", syncStatus: "new", collection: "radius" },
    { name: "--radius-full", value: "9999px", figmaVariable: "radius/full", syncStatus: "synced", collection: "radius" },
  ],
};
