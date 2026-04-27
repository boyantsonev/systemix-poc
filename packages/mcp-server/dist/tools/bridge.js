"use strict";
/**
 * bridge.ts — get_token_bridge / diff_token_bridge / systemix_diff_tokens
 *
 * Reads .systemix/tokens.bridge.json.
 * Used by skills to inspect current token state before push/sync operations.
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
exports.systemixDiffTokensHandler = exports.systemixDiffTokensDefinition = exports.diffTokenBridgeHandler = exports.diffTokenBridgeDefinition = exports.getTokenBridgeHandler = exports.getTokenBridgeDefinition = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const BRIDGE_FILE = ".systemix/tokens.bridge.json";
const DEFAULT_CSS_FILE = "src/app/globals.css";
// ---------------------------------------------------------------------------
// get_token_bridge  (systemix_get_bridge)
// ---------------------------------------------------------------------------
exports.getTokenBridgeDefinition = {
    name: "get_token_bridge",
    description: "Read .systemix/tokens.bridge.json — the pre-converted token file ready for Figma Variables push. " +
        "Returns token collections with hex/rgba values. Optionally filter by collection name and/or sync status. " +
        "Returns an empty array when tokens.bridge.json does not exist (graceful fallback).",
    inputSchema: {
        type: "object",
        properties: {
            collection: {
                type: "string",
                description: "Filter to a specific Figma collection name (e.g. 'Semantic', 'Status', 'Spacing & Radius'). " +
                    "Omit to return all tokens.",
            },
            status: {
                type: "string",
                enum: ["synced", "drifted", "new", "stale"],
                description: "Filter by sync status on the figma.syncStatus field of each token entry. " +
                    "Omit to return tokens regardless of status.",
            },
            includeMetadata: {
                type: "boolean",
                description: "Include the _meta block. Defaults to false.",
            },
        },
    },
};
const getTokenBridgeHandler = async (args, projectRoot) => {
    const filePath = path.join(projectRoot, BRIDGE_FILE);
    // Graceful fallback — return empty array when bridge file doesn't exist
    if (!fs.existsSync(filePath)) {
        return {
            content: [
                {
                    type: "text",
                    text: `Token Bridge — 0 tokens (bridge file not found)\n\n[]`,
                },
            ],
        };
    }
    const bridge = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    // Build result — strip meta unless requested
    const result = {};
    if (args.includeMetadata) {
        result._meta = bridge._meta;
    }
    // Collect all non-meta, non-schema groups
    const groups = Object.entries(bridge).filter(([k]) => k !== "_meta" && k !== "$schema");
    // Flatten all candidate tokens first, then apply filters
    let allTokens = {};
    for (const [groupName, groupValue] of groups) {
        allTokens[groupName] = groupValue;
    }
    if (args.collection) {
        const filtered = {};
        for (const [groupName, groupValue] of groups) {
            const matchedTokens = filterByCollection(groupValue, args.collection);
            if (Object.keys(matchedTokens).length > 0) {
                filtered[groupName] = matchedTokens;
            }
        }
        allTokens = filtered;
    }
    if (args.status) {
        const statusFiltered = {};
        for (const [groupName, groupValue] of Object.entries(allTokens)) {
            const matchedTokens = filterByStatus(groupValue, args.status);
            if (Object.keys(matchedTokens).length > 0) {
                statusFiltered[groupName] = matchedTokens;
            }
        }
        Object.assign(result, statusFiltered);
    }
    else {
        Object.assign(result, allTokens);
    }
    const summary = buildTokenSummary(bridge);
    return {
        content: [
            {
                type: "text",
                text: `Token Bridge — ${summary}\n\n${JSON.stringify(result, null, 2)}`,
            },
        ],
    };
};
exports.getTokenBridgeHandler = getTokenBridgeHandler;
// ---------------------------------------------------------------------------
// diff_token_bridge
// ---------------------------------------------------------------------------
exports.diffTokenBridgeDefinition = {
    name: "diff_token_bridge",
    description: "Compare the current .systemix/tokens.bridge.json against a provided previous snapshot. " +
        "Returns lists of added, changed, and removed token names. " +
        "Pass the snapshot you captured before a run to see exactly what changed.",
    inputSchema: {
        type: "object",
        properties: {
            previousSnapshot: {
                type: "object",
                description: "A previous snapshot of tokens.bridge.json (or the object returned by get_token_bridge). " +
                    "The current bridge on disk is diffed against this.",
            },
        },
        required: ["previousSnapshot"],
    },
};
const diffTokenBridgeHandler = async (args, projectRoot) => {
    const filePath = path.join(projectRoot, BRIDGE_FILE);
    if (!fs.existsSync(filePath)) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${BRIDGE_FILE} not found. Run 'npm run tokens' to generate it.`,
                },
            ],
            isError: true,
        };
    }
    const current = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const previous = args.previousSnapshot;
    // Flatten both into token-name → value maps
    const currentTokens = flattenTokens(current);
    const previousTokens = flattenTokens(previous);
    const currentNames = new Set(Object.keys(currentTokens));
    const previousNames = new Set(Object.keys(previousTokens));
    const added = [];
    const removed = [];
    const changed = [];
    for (const name of currentNames) {
        if (!previousNames.has(name)) {
            added.push(name);
        }
        else if (JSON.stringify(currentTokens[name]) !== JSON.stringify(previousTokens[name])) {
            changed.push(name);
        }
    }
    for (const name of previousNames) {
        if (!currentNames.has(name)) {
            removed.push(name);
        }
    }
    const lines = [
        `Token bridge diff — ${added.length} added, ${changed.length} changed, ${removed.length} removed`,
    ];
    if (added.length > 0) {
        lines.push("", `Added (${added.length}):`, ...added.map((n) => `  + ${n}`));
    }
    if (changed.length > 0) {
        lines.push("", `Changed (${changed.length}):`, ...changed.map((n) => `  ~ ${n}`));
    }
    if (removed.length > 0) {
        lines.push("", `Removed (${removed.length}):`, ...removed.map((n) => `  - ${n}`));
    }
    if (added.length === 0 && changed.length === 0 && removed.length === 0) {
        lines.push("", "No differences found — bridges are identical.");
    }
    return {
        content: [{ type: "text", text: lines.join("\n") }],
    };
};
exports.diffTokenBridgeHandler = diffTokenBridgeHandler;
// ---------------------------------------------------------------------------
// systemix_diff_tokens  — CSS vars vs bridge.json
// ---------------------------------------------------------------------------
exports.systemixDiffTokensDefinition = {
    name: "systemix_diff_tokens",
    description: "Compare CSS custom properties in a CSS file against .systemix/tokens.bridge.json. " +
        "Reports which vars were added (in CSS but not bridge), changed (different values), " +
        "removed (in bridge but not CSS), and how many are unchanged. " +
        "Defaults to src/app/globals.css when no cssFile is provided.",
    inputSchema: {
        type: "object",
        properties: {
            cssFile: {
                type: "string",
                description: "Path to the CSS file to inspect, relative to the project root. " +
                    `Defaults to "${DEFAULT_CSS_FILE}".`,
            },
        },
    },
};
const systemixDiffTokensHandler = async (args, projectRoot) => {
    const cssRelPath = args.cssFile ?? DEFAULT_CSS_FILE;
    const cssFilePath = path.join(projectRoot, cssRelPath);
    const bridgeFilePath = path.join(projectRoot, BRIDGE_FILE);
    // Read CSS file
    if (!fs.existsSync(cssFilePath)) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error: CSS file not found at ${cssRelPath}.`,
                },
            ],
            isError: true,
        };
    }
    const cssContent = fs.readFileSync(cssFilePath, "utf-8");
    // Extract all CSS custom properties using the specified regex
    const cssVars = {};
    const cssVarRegex = /--([\w-]+)\s*:\s*([^;]+);/g;
    let match;
    while ((match = cssVarRegex.exec(cssContent)) !== null) {
        cssVars[`--${match[1]}`] = match[2].trim();
    }
    // Read bridge.json — graceful fallback to empty
    const bridgeVars = {};
    if (fs.existsSync(bridgeFilePath)) {
        const bridge = JSON.parse(fs.readFileSync(bridgeFilePath, "utf-8"));
        collectBridgeCssVars(bridge, bridgeVars);
    }
    // Compute diff
    const cssKeys = new Set(Object.keys(cssVars));
    const bridgeKeys = new Set(Object.keys(bridgeVars));
    const added = [];
    const changed = [];
    const removed = [];
    let unchanged = 0;
    for (const cssVar of cssKeys) {
        if (!bridgeKeys.has(cssVar)) {
            added.push({ cssVar, value: cssVars[cssVar] });
        }
        else if (bridgeVars[cssVar] !== cssVars[cssVar]) {
            changed.push({ cssVar, from: bridgeVars[cssVar], to: cssVars[cssVar] });
        }
        else {
            unchanged++;
        }
    }
    for (const cssVar of bridgeKeys) {
        if (!cssKeys.has(cssVar)) {
            removed.push({ cssVar });
        }
    }
    const diffResult = { added, changed, removed, unchanged };
    const lines = [
        `systemix_diff_tokens — ${cssRelPath} vs ${BRIDGE_FILE}`,
        `  added: ${added.length}  changed: ${changed.length}  removed: ${removed.length}  unchanged: ${unchanged}`,
    ];
    if (added.length > 0) {
        lines.push("", `Added (${added.length}):`);
        for (const { cssVar, value } of added) {
            lines.push(`  + ${cssVar}: ${value}`);
        }
    }
    if (changed.length > 0) {
        lines.push("", `Changed (${changed.length}):`);
        for (const { cssVar, from, to } of changed) {
            lines.push(`  ~ ${cssVar}:`);
            lines.push(`      bridge: ${from}`);
            lines.push(`      css:    ${to}`);
        }
    }
    if (removed.length > 0) {
        lines.push("", `Removed (${removed.length}):`);
        for (const { cssVar } of removed) {
            lines.push(`  - ${cssVar}`);
        }
    }
    if (added.length === 0 && changed.length === 0 && removed.length === 0) {
        lines.push("", "No differences found — CSS and bridge are in sync.");
    }
    return {
        content: [
            {
                type: "text",
                text: lines.join("\n") + "\n\n" + JSON.stringify(diffResult, null, 2),
            },
        ],
    };
};
exports.systemixDiffTokensHandler = systemixDiffTokensHandler;
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function filterByCollection(obj, collection) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === "object") {
            const entry = value;
            if (entry.figma &&
                typeof entry.figma === "object" &&
                entry.figma.collection === collection) {
                result[key] = value;
            }
            else if (!("$type" in entry)) {
                // Nested group — recurse
                const nested = filterByCollection(entry, collection);
                if (Object.keys(nested).length > 0) {
                    result[key] = nested;
                }
            }
        }
    }
    return result;
}
function collectSyncStatus(obj, _path, pending, synced) {
    for (const [key, value] of Object.entries(obj)) {
        if (key === "_meta" || key === "$schema")
            continue;
        if (value && typeof value === "object") {
            const entry = value;
            if ("$type" in entry && entry.figma) {
                const figma = entry.figma;
                const name = typeof figma.variableName === "string"
                    ? figma.variableName
                    : _path.concat(key).join("/");
                if (figma.syncStatus === "synced") {
                    synced.push(name);
                }
                else {
                    pending.push(name);
                }
            }
            else {
                collectSyncStatus(entry, _path.concat(key), pending, synced);
            }
        }
    }
}
function buildTokenSummary(bridge) {
    const pending = [];
    const synced = [];
    collectSyncStatus(bridge, [], pending, synced);
    return `${pending.length + synced.length} total tokens (${pending.length} pending, ${synced.length} synced)`;
}
/**
 * Flatten a token bridge object into a flat map of token-path → value object.
 * Only leaves with a `$type` field are included. Skips `_meta` and `$schema`.
 */
