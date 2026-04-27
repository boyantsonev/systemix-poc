/**
 * context.ts — systemix_get_context / systemix_set_context / systemix_get_agent_state
 *
 * Reads and writes .systemix/project-context.json and .systemix/agent-state.json.
 * This is the primary state file for all Systemix skills.
 */
import type { ToolDefinition, ToolHandler, ProjectContext } from "../types.js";
export declare const getProjectContextDefinition: ToolDefinition;
export declare const getProjectContextHandler: ToolHandler<{
    keys?: string[];
}>;
export declare const setProjectContextDefinition: ToolDefinition;
export declare const setProjectContextHandler: ToolHandler<{
    updates: Partial<ProjectContext>;
}>;
export declare const getAgentStateDefinition: ToolDefinition;
export declare const getAgentStateHandler: ToolHandler<{
    agent?: string;
}>;
//# sourceMappingURL=context.d.ts.map