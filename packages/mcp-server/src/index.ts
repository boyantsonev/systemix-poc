#!/usr/bin/env node
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
 *   contract — contract_get_token, contract_list_drifted, contract_get_component, contract_get_quality_score, contract_get_evidence, contract_write_evidence, contract_get_hypothesis, contract_list_hypotheses, contract_write_hypothesis_result
 *   experiment — experiment_list, experiment_get, experiment_new, experiment_measure, experiment_close, experiment_learnings (the v6 loop over experiments/)
 *
 * Usage:
 *   systemix-mcp --project-root /path/to/project
 *   # or via npx:
 *   npx systemix-mcp --project-root .
 *
 * The server communicates over stdio (MCP default transport).
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  getProjectContextDefinition,
  getProjectContextHandler,
  setProjectContextDefinition,
  setProjectContextHandler,
  getAgentStateDefinition,
  getAgentStateHandler,
} from "./tools/context.js";

import {
  getTokenBridgeDefinition,
  getTokenBridgeHandler,
  diffTokenBridgeDefinition,
  diffTokenBridgeHandler,
  systemixDiffTokensDefinition,
  systemixDiffTokensHandler,
} from "./tools/bridge.js";

import {
  emitEventDefinition,
  emitEventHandler,
  listEventsDefinition,
  listEventsHandler,
} from "./tools/events.js";

import {
  pushHitlTaskDefinition,
  pushHitlTaskHandler,
  resolveHitlTaskDefinition,
  resolveHitlTaskHandler,
  listHitlTasksDefinition,
  listHitlTasksHandler,
} from "./tools/hitl.js";

import {
  listWorkflowsDefinition,
  listWorkflowsHandler,
  getWorkflowDefinition,
  getWorkflowHandler,
} from "./tools/workflow.js";

import {
  contractGetTokenDefinition,
  contractGetTokenHandler,
  contractListDriftedDefinition,
  contractListDriftedHandler,
  contractGetComponentDefinition,
  contractGetComponentHandler,
  contractGetQualityScoreDefinition,
  contractGetQualityScoreHandler,
  contractGetEvidenceDefinition,
  contractGetEvidenceHandler,
  contractWriteEvidenceDefinition,
  contractWriteEvidenceHandler,
  contractGetHypothesisDefinition,
  contractGetHypothesisHandler,
  contractListHypothesesDefinition,
  contractListHypothesesHandler,
  contractWriteHypothesisResultDefinition,
  contractWriteHypothesisResultHandler,
} from "./tools/contract.js";

import {
  experimentListDefinition,
  experimentListHandler,
  experimentGetDefinition,
  experimentGetHandler,
  experimentNewDefinition,
  experimentNewHandler,
  experimentMeasureDefinition,
  experimentMeasureHandler,
  experimentCloseDefinition,
  experimentCloseHandler,
  experimentLearningsDefinition,
  experimentLearningsHandler,
} from "./tools/experiment.js";

import type { ToolHandler, ToolResult } from "./types.js";

// ---------------------------------------------------------------------------
// CLI args — parse --project-root
// ---------------------------------------------------------------------------

function getProjectRoot(): string {
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
  getProjectContextDefinition,
  setProjectContextDefinition,
  getAgentStateDefinition,
  getTokenBridgeDefinition,
  diffTokenBridgeDefinition,
  systemixDiffTokensDefinition,
  emitEventDefinition,
  listEventsDefinition,
  pushHitlTaskDefinition,
  resolveHitlTaskDefinition,
  listHitlTasksDefinition,
  listWorkflowsDefinition,
  getWorkflowDefinition,
  contractGetTokenDefinition,
  contractListDriftedDefinition,
  contractGetComponentDefinition,
  contractGetQualityScoreDefinition,
  contractGetEvidenceDefinition,
  contractWriteEvidenceDefinition,
  contractGetHypothesisDefinition,
  contractListHypothesesDefinition,
  contractWriteHypothesisResultDefinition,
  experimentListDefinition,
  experimentGetDefinition,
  experimentNewDefinition,
  experimentMeasureDefinition,
  experimentCloseDefinition,
  experimentLearningsDefinition,
];

