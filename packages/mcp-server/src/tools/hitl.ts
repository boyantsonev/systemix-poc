/**
 * hitl.ts — push_hitl_task / resolve_hitl_task / list_hitl_tasks
 *
 * Human-in-the-loop queue backed by .systemix/hitl-queue.json.
 * Skills push tasks when they need human approval before proceeding.
 * The dashboard (or a human via CLI) resolves tasks.
 *
 * Events are emitted to .systemix/events/ on push and resolve.
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import type {
  ToolDefinition,
  ToolHandler,
  HitlTask,
  HitlQueue,
} from "../types.js";
import { dualWriteHitlTask, dualResolveHitlTask } from "../supabase-client.js";

const QUEUE_FILE = ".systemix/hitl-queue.json";
const EVENTS_DIR = ".systemix/events";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readQueue(filePath: string): HitlQueue {
  if (!fs.existsSync(filePath)) {
    return { tasks: [] };
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as HitlQueue;
}

/** Atomic write: write to a temp file then rename so readers never see partial data. */
function writeQueueAtomic(filePath: string, queue: HitlQueue): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(queue, null, 2) + "\n", "utf-8");
  fs.renameSync(tmp, filePath);
}

interface EventPayload {
  type: string;
  agent: string;
  data: Record<string, unknown>;
  timestamp: string;
}

function emitEvent(eventsDir: string, payload: EventPayload): void {
  fs.mkdirSync(eventsDir, { recursive: true });
  const id = crypto.randomUUID();
  const filename = `${Date.now()}-${id}.json`;
  const filePath = path.join(eventsDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2) + "\n", "utf-8");
}

// ---------------------------------------------------------------------------
// push_hitl_task
// ---------------------------------------------------------------------------

export const pushHitlTaskDefinition: ToolDefinition = {
  name: "push_hitl_task",
  description:
    "Add a task to the human-in-the-loop queue (.systemix/hitl-queue.json). " +
    "Call this from a skill when it needs human review or approval before proceeding " +
    "(e.g. before pushing 200+ tokens to Figma, before a destructive operation). " +
    "Returns the task ID and current queue length.",
  inputSchema: {
    type: "object",
    properties: {
      agent: {
        type: "string",
        description: "The agent or skill name that generated this task (e.g. 'sync-to-figma').",
      },
      type: {
        type: "string",
        enum: ["approve", "reject", "input", "review"],
        description: "Task type — what kind of human action is needed.",
      },
      priority: {
        type: "string",
        enum: ["critical", "high", "normal", "low"],
        description: "Task priority level.",
      },
      title: {
        type: "string",
        description: "Short task title shown in the dashboard.",
      },
      description: {
        type: "string",
        description:
          "Detailed description of what needs review and why. " +
          "Include diffs, counts, or risk assessment to help the human decide.",
      },
      payload: {
        description: "Optional agent-specific data (token counts, file paths, diff summaries, etc.).",
      },
    },
    required: ["agent", "type", "priority", "title", "description"],
  },
};

export const pushHitlTaskHandler: ToolHandler<{
  agent: string;
  type: "approve" | "reject" | "input" | "review";
  priority: "critical" | "high" | "normal" | "low";
  title: string;
  description: string;
  payload?: unknown;
}> = async (args, projectRoot) => {
  const filePath = path.join(projectRoot, QUEUE_FILE);
  const queue = readQueue(filePath);

  const task: HitlTask = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    agent: args.agent,
    type: args.type,
    priority: args.priority,
    title: args.title,
    description: args.description,
    status: "pending",
    ...(args.payload !== undefined && { payload: args.payload }),
  };

  queue.tasks.push(task);
  writeQueueAtomic(filePath, queue);

  // Dual-write to Supabase (best-effort, fire-and-forget)
  void dualWriteHitlTask({
    id: task.id,
    agent: task.agent,
    type: task.type,
    priority: task.priority,
    title: task.title,
    description: task.description,
    payload: task.payload,
    createdAt: task.createdAt,
  });

  // Emit hitl_requested event
  emitEvent(path.join(projectRoot, EVENTS_DIR), {
    type: "hitl_requested",
    agent: args.agent,
    data: { taskId: task.id, title: task.title, taskType: task.type, priority: task.priority },
    timestamp: task.createdAt,
  });

  const queueLength = queue.tasks.length;

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ taskId: task.id, queueLength }, null, 2),
      },
    ],
  };
};

