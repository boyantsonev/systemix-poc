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
 *
 * Usage:
 *   systemix-mcp --project-root /path/to/project
 *   # or via npx:
 *   npx systemix-mcp --project-root .
 *
 * The server communicates over stdio (MCP default transport).
 */
export {};
//# sourceMappingURL=index.d.ts.map