"use strict";
/**
 * context.ts — systemix_get_context / systemix_set_context / systemix_get_agent_state
 *
 * Reads and writes .systemix/project-context.json and .systemix/agent-state.json.
 * This is the primary state file for all Systemix skills.
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
exports.getAgentStateHandler = exports.getAgentStateDefinition = exports.setProjectContextHandler = exports.setProjectContextDefinition = exports.getProjectContextHandler = exports.getProjectContextDefinition = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const events_js_1 = require("./events.js");
const CONTEXT_FILE = ".systemix/project-context.json";
const AGENT_STATE_FILE = ".systemix/agent-state.json";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/**
 * Deep-merge `patch` into `base`. Arrays are replaced (not concatenated).
 * Both arguments must be plain objects at the top level.
 */
function deepMerge(base, patch) {
    const result = { ...base };
    for (const [key, patchValue] of Object.entries(patch)) {
        const baseValue = base[key];
        if (patchValue !== null &&
            typeof patchValue === "object" &&
            !Array.isArray(patchValue) &&
            baseValue !== null &&
            typeof baseValue === "object" &&
            !Array.isArray(baseValue)) {
            result[key] = deepMerge(baseValue, patchValue);
        }
        else {
            result[key] = patchValue;
        }
    }
    return result;
}
/**
 * Resolve a dot-notation key path (e.g. "figma.fileKey") against an object.
 * Returns `undefined` if any segment is missing.
 */
function getByDotPath(obj, dotPath) {
    const segments = dotPath.split(".");
    let current = obj;
    for (const seg of segments) {
        if (current === null || typeof current !== "object")
            return undefined;
        current = current[seg];
    }
    return current;
}
/**
 * Collect all dot-notation leaf paths present in an object.
 */
