// Shared types between code.ts (plugin sandbox) and ui.ts (iframe)

export interface ExtractedVariable {
  figmaName: string;       // "base/accent"
  cssName: string;         // "--accent"
  group: string;           // "base"
  type: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN";
  values: Record<string, string>; // { "Light": "#facc15", "Dark": "#ca8a04" }
}

export interface ExtractedCollection {
  name: string;            // "Semantic"
  modes: string[];         // ["Light", "Dark"]
  variables: ExtractedVariable[];
}

export interface BridgeToken {
  $type: "color" | "dimension" | "string" | "boolean";
  $value: string;
  $figmaName: string;
  $collection: string;
  $mode: string;
}

export type BridgeJSON = Record<string, BridgeToken>;

export interface PluginSettings {
  workspaceUrl?: string;   // e.g. "http://localhost:3001"
  storybookUrl?: string;   // e.g. "http://localhost:6006"
  vercelUrl?: string;      // e.g. "https://myproject.vercel.app"
}

// ── Messages: plugin sandbox → UI ────────────────────────────────────────────

export type PluginMessage =
  | { type: "ready" }
  | { type: "collections"; payload: ExtractedCollection[]; totalCount: number }
  | { type: "error"; message: string }
  | { type: "status"; message: string }
  | { type: "settings"; settings: PluginSettings };

// ── Messages: UI → plugin sandbox ────────────────────────────────────────────

export type UIMessage =
  | { type: "extract" }
  | { type: "notify"; message: string; error?: boolean }
  | { type: "close" }
  | { type: "resize"; width: number; height: number }
  | { type: "open-url"; url: string }
  | { type: "save-settings"; settings: PluginSettings }
  | { type: "load-settings" };
