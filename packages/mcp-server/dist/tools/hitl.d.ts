/**
 * hitl.ts — push_hitl_task / resolve_hitl_task / list_hitl_tasks
 *
 * Human-in-the-loop queue backed by .systemix/hitl-queue.json.
 * Skills push tasks when they need human approval before proceeding.
 * The dashboard (or a human via CLI) resolves tasks.
 *
 * Events are emitted to .systemix/events/ on push and resolve.
 */
import type { ToolDefinition, ToolHandler } from "../types.js";
export declare const pushHitlTaskDefinition: ToolDefinition;
export declare const pushHitlTaskHandler: ToolHandler<{
    agent: string;
    type: "approve" | "reject" | "input" | "review";
    priority: "critical" | "high" | "normal" | "low";
    title: string;
    description: string;
    payload?: unknown;
}>;
export declare const resolveHitlTaskDefinition: ToolDefinition;
export declare const resolveHitlTaskHandler: ToolHandler<{
    taskId: string;
    action: "approved" | "rejected" | "skipped";
    note?: string;
    resolvedBy?: string;
}>;
export declare const listHitlTasksDefinition: ToolDefinition;
export declare const listHitlTasksHandler: ToolHandler<{
    status?: "pending" | "approved" | "rejected" | "skipped";
    agent?: string;
    limit?: number;
}>;
//# sourceMappingURL=hitl.d.ts.map