function collectLeafPaths(obj, prefix = "") {
    const paths = [];
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)) {
            paths.push(...collectLeafPaths(value, fullKey));
        }
        else {
            paths.push(fullKey);
        }
    }
    return paths;
}
// ---------------------------------------------------------------------------
// systemix_get_context
// ---------------------------------------------------------------------------
exports.getProjectContextDefinition = {
    name: "systemix_get_context",
    description: "Read the current Systemix project context from .systemix/project-context.json. " +
        "Pass optional dot-notation key paths (e.g. ['figma.fileKey', 'codebase.srcDir']) to " +
        "return only the requested subset. Omit keys (or pass an empty array) to return the full " +
        "context. Returns {} gracefully if the file does not exist yet.",
    inputSchema: {
        type: "object",
        properties: {
            keys: {
                type: "array",
                items: { type: "string" },
                description: "Optional dot-notation key paths to return, e.g. ['figma.fileKey', 'codebase.srcDir']. " +
                    "Omit or pass [] for the full context.",
            },
        },
    },
};
const getProjectContextHandler = async (args, projectRoot) => {
    const filePath = path.join(projectRoot, CONTEXT_FILE);
    if (!fs.existsSync(filePath)) {
        return {
            content: [{ type: "text", text: JSON.stringify({}, null, 2) }],
        };
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    const context = JSON.parse(raw);
    if (!args.keys || args.keys.length === 0) {
        return {
            content: [{ type: "text", text: JSON.stringify(context, null, 2) }],
        };
    }
    // Build a subset keyed by the requested dot-paths.
    const subset = {};
    for (const dotPath of args.keys) {
        subset[dotPath] = getByDotPath(context, dotPath);
    }
    return {
        content: [{ type: "text", text: JSON.stringify(subset, null, 2) }],
    };
};
exports.getProjectContextHandler = getProjectContextHandler;
// ---------------------------------------------------------------------------
// systemix_set_context
// ---------------------------------------------------------------------------
exports.setProjectContextDefinition = {
    name: "systemix_set_context",
    description: "Deep-merge a patch into .systemix/project-context.json and write atomically. " +
        "Nested objects are recursively merged — only the keys you provide are changed. " +
        "After writing, a context-updated event is emitted to the Systemix dashboard. " +
        "Returns { updated, newValues } showing which dot-notation paths changed.",
    inputSchema: {
        type: "object",
        properties: {
            updates: {
                type: "object",
                description: "Partial project context to deep-merge. Any depth is supported, e.g. " +
                    "{ figma: { fileKey: 'abc' } } updates only figma.fileKey.",
            },
        },
        required: ["updates"],
    },
};
const setProjectContextHandler = async (args, projectRoot) => {
    const filePath = path.join(projectRoot, CONTEXT_FILE);
    const tmpPath = filePath + ".tmp";
    const defaultContext = {
        version: "1.0",
        project: { name: "", description: "" },
        figma: {
            fileKey: null,
            fileName: null,
            fileUrl: null,
            modeIds: null,
            variableIds: null,
        },
        codebase: {
            root: ".",
            srcDir: "src",
            componentsDir: "src/components",
            stylesFile: "src/app/globals.css",
            tokensFile: ".systemix/tokens.bridge.json",
            manifestFile: ".systemix/systemix.json",
        },
        brand: { defaultSlug: "default", themesDir: "src/styles/themes" },
        pipeline: {
            skillsDir: "~/.claude/skills",
            handoffsDir: ".systemix/handoffs",
            cacheDir: ".systemix/cache",
            runsDir: ".systemix/runs",
        },
        deploy: { previewUrl: "", devUrl: "http://localhost:3001" },
    };
    const existing = fs.existsSync(filePath)
        ? JSON.parse(fs.readFileSync(filePath, "utf-8"))
        : defaultContext;
    const merged = deepMerge(existing, args.updates);
    // Collect changed dot-notation paths and their new values.
    const patchPaths = collectLeafPaths(args.updates);
    const changed = patchPaths.filter((p) => JSON.stringify(getByDotPath(existing, p)) !==
        JSON.stringify(getByDotPath(merged, p)));
    const newValues = {};
    for (const p of changed) {
        newValues[p] = getByDotPath(merged, p);
    }
    // Atomic write: tmp → rename.
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(tmpPath, JSON.stringify(merged, null, 2) + "\n", "utf-8");
    fs.renameSync(tmpPath, filePath);
    // Emit context-updated event (best-effort — don't fail the tool if it errors).
    try {
        await (0, events_js_1.emitEventHandler)({
            type: "tool_call",
            agent: "systemix_set_context",
            data: { updated: changed, newValues, summary: `Project context updated: ${changed.length} key(s) changed` },
        }, projectRoot);
    }
    catch {
        // Ignore event emission errors.
    }
    const response = { updated: changed, newValues };
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(response, null, 2),
            },
        ],
    };
};
exports.setProjectContextHandler = setProjectContextHandler;
// ---------------------------------------------------------------------------
// systemix_get_agent_state
// ---------------------------------------------------------------------------
exports.getAgentStateDefinition = {
    name: "systemix_get_agent_state",
    description: "Read agent state from .systemix/agent-state.json. " +
        "Pass an optional agent name to return only that agent's state. " +
        "Returns the full file if no agent is specified, or {} if the file does not exist.",
    inputSchema: {
        type: "object",
        properties: {
            agent: {
                type: "string",
                description: "Optional agent name to filter (e.g. 'sync-to-figma'). " +
                    "Omit to return all agent states.",
            },
        },
    },
};
const getAgentStateHandler = async (args, projectRoot) => {
    const filePath = path.join(projectRoot, AGENT_STATE_FILE);
    if (!fs.existsSync(filePath)) {
        return {
            content: [{ type: "text", text: JSON.stringify({}, null, 2) }],
        };
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    const state = JSON.parse(raw);
    if (args.agent) {
        const agentState = state[args.agent] ?? {};
        return {
            content: [
                { type: "text", text: JSON.stringify(agentState, null, 2) },
            ],
        };
    }
    return {
        content: [{ type: "text", text: JSON.stringify(state, null, 2) }],
    };
};
exports.getAgentStateHandler = getAgentStateHandler;
//# sourceMappingURL=context.js.map