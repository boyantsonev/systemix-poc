#!/usr/bin/env node
"use strict";
/**
 * Systemix MCP Server
 *
 * A local Model Context Protocol server that gives Claude Code skills
 * structured read/write access to Systemix state files (.systemix/).
 *
 * Registered tools:
 *   context  — systemix_get_context, systemix_set_context, systemix_get_agent_state
 *   bridge   — get_token_bridge, diff_token_bridge, systemix_diff_tokens
 *   events   — emit_event, list_events
 *   hitl     — push_hitl_task, resolve_hitl_task, list_hitl_tasks
 *   workflow — list_workflows, get_workflow
 *
 * Usage:
 *   systemix-mcp --project-root /path/to/project
 *   # or via npx:
 *   npx systemix-mcp --project-root .
 *
 * The server communicates over stdio (MCP default transport).
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const context_js_1 = require("./tools/context.js");
const bridge_js_1 = require("./tools/bridge.js");
const events_js_1 = require("./tools/events.js");
const hitl_js_1 = require("./tools/hitl.js");
const workflow_js_1 = require("./tools/workflow.js");
// ---------------------------------------------------------------------------
// CLI args — parse --project-root
// ---------------------------------------------------------------------------
function getProjectRoot() {
    const args = process.argv.slice(2);
    const idx = args.indexOf("--project-root");
    if (idx !== -1 && args[idx + 1]) {
        return args[idx + 1];
    }
    // Fallback to CWD
    return process.cwd();
}
const PROJECT_ROOT = getProjectRoot();
// ---------------------------------------------------------------------------
// Tool registry
// ---------------------------------------------------------------------------
const tools = [
    context_js_1.getProjectContextDefinition,
    context_js_1.setProjectContextDefinition,
    context_js_1.getAgentStateDefinition,
    bridge_js_1.getTokenBridgeDefinition,
    bridge_js_1.diffTokenBridgeDefinition,
    bridge_js_1.systemixDiffTokensDefinition,
    events_js_1.emitEventDefinition,
    events_js_1.listEventsDefinition,
    hitl_js_1.pushHitlTaskDefinition,
    hitl_js_1.resolveHitlTaskDefinition,
    hitl_js_1.listHitlTasksDefinition,
    workflow_js_1.listWorkflowsDefinition,
    workflow_js_1.getWorkflowDefinition,
];
// Map tool name → handler, bound to projectRoot
const handlers = new Map([
    [context_js_1.getProjectContextDefinition.name, (a) => (0, context_js_1.getProjectContextHandler)(a, PROJECT_ROOT)],
    [context_js_1.setProjectContextDefinition.name, (a) => (0, context_js_1.setProjectContextHandler)(a, PROJECT_ROOT)],
    [context_js_1.getAgentStateDefinition.name, (a) => (0, context_js_1.getAgentStateHandler)(a, PROJECT_ROOT)],
    [bridge_js_1.getTokenBridgeDefinition.name, (a) => (0, bridge_js_1.getTokenBridgeHandler)(a, PROJECT_ROOT)],
    [bridge_js_1.diffTokenBridgeDefinition.name, (a) => (0, bridge_js_1.diffTokenBridgeHandler)(a, PROJECT_ROOT)],
    [bridge_js_1.systemixDiffTokensDefinition.name, (a) => (0, bridge_js_1.systemixDiffTokensHandler)(a, PROJECT_ROOT)],
    [events_js_1.emitEventDefinition.name, (a) => (0, events_js_1.emitEventHandler)(a, PROJECT_ROOT)],
    [events_js_1.listEventsDefinition.name, (a) => (0, events_js_1.listEventsHandler)(a, PROJECT_ROOT)],
    [hitl_js_1.pushHitlTaskDefinition.name, (a) => (0, hitl_js_1.pushHitlTaskHandler)(a, PROJECT_ROOT)],
    [hitl_js_1.resolveHitlTaskDefinition.name, (a) => (0, hitl_js_1.resolveHitlTaskHandler)(a, PROJECT_ROOT)],
    [hitl_js_1.listHitlTasksDefinition.name, (a) => (0, hitl_js_1.listHitlTasksHandler)(a, PROJECT_ROOT)],
    [workflow_js_1.listWorkflowsDefinition.name, (a) => (0, workflow_js_1.listWorkflowsHandler)(a, PROJECT_ROOT)],
    [workflow_js_1.getWorkflowDefinition.name, (a) => (0, workflow_js_1.getWorkflowHandler)(a, PROJECT_ROOT)],
]);
// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
const server = new index_js_1.Server({
    name: "systemix-mcp-server",
    version: "0.1.0",
}, {
    capabilities: {
        tools: {},
    },
});
// List all registered tools
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
    })),
}));
// Dispatch tool calls
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: rawArgs } = request.params;
    const handler = handlers.get(name);
    if (!handler) {
        return {
            content: [{ type: "text", text: `Unknown tool: ${name}` }],
            isError: true,
        };
    }
    try {
        const result = await handler((rawArgs ?? {}));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return result;
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            content: [{ type: "text", text: `Tool error in ${name}: ${message}` }],
            isError: true,
        };
    }
});
// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    // Log to stderr so it doesn't contaminate the MCP stdio stream
    process.stderr.write(`[systemix-mcp] Server started. Project root: ${PROJECT_ROOT}\n`);
    process.stderr.write(`[systemix-mcp] ${tools.length} tools registered: ${tools.map((t) => t.name).join(", ")}\n`);
}
main().catch((err) => {
    process.stderr.write(`[systemix-mcp] Fatal error: ${err}\n`);
    process.exit(1);
});
//# sourceMappingURL=index.js.map