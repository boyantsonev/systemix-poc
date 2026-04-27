/**
 * workflow.ts — get_workflow / list_workflows
 *
 * Reads workflow definitions from src/lib/data/workflows.ts by importing
 * the compiled JS or reading the raw source and parsing the exported data.
 *
 * Because the Next.js app is TypeScript-only and we can't import it directly
 * from a Node.js MCP server, we resolve the workflows in two ways:
 *   1. If a compiled JSON snapshot exists at .systemix/workflows.json, use that.
 *   2. Otherwise, dynamically require/import the compiled dist if available.
 *   3. As a fallback, parse the raw .ts file for the exported `workflows` array
 *      using a lightweight regex extraction (returns metadata only, no code).
 */
import type { ToolDefinition, ToolHandler } from "../types.js";
export declare const listWorkflowsDefinition: ToolDefinition;
export declare const listWorkflowsHandler: ToolHandler;
export declare const getWorkflowDefinition: ToolDefinition;
export declare const getWorkflowHandler: ToolHandler<{
    workflowId: string;
}>;
//# sourceMappingURL=workflow.d.ts.map