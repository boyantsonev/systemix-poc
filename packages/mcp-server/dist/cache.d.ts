export interface CacheEntry {
    data: unknown;
    hash: string;
    cachedAt: string;
    fileId: string;
    nodeId?: string;
}
export interface CacheManifest {
    fileId: string;
    lastModified: string;
    cachedAt: string;
    nodes: Record<string, {
        hash: string;
        cachedAt: string;
    }>;
}
export declare class FigmaCache {
    private cacheDir;
    constructor(projectRoot: string);
    /** Return the directory for a given fileId. */
    private fileDir;
    /** Return the path for a cache entry (node or top-level file data). */
    private entryPath;
    /** SHA-256 hash of the JSON-stringified data. */
    private hashData;
    /** Ensure a directory (and all parents) exist. */
    private ensureDir;
    /** Read and parse a JSON file; returns null if the file does not exist. */
    private readJson;
    /** Write an object as pretty-printed JSON to a file, creating parent dirs. */
    private writeJson;
    /**
     * Get cached node data.
     * Returns null if no cache entry exists.
     */
    get(fileId: string, nodeId?: string): Promise<CacheEntry | null>;
    /**
     * Store data for a file/node.
     * Computes a SHA-256 hash of the data and writes to disk.
     */
    set(fileId: string, data: unknown, nodeId?: string): Promise<CacheEntry>;
    /**
     * Check whether the cache for a file is stale.
     *
     * Strategy: compare manifest.json `lastModified` against the provided
     * `figmaLastModified` timestamp.  If no manifest exists → stale (true).
     */
    isStale(fileId: string, figmaLastModified?: string): Promise<boolean>;
    /**
     * Invalidate cache for a file or specific nodes.
     *
     * - If `nodeIds` is provided, only those node files are removed and the
     *   manifest node index is updated.
     * - If `nodeIds` is omitted, the entire file cache directory is removed.
     */
    invalidate(fileId: string, nodeIds?: string[]): Promise<void>;
    /**
     * Get the cache manifest for a file.
     * Returns null if no manifest exists.
     */
    getManifest(fileId: string): Promise<CacheManifest | null>;
    /**
     * Write or update the manifest after a successful fetch.
     *
     * Preserves the existing `nodes` index if a manifest already exists.
     */
    updateManifest(fileId: string, lastModified: string): Promise<void>;
}
//# sourceMappingURL=cache.d.ts.map