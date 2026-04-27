"use strict";
/**
 * Pre-fetch layer — BAST-71
 *
 * Decouples Figma MCP reads from agent reasoning:
 *   1. Check .systemix/cache/[fileId]/ for a fresh snapshot (manifest.json).
 *   2. On cache miss: return an empty-data payload so the caller knows which
 *      MCP calls to make at runtime (actual calls happen inside the skill).
 *   3. On cache hit: deserialize and return the stored payload.
 *   4. Write the final payload to .systemix/handoffs/prefetch-[cacheKey].json.
 *
 * Full cache invalidation logic is deferred to BAST-72.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prefetch = prefetch;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function cacheDir(projectRoot, fileId) {
    return path_1.default.join(projectRoot, ".systemix", "cache", fileId);
}
function handoffsDir(projectRoot) {
    return path_1.default.join(projectRoot, ".systemix", "handoffs");
}
function manifestPath(projectRoot, fileId) {
    return path_1.default.join(cacheDir(projectRoot, fileId), "manifest.json");
}
function cachedPayloadPath(projectRoot, fileId, cacheKey) {
    return path_1.default.join(cacheDir(projectRoot, fileId), `${cacheKey}.json`);
}
/**
 * Derive a deterministic cache key from the scope when none is provided.
 * Format: [fileId][-nodeId]
 */
function deriveCacheKey(scope) {
    const parts = [scope.fileId];
    if (scope.nodeId)
        parts.push(scope.nodeId.replace(/[^a-zA-Z0-9_-]/g, "_"));
    return parts.join("-");
}
// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
async function prefetch(scope, projectRoot) {
    const cacheKey = scope.cacheKey ?? deriveCacheKey(scope);
    const now = new Date().toISOString();
    // ------------------------------------------------------------------
    // 1. Cache check — existence of manifest.json is sufficient for now.
    //    Full freshness/TTL logic will be added in BAST-72.
    // ------------------------------------------------------------------
    const manifest = manifestPath(projectRoot, scope.fileId);
    const cacheHit = fs_1.default.existsSync(manifest);
    let payload;
    if (cacheHit) {
        // ------------------------------------------------------------------
        // 2a. Cache hit: read stored payload if it exists, otherwise fall
        //     through to a cache-miss path (manifest present but data absent).
        // ------------------------------------------------------------------
        const storedPath = cachedPayloadPath(projectRoot, scope.fileId, cacheKey);
        if (fs_1.default.existsSync(storedPath)) {
            const raw = fs_1.default.readFileSync(storedPath, "utf-8");
            const stored = JSON.parse(raw);
            payload = { ...stored, fromCache: true };
        }
        else {
            // Manifest exists but this specific cacheKey was never written yet.
            payload = buildMissPayload(scope, cacheKey, now);
        }
    }
    else {
        // ------------------------------------------------------------------
        // 2b. Cache miss: return an empty-data payload with comments that
        //     document which MCP calls should populate each field at runtime.
        //     The skill is responsible for executing those calls and caching
        //     the results via BAST-72 utilities.
        // ------------------------------------------------------------------
        payload = buildMissPayload(scope, cacheKey, now);
    }
    // ------------------------------------------------------------------
    // 3. Write payload to .systemix/handoffs/prefetch-[cacheKey].json
    // ------------------------------------------------------------------
    const outDir = handoffsDir(projectRoot);
    fs_1.default.mkdirSync(outDir, { recursive: true });
    const outPath = path_1.default.join(outDir, `prefetch-${cacheKey}.json`);
    fs_1.default.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf-8");
    return payload;
}
// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------
/**
 * Build a cache-miss payload.
 *
 * The `data` fields are left undefined so the consuming skill knows it must
 * execute the corresponding Figma MCP calls:
 *
 *   designContext  ← mcp__claude_ai_Figma__get_design_context({ fileKey, nodeId, depth })
 *   variables      ← mcp__claude_ai_Figma__get_variable_defs({ fileKey })
 *   styles         ← mcp__claude_ai_Figma_Console__figma_get_styles({ fileKey })
 */
function buildMissPayload(scope, cacheKey, fetchedAt) {
    const include = scope.include ?? ["variables", "styles", "components"];
    return {
        fileId: scope.fileId,
        ...(scope.nodeId ? { nodeId: scope.nodeId } : {}),
        fetchedAt,
        fromCache: false,
        data: {
            // designContext: populated at runtime via mcp__claude_ai_Figma__get_design_context
            designContext: undefined,
            // variables: populated at runtime via mcp__claude_ai_Figma__get_variable_defs
            variables: include.includes("variables") ? undefined : null,
            // styles: populated at runtime via mcp__claude_ai_Figma_Console__figma_get_styles
            styles: include.includes("styles") ? undefined : null,
        },
    };
}
//# sourceMappingURL=prefetch.js.map