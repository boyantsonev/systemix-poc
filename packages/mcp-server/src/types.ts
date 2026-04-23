// Shared TypeScript types for the Systemix MCP server

// ---------------------------------------------------------------------------
// Tool shape
// ---------------------------------------------------------------------------

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export type ToolHandler<TArgs = Record<string, unknown>> = (
  args: TArgs,
  projectRoot: string
) => Promise<ToolResult>;

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

// ---------------------------------------------------------------------------
// .systemix/project-context.json
// ---------------------------------------------------------------------------

export interface ProjectContext {
  version: string;
  project: {
    name: string;
    description: string;
  };
  figma: {
    fileKey: string | null;
    fileName: string | null;
    fileUrl: string | null;
    modeIds: Record<string, string> | null;
    variableIds: Record<string, string> | null;
  };
  codebase: {
    root: string;
    srcDir: string;
    componentsDir: string;
    stylesFile: string;
    tokensFile: string;
    manifestFile: string;
  };
  brand: {
    defaultSlug: string;
    themesDir: string;
  };
  pipeline: {
    skillsDir: string;
    handoffsDir: string;
    cacheDir: string;
    runsDir: string;
  };
  deploy: {
    previewUrl: string;
    devUrl: string;
  };
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// .systemix/tokens.bridge.json
// ---------------------------------------------------------------------------

export interface TokenBridgeMeta {
  source: string;
  generatedAt: string;
  converter: string;
  note: string;
}

export interface TokenEntry {
  $type: string;
  $value: string;
  figma?: {
    variableName?: string;
    collection?: string;
    cssVar?: string;
    syncStatus?: string;
    hex?: string;
    rgba?: { r: number; g: number; b: number; a: number };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface TokenBridge {
  $schema?: string;
  _meta: TokenBridgeMeta;
  [group: string]: unknown;
}

// ---------------------------------------------------------------------------
// .systemix/events/
// ---------------------------------------------------------------------------

export type SystemixEventType =
  | "tool_call"
  | "file_read"
  | "file_write"
  | "thinking"
  | "agent_start"
  | "agent_complete"
  | "agent_error"
  | "hitl_requested"
  | "hitl_resolved"
  | "sync_complete"
  | "deploy_complete";

export interface SystemixEvent {
  id: string;
  timestamp: string;
  type: SystemixEventType;
  agent: string;
  data: Record<string, unknown>;
  runId?: string;
}

// ---------------------------------------------------------------------------
// .systemix/hitl-queue.json
// ---------------------------------------------------------------------------

export type HitlStatus = "pending" | "approved" | "rejected" | "skipped";

export type HitlTaskType = "approve" | "reject" | "input" | "review";

export type HitlPriority = "critical" | "high" | "normal" | "low";

export interface HitlTask {
  id: string;           // uuid
  createdAt: string;    // ISO
  resolvedAt?: string;
  agent: string;
  type: HitlTaskType;
  priority: HitlPriority;
  title: string;
  description: string;
  payload?: unknown;    // agent-specific data
  status: HitlStatus;
  resolution?: {
    action: "approved" | "rejected" | "skipped";
    note?: string;
    resolvedBy?: string;
  };
}

export interface HitlQueue {
  tasks: HitlTask[];
}

// ---------------------------------------------------------------------------
// Pre-fetch layer (BAST-71)
// ---------------------------------------------------------------------------

export interface PrefetchScope {
  fileId: string;
  nodeId?: string;
  depth?: number; // default 3
  include?: Array<"variables" | "styles" | "components">;
  cacheKey?: string;
}

export interface PrefetchPayload {
  fileId: string;
  nodeId?: string;
  fetchedAt: string;
  fromCache: boolean;
  data: {
    designContext?: unknown;
    variables?: unknown;
    styles?: unknown;
  };
}