// ---------------------------------------------------------------------------
// resolve_hitl_task
// ---------------------------------------------------------------------------

export const resolveHitlTaskDefinition: ToolDefinition = {
  name: "resolve_hitl_task",
  description:
    "Resolve a human-in-the-loop task in .systemix/hitl-queue.json. " +
    "Set action to 'approved', 'rejected', or 'skipped'. " +
    "Skills should check the resolution before proceeding with a destructive operation.",
  inputSchema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "Task ID returned by push_hitl_task.",
      },
      action: {
        type: "string",
        enum: ["approved", "rejected", "skipped"],
        description: "Resolution action.",
      },
      note: {
        type: "string",
        description: "Optional note explaining the decision.",
      },
      resolvedBy: {
        type: "string",
        description: "Who resolved the task (e.g. 'human', 'dashboard', 'auto').",
      },
    },
    required: ["taskId", "action"],
  },
};

export const resolveHitlTaskHandler: ToolHandler<{
  taskId: string;
  action: "approved" | "rejected" | "skipped";
  note?: string;
  resolvedBy?: string;
}> = async (args, projectRoot) => {
  const filePath = path.join(projectRoot, QUEUE_FILE);
  const queue = readQueue(filePath);

  const taskIndex = queue.tasks.findIndex((t) => t.id === args.taskId);
  if (taskIndex === -1) {
    return {
      content: [
        {
          type: "text",
          text: `Error: task ${args.taskId} not found in the HITL queue.`,
        },
      ],
      isError: true,
    };
  }

  const task = queue.tasks[taskIndex];

  if (task.status !== "pending") {
    return {
      content: [
        {
          type: "text",
          text: `Task ${args.taskId} is already resolved (status: ${task.status}).`,
        },
      ],
      isError: true,
    };
  }

  const resolvedAt = new Date().toISOString();

  const resolved: HitlTask = {
    ...task,
    status: args.action,
    resolvedAt,
    resolution: {
      action: args.action,
      note: args.note,
      resolvedBy: args.resolvedBy,
    },
  };

  queue.tasks[taskIndex] = resolved;
  writeQueueAtomic(filePath, queue);

  // Dual-write resolution to Supabase (best-effort, fire-and-forget)
  void dualResolveHitlTask(task.id, args.action, resolved.resolution, resolvedAt);

  // Emit hitl_resolved event
  emitEvent(path.join(projectRoot, EVENTS_DIR), {
    type: "hitl_resolved",
    agent: task.agent,
    data: { taskId: task.id, action: args.action },
    timestamp: resolvedAt,
  });

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ taskId: resolved.id, action: args.action, task: resolved }, null, 2),
      },
    ],
  };
};

// ---------------------------------------------------------------------------
// list_hitl_tasks
// ---------------------------------------------------------------------------

export const listHitlTasksDefinition: ToolDefinition = {
  name: "list_hitl_tasks",
  description:
    "List tasks in the HITL queue (.systemix/hitl-queue.json). " +
    "Filter by status or agent, sorted by createdAt descending with pending tasks first. " +
    "Returns tasks, total count, and pendingCount.",
  inputSchema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["pending", "approved", "rejected", "skipped"],
        description: "Filter by task status. Omit to return all statuses.",
      },
      agent: {
        type: "string",
        description: "Filter by agent name. Omit to return all agents.",
      },
      limit: {
        type: "number",
        description: "Maximum number of tasks to return (default 20).",
      },
    },
    required: [],
  },
};

export const listHitlTasksHandler: ToolHandler<{
  status?: "pending" | "approved" | "rejected" | "skipped";
  agent?: string;
  limit?: number;
}> = async (args, projectRoot) => {
  const filePath = path.join(projectRoot, QUEUE_FILE);
  const queue = readQueue(filePath);

  let tasks = queue.tasks;

  // Apply filters
  if (args.status) {
    tasks = tasks.filter((t) => t.status === args.status);
  }
  if (args.agent) {
    tasks = tasks.filter((t) => t.agent === args.agent);
  }

  const total = tasks.length;
  const pendingCount = queue.tasks.filter((t) => t.status === "pending").length;

  // Sort: pending first, then by createdAt descending
  tasks = tasks.slice().sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Apply limit (default 20)
  const limit = args.limit ?? 20;
  tasks = tasks.slice(0, limit);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ tasks, total, pendingCount }, null, 2),
      },
    ],
  };
};