// Map tool name → handler, bound to projectRoot
const handlers = new Map<string, (args: Record<string, unknown>) => Promise<ToolResult>>([
  [getProjectContextDefinition.name, (a) => getProjectContextHandler(a as Parameters<typeof getProjectContextHandler>[0], PROJECT_ROOT)],
  [setProjectContextDefinition.name, (a) => setProjectContextHandler(a as Parameters<typeof setProjectContextHandler>[0], PROJECT_ROOT)],
  [getAgentStateDefinition.name, (a) => getAgentStateHandler(a as Parameters<typeof getAgentStateHandler>[0], PROJECT_ROOT)],
  [getTokenBridgeDefinition.name, (a) => getTokenBridgeHandler(a as Parameters<typeof getTokenBridgeHandler>[0], PROJECT_ROOT)],
  [diffTokenBridgeDefinition.name, (a) => diffTokenBridgeHandler(a as Parameters<typeof diffTokenBridgeHandler>[0], PROJECT_ROOT)],
  [systemixDiffTokensDefinition.name, (a) => systemixDiffTokensHandler(a as Parameters<typeof systemixDiffTokensHandler>[0], PROJECT_ROOT)],
  [emitEventDefinition.name, (a) => emitEventHandler(a as Parameters<typeof emitEventHandler>[0], PROJECT_ROOT)],
  [listEventsDefinition.name, (a) => listEventsHandler(a as Parameters<typeof listEventsHandler>[0], PROJECT_ROOT)],
  [pushHitlTaskDefinition.name, (a) => pushHitlTaskHandler(a as Parameters<typeof pushHitlTaskHandler>[0], PROJECT_ROOT)],
  [resolveHitlTaskDefinition.name, (a) => resolveHitlTaskHandler(a as Parameters<typeof resolveHitlTaskHandler>[0], PROJECT_ROOT)],
  [listHitlTasksDefinition.name, (a) => listHitlTasksHandler(a as Parameters<typeof listHitlTasksHandler>[0], PROJECT_ROOT)],
  [listWorkflowsDefinition.name, (a) => listWorkflowsHandler(a, PROJECT_ROOT)],
  [getWorkflowDefinition.name, (a) => getWorkflowHandler(a as Parameters<typeof getWorkflowHandler>[0], PROJECT_ROOT)],
  [contractGetTokenDefinition.name, (a) => contractGetTokenHandler(a as Parameters<typeof contractGetTokenHandler>[0], PROJECT_ROOT)],
  [contractListDriftedDefinition.name, (a) => contractListDriftedHandler(a as Parameters<typeof contractListDriftedHandler>[0], PROJECT_ROOT)],
  [contractGetComponentDefinition.name, (a) => contractGetComponentHandler(a as Parameters<typeof contractGetComponentHandler>[0], PROJECT_ROOT)],
  [contractGetQualityScoreDefinition.name, (_a) => contractGetQualityScoreHandler({}, PROJECT_ROOT)],
  [contractGetEvidenceDefinition.name, (a) => contractGetEvidenceHandler(a as Parameters<typeof contractGetEvidenceHandler>[0], PROJECT_ROOT)],
  [contractWriteEvidenceDefinition.name, (a) => contractWriteEvidenceHandler(a as unknown as Parameters<typeof contractWriteEvidenceHandler>[0], PROJECT_ROOT)],
  [contractGetHypothesisDefinition.name, (a) => contractGetHypothesisHandler(a as Parameters<typeof contractGetHypothesisHandler>[0], PROJECT_ROOT)],
  [contractListHypothesesDefinition.name, (a) => contractListHypothesesHandler(a as Parameters<typeof contractListHypothesesHandler>[0], PROJECT_ROOT)],
  [contractWriteHypothesisResultDefinition.name, (a) => contractWriteHypothesisResultHandler(a as unknown as Parameters<typeof contractWriteHypothesisResultHandler>[0], PROJECT_ROOT)],
  [experimentListDefinition.name, (a) => experimentListHandler(a as Parameters<typeof experimentListHandler>[0], PROJECT_ROOT)],
  [experimentGetDefinition.name, (a) => experimentGetHandler(a as Parameters<typeof experimentGetHandler>[0], PROJECT_ROOT)],
  [experimentNewDefinition.name, (a) => experimentNewHandler(a as Parameters<typeof experimentNewHandler>[0], PROJECT_ROOT)],
  [experimentMeasureDefinition.name, (a) => experimentMeasureHandler(a as Parameters<typeof experimentMeasureHandler>[0], PROJECT_ROOT)],
  [experimentCloseDefinition.name, (a) => experimentCloseHandler(a as Parameters<typeof experimentCloseHandler>[0], PROJECT_ROOT)],
  [experimentLearningsDefinition.name, (a) => experimentLearningsHandler(a as Parameters<typeof experimentLearningsHandler>[0], PROJECT_ROOT)],
]);

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = new Server(
  {
    name: "systemix-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List all registered tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

// Dispatch tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: rawArgs } = request.params;
  const handler = handlers.get(name);

  if (!handler) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  try {
    const result = await handler((rawArgs ?? {}) as Record<string, unknown>);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result as any;
  } catch (err) {
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

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr so it doesn't contaminate the MCP stdio stream
  process.stderr.write(
    `[systemix-mcp] Server started. Project root: ${PROJECT_ROOT}\n`
  );
  process.stderr.write(
    `[systemix-mcp] ${tools.length} tools registered: ${tools.map((t) => t.name).join(", ")}\n`
  );
}

main().catch((err) => {
  process.stderr.write(`[systemix-mcp] Fatal error: ${err}\n`);
  process.exit(1);
});
