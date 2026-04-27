"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.listEventsHandler = exports.listEventsDefinition = exports.emitEventHandler = exports.emitEventDefinition = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const supabase_client_js_1 = require("../supabase-client.js");
const EVENTS_DIR = ".systemix/events";
const SYNC_LOG_PATH = ".systemix/sync-log.json";
const VALID_EVENT_TYPES = [
    "tool_call",
    "file_read",
    "file_write",
    "thinking",
    "agent_start",
    "agent_complete",
    "agent_error",
    "hitl_requested",
    "hitl_resolved",
    "sync_complete",
    "deploy_complete",
];
// ---------------------------------------------------------------------------
// emit_event
// ---------------------------------------------------------------------------
exports.emitEventDefinition = {
    name: "emit_event",
    description: "Emit a structured event to the Systemix dashboard. Writes a JSON file to " +
        ".systemix/events/ (picked up by the SSE endpoint) and appends a compact entry " +
        "to .systemix/sync-log.json. Use this from skills to signal progress, completion, or errors.",
    inputSchema: {
        type: "object",
        properties: {
            type: {
                type: "string",
                enum: VALID_EVENT_TYPES,
                description: "Event type. One of: tool_call | file_read | file_write | thinking | " +
                    "agent_start | agent_complete | agent_error | hitl_requested | hitl_resolved | " +
                    "sync_complete | deploy_complete",
            },
            agent: {
                type: "string",
                description: "Name of the agent or skill emitting this event (e.g. 'sync-to-figma').",
            },
            data: {
                type: "object",
                description: "Arbitrary JSON payload — token counts, drift details, file paths, etc. " +
                    "Include 'summary' or 'message' for a human-readable sync-log entry.",
            },
            runId: {
                type: "string",
                description: "Optional run/session ID for correlating events across a pipeline run.",
            },
        },
        required: ["type", "agent", "data"],
    },
};
const emitEventHandler = async (args, projectRoot) => {
    // Validate type
    if (!VALID_EVENT_TYPES.includes(args.type)) {
        return {
            content: [
                {
                    type: "text",
                    text: `Invalid event type: "${args.type}". Must be one of: ${VALID_EVENT_TYPES.join(", ")}`,
                },
            ],
            isError: true,
        };
    }
    const eventsDir = path.join(projectRoot, EVENTS_DIR);
    fs.mkdirSync(eventsDir, { recursive: true });
    const timestamp = new Date().toISOString();
    const shortId = crypto.randomUUID().replace(/-/g, "").slice(0, 6);
    const eventId = `${timestamp}-${shortId}`;
    const filename = `${eventId}.json`;
    const filePath = path.join(eventsDir, filename);
    const event = {
        id: eventId,
        timestamp,
        type: args.type,
        agent: args.agent,
        data: args.data,
        ...(args.runId !== undefined && { runId: args.runId }),
    };
    fs.writeFileSync(filePath, JSON.stringify(event, null, 2) + "\n", "utf-8");
    // Dual-write to Supabase (best-effort, fire-and-forget)
    void (0, supabase_client_js_1.dualWriteEvent)({
        id: event.id,
        type: event.type,
        agent: event.agent,
        data: event.data,
        runId: event.runId,
        timestamp: event.timestamp,
    });
    // Append compact entry to sync-log.json
    let syncLogUpdated = false;
    try {
        const syncLogFile = path.join(projectRoot, SYNC_LOG_PATH);
        let entries = [];
        if (fs.existsSync(syncLogFile)) {
            const raw = fs.readFileSync(syncLogFile, "utf-8");
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    entries = parsed;
                }
            }
            catch {
                // malformed sync-log — start fresh
                entries = [];
            }
        }
        const summary = typeof args.data.summary === "string"
            ? args.data.summary
            : typeof args.data.message === "string"
                ? args.data.message
                : args.type;
        entries.push({ timestamp, type: args.type, agent: args.agent, summary });
        fs.writeFileSync(syncLogFile, JSON.stringify(entries, null, 2) + "\n", "utf-8");
        syncLogUpdated = true;
    }
    catch {
        // Non-fatal — event file already written
    }
    const relativeFilePath = path.join(EVENTS_DIR, filename);
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({ eventId, filePath: relativeFilePath, syncLogUpdated }),
            },
        ],
    };
};
exports.emitEventHandler = emitEventHandler;
// ---------------------------------------------------------------------------
// list_events
// ---------------------------------------------------------------------------
exports.listEventsDefinition = {
    name: "list_events",
    description: "List events from .systemix/events/. Returns events sorted by timestamp descending, " +
        "optionally filtered by agent and/or type. Useful for inspecting recent pipeline activity.",
    inputSchema: {
        type: "object",
        properties: {
            agent: {
                type: "string",
                description: "Filter to events emitted by this agent name.",
            },
            type: {
                type: "string",
                enum: VALID_EVENT_TYPES,
                description: "Filter to events of this type.",
            },
            limit: {
                type: "number",
                description: "Maximum number of events to return (default: 50).",
            },
        },
        required: [],
    },
};
const listEventsHandler = async (args, projectRoot) => {
    const eventsDir = path.join(projectRoot, EVENTS_DIR);
    const limit = typeof args.limit === "number" && args.limit > 0 ? args.limit : 50;
    if (!fs.existsSync(eventsDir)) {
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ events: [], total: 0 }),
                },
            ],
        };
    }
    const files = fs.readdirSync(eventsDir).filter((f) => f.endsWith(".json"));
    const events = [];
    for (const file of files) {
        const filePath = path.join(eventsDir, file);
        try {
            const raw = fs.readFileSync(filePath, "utf-8");
            const parsed = JSON.parse(raw);
            events.push(parsed);
        }
        catch {
            // Skip malformed event files
        }
    }
    // Filter
    let filtered = events;
    if (args.agent) {
        filtered = filtered.filter((e) => e.agent === args.agent);
    }
    if (args.type) {
        filtered = filtered.filter((e) => e.type === args.type);
    }
    // Sort by timestamp desc
    filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const truncated = filtered.slice(0, limit);
    const total = filtered.length;
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({ events: truncated, total }),
            },
        ],
    };
};
exports.listEventsHandler = listEventsHandler;
//# sourceMappingURL=events.js.map