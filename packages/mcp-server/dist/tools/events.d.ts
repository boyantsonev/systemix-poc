/**
 * events.ts — emit_event + list_events
 *
 * emit_event: Writes event files to .systemix/events/ and appends a compact
 * entry to .systemix/sync-log.json. The Systemix dashboard SSE endpoint polls
 * .systemix/events/ and streams new events to connected clients in real time.
 *
 * list_events: Reads all event files and returns them filtered and sorted.
 *
 * Event file naming: <ISO-timestamp>-<6-char-uuid>.json
 */
import type { ToolDefinition, ToolHandler } from "../types.js";
export declare const emitEventDefinition: ToolDefinition;
export declare const emitEventHandler: ToolHandler<{
    type: string;
    agent: string;
    data: Record<string, unknown>;
    runId?: string;
}>;
export declare const listEventsDefinition: ToolDefinition;
export declare const listEventsHandler: ToolHandler<{
    agent?: string;
    type?: string;
    limit?: number;
}>;
//# sourceMappingURL=events.d.ts.map