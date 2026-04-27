/**
 * bridge.ts — get_token_bridge / diff_token_bridge / systemix_diff_tokens
 *
 * Reads .systemix/tokens.bridge.json.
 * Used by skills to inspect current token state before push/sync operations.
 */
import type { ToolDefinition, ToolHandler } from "../types.js";
export declare const getTokenBridgeDefinition: ToolDefinition;
export declare const getTokenBridgeHandler: ToolHandler<{
    collection?: string;
    status?: "synced" | "drifted" | "new" | "stale";
    includeMetadata?: boolean;
}>;
export declare const diffTokenBridgeDefinition: ToolDefinition;
export declare const diffTokenBridgeHandler: ToolHandler<{
    previousSnapshot: Record<string, unknown>;
}>;
export declare const systemixDiffTokensDefinition: ToolDefinition;
export declare const systemixDiffTokensHandler: ToolHandler<{
    cssFile?: string;
}>;
//# sourceMappingURL=bridge.d.ts.map