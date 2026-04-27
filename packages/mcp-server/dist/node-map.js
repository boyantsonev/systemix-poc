"use strict";
/**
 * node-map.ts — Pre-computation module for tracked Figma nodes (BAST-73)
 *
 * Maintains a flat index of all tracked Figma nodes at:
 *   .systemix/[fileId]/node-map.json
 *
 * Built once and updated incrementally via upsert/remove.
 * Supports lookup by type and by token dependency.
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
exports.NodeMapManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// ---------------------------------------------------------------------------
// NodeMapManager
// ---------------------------------------------------------------------------
class NodeMapManager {
    /**
     * @param projectRoot  Absolute path to the project root.
     * @param fileId       Figma file ID — used as the sub-directory under .systemix/.
     */
    constructor(projectRoot, fileId) {
        this.mapPath = path.join(projectRoot, ".systemix", fileId, "node-map.json");
    }
    // ---------------------------------------------------------------------------
    // Core I/O
    // ---------------------------------------------------------------------------
    /**
     * Read the current node map from disk.
     * Returns an empty object if the file does not exist.
     */
    async read() {
        if (!fs.existsSync(this.mapPath)) {
            return {};
        }
        const raw = fs.readFileSync(this.mapPath, "utf-8");
        return JSON.parse(raw);
    }
    /**
     * Write the node map to disk.
     * Creates parent directories if they do not exist.
     */
    async write(map) {
        const dir = path.dirname(this.mapPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.mapPath, JSON.stringify(map, null, 2), "utf-8");
    }
    /**
     * Check if the node map file exists on disk.
     */
    async exists() {
        return fs.existsSync(this.mapPath);
    }
    // ---------------------------------------------------------------------------
    // Mutations
    // ---------------------------------------------------------------------------
    /**
     * Add or update a single entry by semantic name.
     * Reads the current map, applies the upsert, then writes back.
     */
    async upsert(name, entry) {
        const map = await this.read();
        map[name] = entry;
        await this.write(map);
    }
    /**
     * Remove an entry by semantic name.
     * No-op if the name does not exist.
     */
    async remove(name) {
        const map = await this.read();
        if (name in map) {
            delete map[name];
            await this.write(map);
        }
    }
    // ---------------------------------------------------------------------------
    // Queries
    // ---------------------------------------------------------------------------
    /**
     * Find all entries whose `type` field matches the given value.
     * e.g. findByType("COMPONENT_SET")
     *
     * @returns Array of [name, entry] tuples in insertion order.
     */
    async findByType(type) {
        const map = await this.read();
        return Object.entries(map).filter(([, entry]) => entry.type === type);
    }
    /**
     * Find all entries whose `tokenDeps` array includes the given token path.
     * e.g. findByTokenDep("color/primary")
     *
     * @returns Array of [name, entry] tuples in insertion order.
     */
    async findByTokenDep(tokenPath) {
        const map = await this.read();
        return Object.entries(map).filter(([, entry]) => entry.tokenDeps.includes(tokenPath));
    }
    // ---------------------------------------------------------------------------
    // Utility
    // ---------------------------------------------------------------------------
    /**
     * Return the absolute file path of the node map JSON on disk.
     */
    getPath() {
        return this.mapPath;
    }
}
exports.NodeMapManager = NodeMapManager;
//# sourceMappingURL=node-map.js.map