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

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import type { ToolDefinition, ToolHandler, SystemixEvent, SystemixEventType } from "../types.js";
import { dualWriteEvent } from "../supabase-client.js";

const EVENTS_DIR = ".systemix/events";
const SYNC_LOG_PATH = ".systemix/sync-log.json";

const VALID_EVENT_TYPES: SystemixEventType[] = [
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
// Sync-log entry shape
// ---------------------------------------------------------------------------

interface SyncLogEntry {
  timestamp: string;
  type: string;
  agent: string;
  summary: string;
}

// ---------------------------------------------------------------------------
// emit_event
// ---------------------------------------------------------------------------

export const emitEventDefinition: ToolDefinition = {
  name: "emit_event",
  description:
    "Emit a structured event to the Systemix dashboard. Writes a JSON file to " +
    ".systemix/events/ (picked up by the SSE endpoint) and appends a compact entry " +
    "to .systemix/sync-log.json. Use this from skills to signal progress, completion, or errors.",
  inputSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: VALID_EVENT_TYPES,
        description:
          "Event type. One of: tool_call | file_read | file_write | thinking | " +
          "agent_start | agent_complete | agent_error | hitl_requested | hitl_resolved | " +
          "sync_complete | deploy_complete",
      },
      agent: {
        type: "string",
        description: "Name of the agent or skill emitting this event (e.g. 'sync-to-figma').",
      },
      data: {
        type: "object",
        description:
          "Arbitrary JSON payload — token counts, drift details, file paths, etc. " +
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

export const emitEventHandler: ToolHandler<{
  type: string;
  agent: string;
  data: Record<string, unknown>;
  runId?: string;
}> = async (args, projectRoot) => {
  // Validate type
  if (!VALID_EVENT_TYPES.includes(args.type as SystemixEventType)) {
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

  const event: SystemixEvent = {
    id: eventId,
    timestamp,
    type: args.type as SystemixEventType,
    agent: args.agent,
    data: args.data,
    ...(args.runId !== undefined && { runId: args.runId }),
  };

  fs.writeFileSync(filePath, JSON.stringify(event, null, 2) + "\n", "utf-8");

  // Dual-write to Supabase (best-effort, fire-and-forget)
  void dualWriteEvent({
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
    let entries: SyncLogEntry[] = [];

    if (fs.existsSync(syncLogFile)) {
      const raw = fs.readFileSync(syncLogFile, "utf-8");
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          entries = parsed as SyncLogEntry[];
        }
      } catch {
        // malformed sync-log — start fresh
        entries = [];
      }
    }

    const summary =
      typeof args.data.summary === "string"
        ? args.data.summary
        : typeof args.data.message === "string"
        ? args.data.message
        : args.type;

    entries.push({ timestamp, type: args.type, agent: args.agent, summary });
    fs.writeFileSync(syncLogFile, JSON.stringify(entries, null, 2) + "\n", "utf-8");
    syncLogUpdated = true;
  } catch {
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

// ---------------------------------------------------------------------------
// list_events
// ---------------------------------------------------------------------------

export const listEventsDefinition: ToolDefinition = {
  name: "list_events",
  description:
    "List events from .systemix/events/. Returns events sorted by timestamp descending, " +
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

export const listEventsHandler: ToolHandler<{
  agent?: string;
  type?: string;
  limit?: number;
}> = async (args, projectRoot) => {
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
  const events: SystemixEvent[] = [];

  for (const file of files) {
    const filePath = path.join(eventsDir, file);
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw) as SystemixEvent;
      events.push(parsed);
    } catch {
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