function flattenTokens(obj, prefix = []) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (key === "_meta" || key === "$schema")
            continue;
        if (value && typeof value === "object") {
            const entry = value;
            if ("$type" in entry) {
                result[prefix.concat(key).join("/")] = entry;
            }
            else {
                Object.assign(result, flattenTokens(entry, prefix.concat(key)));
            }
        }
    }
    return result;
}
/**
 * Filter token entries by their figma.syncStatus value.
 * Recurses into nested groups. Only leaf nodes with a `$type` field are matched.
 */
function filterByStatus(obj, status) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === "object") {
            const entry = value;
            if ("$type" in entry) {
                // Leaf token — check syncStatus
                const figma = entry.figma;
                if (figma && figma.syncStatus === status) {
                    result[key] = value;
                }
            }
            else {
                // Nested group — recurse
                const nested = filterByStatus(entry, status);
                if (Object.keys(nested).length > 0) {
                    result[key] = nested;
                }
            }
        }
    }
    return result;
}
/**
 * Walk the bridge JSON and collect all figma.cssVar → figma.hex (or $value) mappings.
 * Used by systemix_diff_tokens to compare bridge values against CSS vars.
 */
function collectBridgeCssVars(obj, out) {
    for (const [key, value] of Object.entries(obj)) {
        if (key === "_meta" || key === "$schema")
            continue;
        if (value && typeof value === "object") {
            const entry = value;
            if ("$type" in entry) {
                // Leaf token — grab cssVar name and value
                const figma = entry.figma;
                const cssVar = figma && typeof figma.cssVar === "string"
                    ? figma.cssVar
                    : null;
                if (cssVar) {
                    // Prefer hex, fall back to $value
                    const bridgeValue = figma && typeof figma.hex === "string"
                        ? figma.hex
                        : typeof entry.$value === "string"
                            ? entry.$value
                            : null;
                    if (bridgeValue !== null) {
                        out[cssVar] = bridgeValue;
                    }
                }
            }
            else {
                collectBridgeCssVars(entry, out);
            }
        }
    }
}
//# sourceMappingURL=bridge.js.map