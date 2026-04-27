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
import { PrefetchScope, PrefetchPayload } from "./types.js";
export declare function prefetch(scope: PrefetchScope, projectRoot: string): Promise<PrefetchPayload>;
//# sourceMappingURL=prefetch.d.ts.map