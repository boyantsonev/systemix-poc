"use strict";
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
exports.FigmaCache = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
// ---------------------------------------------------------------------------
// Directory layout under .systemix/cache/[fileId]/
//   manifest.json           – per-file staleness metadata
//   variables.json          – cached variables for the file
//   styles.json             – cached styles for the file
//   nodes/[nodeId].json     – cached data for individual nodes
// ---------------------------------------------------------------------------
class FigmaCache {
    constructor(projectRoot) {
        this.cacheDir = path.join(projectRoot, '.systemix', 'cache');
    }
    // ---------------------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------------------
    /** Return the directory for a given fileId. */
    fileDir(fileId) {
        return path.join(this.cacheDir, fileId);
    }
    /** Return the path for a cache entry (node or top-level file data). */
    entryPath(fileId, nodeId) {
        if (nodeId) {
            return path.join(this.fileDir(fileId), 'nodes', `${nodeId}.json`);
        }
        // Without a nodeId we store a generic file-level payload
        return path.join(this.fileDir(fileId), 'data.json');
    }
    /** SHA-256 hash of the JSON-stringified data. */
    hashData(data) {
        return crypto
            .createHash('sha256')
            .update(JSON.stringify(data))
            .digest('hex');
    }
    /** Ensure a directory (and all parents) exist. */
    async ensureDir(dir) {
        await fs.promises.mkdir(dir, { recursive: true });
    }
    /** Read and parse a JSON file; returns null if the file does not exist. */
    async readJson(filePath) {
        try {
            const raw = await fs.promises.readFile(filePath, 'utf-8');
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
    /** Write an object as pretty-printed JSON to a file, creating parent dirs. */
    async writeJson(filePath, value) {
        await this.ensureDir(path.dirname(filePath));
        await fs.promises.writeFile(filePath, JSON.stringify(value, null, 2), 'utf-8');
    }
    // ---------------------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------------------
    /**
     * Get cached node data.
     * Returns null if no cache entry exists.
     */
    async get(fileId, nodeId) {
        const filePath = this.entryPath(fileId, nodeId);
        return this.readJson(filePath);
    }
    /**
     * Store data for a file/node.
     * Computes a SHA-256 hash of the data and writes to disk.
     */
    async set(fileId, data, nodeId) {
        const entry = {
            data,
            hash: this.hashData(data),
            cachedAt: new Date().toISOString(),
            fileId,
            ...(nodeId !== undefined ? { nodeId } : {}),
        };
        const filePath = this.entryPath(fileId, nodeId);
        await this.writeJson(filePath, entry);
        // Keep the manifest's node index in sync when a nodeId is provided.
        if (nodeId) {
            const manifest = await this.getManifest(fileId);
            if (manifest) {
                manifest.nodes[nodeId] = { hash: entry.hash, cachedAt: entry.cachedAt };
                await this.writeJson(path.join(this.fileDir(fileId), 'manifest.json'), manifest);
            }
        }
        return entry;
    }
    /**
     * Check whether the cache for a file is stale.
     *
     * Strategy: compare manifest.json `lastModified` against the provided
     * `figmaLastModified` timestamp.  If no manifest exists → stale (true).
     */
    async isStale(fileId, figmaLastModified) {
        const manifest = await this.getManifest(fileId);
        if (!manifest)
            return true;
        if (!figmaLastModified)
            return false;
        // Both are ISO strings — direct string comparison works because ISO 8601
        // timestamps sort lexicographically.
        return figmaLastModified > manifest.lastModified;
    }
    /**
     * Invalidate cache for a file or specific nodes.
     *
     * - If `nodeIds` is provided, only those node files are removed and the
     *   manifest node index is updated.
     * - If `nodeIds` is omitted, the entire file cache directory is removed.
     */
    async invalidate(fileId, nodeIds) {
        const dir = this.fileDir(fileId);
        if (!nodeIds || nodeIds.length === 0) {
            // Remove the whole directory for this file.
            try {
                await fs.promises.rm(dir, { recursive: true, force: true });
            }
            catch {
                // Directory may not exist; that's fine.
            }
            return;
        }
        // Remove individual node files and update the manifest.
        const manifest = await this.getManifest(fileId);
        for (const nodeId of nodeIds) {
            const nodePath = path.join(dir, 'nodes', `${nodeId}.json`);
            try {
                await fs.promises.unlink(nodePath);
            }
            catch {
                // File may not exist; ignore.
            }
            if (manifest) {
                delete manifest.nodes[nodeId];
            }
        }
        if (manifest) {
            await this.writeJson(path.join(dir, 'manifest.json'), manifest);
        }
    }
    /**
     * Get the cache manifest for a file.
     * Returns null if no manifest exists.
     */
    async getManifest(fileId) {
        const manifestPath = path.join(this.fileDir(fileId), 'manifest.json');
        return this.readJson(manifestPath);
    }
    /**
     * Write or update the manifest after a successful fetch.
     *
     * Preserves the existing `nodes` index if a manifest already exists.
     */
    async updateManifest(fileId, lastModified) {
        const existing = await this.getManifest(fileId);
        const now = new Date().toISOString();
        const manifest = {
            fileId,
            lastModified,
            cachedAt: now,
            nodes: existing?.nodes ?? {},
        };
        const manifestPath = path.join(this.fileDir(fileId), 'manifest.json');
        await this.writeJson(manifestPath, manifest);
    }
}
exports.FigmaCache = FigmaCache;
//# sourceMappingURL=cache.js.map