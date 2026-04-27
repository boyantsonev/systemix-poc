"use strict";
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
exports.getWorkflowHandler = exports.getWorkflowDefinition = exports.listWorkflowsHandler = exports.listWorkflowsDefinition = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const WORKFLOWS_SNAPSHOT = ".systemix/workflows.json";
const WORKFLOWS_SOURCE = "src/lib/data/workflows.ts";
// ---------------------------------------------------------------------------
// list_workflows
// ---------------------------------------------------------------------------
exports.listWorkflowsDefinition = {
    name: "list_workflows",
    description: "List all workflow definitions from src/lib/data/workflows.ts. " +
        "Returns each workflow's id, name, description, node count, and skill commands. " +
        "Useful for skills that need to reference or trigger a specific workflow.",
    inputSchema: {
        type: "object",
        properties: {},
    },
};
const listWorkflowsHandler = async (_args, projectRoot) => {
    const workflows = loadWorkflows(projectRoot);
    if (workflows.length === 0) {
        return {
            content: [
                {
                    type: "text",
                    text: "No workflows found. Ensure src/lib/data/workflows.ts exports a 'workflows' array.",
                },
            ],
        };
    }
    const summary = workflows.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description,
        nodeCount: w.nodeCount,
        skills: w.skills,
    }));
    const lines = summary.map((w) => `${w.id} — ${w.name}\n  ${w.description}\n  Nodes: ${w.nodeCount ?? "?"} | Skills: ${w.skills?.join(", ") ?? "none"}`);
    return {
        content: [
            {
                type: "text",
                text: `${workflows.length} workflow(s) found:\n\n${lines.join("\n\n")}`,
            },
        ],
    };
};
exports.listWorkflowsHandler = listWorkflowsHandler;
// ---------------------------------------------------------------------------
// get_workflow
// ---------------------------------------------------------------------------
exports.getWorkflowDefinition = {
    name: "get_workflow",
    description: "Get the full definition of a specific workflow by its ID. " +
        "Returns all nodes, edges, descriptions, skill commands, and HITL approval prompts.",
    inputSchema: {
        type: "object",
        properties: {
            workflowId: {
                type: "string",
                description: "The workflow ID (e.g. 'token-sync', 'component-gen', 'drift-review'). " +
                    "Use list_workflows to see all available IDs.",
            },
        },
        required: ["workflowId"],
    },
};
const getWorkflowHandler = async (args, projectRoot) => {
    const workflows = loadWorkflows(projectRoot);
    const workflow = workflows.find((w) => w.id === args.workflowId);
    if (!workflow) {
        const available = workflows.map((w) => w.id).join(", ");
        return {
            content: [
                {
                    type: "text",
                    text: `Workflow '${args.workflowId}' not found. Available: ${available || "none"}`,
                },
            ],
            isError: true,
        };
    }
    return {
        content: [{ type: "text", text: JSON.stringify(workflow, null, 2) }],
    };
};
exports.getWorkflowHandler = getWorkflowHandler;
// ---------------------------------------------------------------------------
// Loader — tries snapshot first, then raw source parse
// ---------------------------------------------------------------------------
function loadWorkflows(projectRoot) {
    // 1. Try .systemix/workflows.json snapshot (written by dashboard or CLI)
    const snapshotPath = path.join(projectRoot, WORKFLOWS_SNAPSHOT);
    if (fs.existsSync(snapshotPath)) {
        try {
            const data = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));
            if (Array.isArray(data))
                return data;
        }
        catch {
            // fall through
        }
    }
    // 2. Parse raw workflows.ts source to extract metadata without executing TS
    const sourcePath = path.join(projectRoot, WORKFLOWS_SOURCE);
    if (!fs.existsSync(sourcePath)) {
        return [];
    }
    return parseWorkflowsSource(fs.readFileSync(sourcePath, "utf-8"));
}
/**
 * Lightweight regex-based extraction of workflow metadata from workflows.ts.
 * Extracts each object literal with { id: "...", name: "...", description: "..." }
 * from the exported `workflows` array.  Not a full parser — good enough for
 * the static data shape used in this codebase.
 */
function parseWorkflowsSource(source) {
    const results = [];
    // Find the `workflows: WorkflowDef[] = [` export and slice to end of array
    const startMatch = source.match(/export\s+const\s+workflows\s*[^=]*=\s*\[/);
    if (!startMatch || startMatch.index === undefined)
        return results;
    const arrayStart = startMatch.index + startMatch[0].length;
    const arraySlice = source.slice(arrayStart);
    // Split on top-level `{` to find individual workflow objects
    // Strategy: walk chars, track brace depth, collect top-level objects
    const objects = extractTopLevelObjects(arraySlice);
    for (const obj of objects) {
        const id = extractStringField(obj, "id");
        const name = extractStringField(obj, "name");
        const description = extractStringField(obj, "description");
        if (!id)
            continue;
        // Count nodes and edges by occurrence of their id fields in nested arrays
        const nodeCount = (obj.match(/"id":\s*"[^"]+"/g) ?? []).length - 1; // -1 for workflow id
        const edgeCount = (obj.match(/\bfrom\s*:\s*"[^"]+"/g) ?? []).length;
        // Extract skill commands
        const skills = [];
        const skillMatches = obj.matchAll(/skillCommand\s*:\s*"([^"]+)"/g);
        for (const m of skillMatches) {
            skills.push(m[1]);
        }
        results.push({
            id,
            name: name ?? id,
            description: description ?? "",
            nodeCount: nodeCount > 0 ? nodeCount : undefined,
            edgeCount: edgeCount > 0 ? edgeCount : undefined,
            skills: skills.length > 0 ? skills : undefined,
        });
    }
    return results;
}
function extractTopLevelObjects(src) {
    const objects = [];
    let depth = 0;
    let start = -1;
    for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (ch === "{") {
            if (depth === 0)
                start = i;
            depth++;
        }
        else if (ch === "}") {
            depth--;
            if (depth === 0 && start >= 0) {
                objects.push(src.slice(start, i + 1));
                start = -1;
            }
        }
    }
    return objects;
}
function extractStringField(src, field) {
    const re = new RegExp(`\\b${field}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`);
    const m = src.match(re);
    return m ? m[1] : undefined;
}
//# sourceMappingURL=workflow.js.map