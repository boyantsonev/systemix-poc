/**
 * node-map.ts — Pre-computation module for tracked Figma nodes (BAST-73)
 *
 * Maintains a flat index of all tracked Figma nodes at:
 *   .systemix/[fileId]/node-map.json
 *
 * Built once and updated incrementally via upsert/remove.
 * Supports lookup by type and by token dependency.
 */
export interface NodeMapEntry {
    /** Figma node ID e.g. "123:456" */
    id: string;
    /** "COMPONENT_SET" | "COMPONENT" | "FRAME" etc. */
    type: string;
    /** Page name in Figma */
    page: string;
    /** ISO timestamp */
    lastModified: string;
    /** e.g. ["color/primary", "radius/md"] */
    tokenDeps: string[];
}
/** key = semantic name e.g. "button-primary" */
export type NodeMap = Record<string, NodeMapEntry>;
export declare class NodeMapManager {
    private mapPath;
    /**
     * @param projectRoot  Absolute path to the project root.
     * @param fileId       Figma file ID — used as the sub-directory under .systemix/.
     */
    constructor(projectRoot: string, fileId: string);
    /**
     * Read the current node map from disk.
     * Returns an empty object if the file does not exist.
     */
    read(): Promise<NodeMap>;
    /**
     * Write the node map to disk.
     * Creates parent directories if they do not exist.
     */
    write(map: NodeMap): Promise<void>;
    /**
     * Check if the node map file exists on disk.
     */
    exists(): Promise<boolean>;
    /**
     * Add or update a single entry by semantic name.
     * Reads the current map, applies the upsert, then writes back.
     */
    upsert(name: string, entry: NodeMapEntry): Promise<void>;
    /**
     * Remove an entry by semantic name.
     * No-op if the name does not exist.
     */
    remove(name: string): Promise<void>;
    /**
     * Find all entries whose `type` field matches the given value.
     * e.g. findByType("COMPONENT_SET")
     *
     * @returns Array of [name, entry] tuples in insertion order.
     */
    findByType(type: string): Promise<Array<[string, NodeMapEntry]>>;
    /**
     * Find all entries whose `tokenDeps` array includes the given token path.
     * e.g. findByTokenDep("color/primary")
     *
     * @returns Array of [name, entry] tuples in insertion order.
     */
    findByTokenDep(tokenPath: string): Promise<Array<[string, NodeMapEntry]>>;
    /**
     * Return the absolute file path of the node map JSON on disk.
     */
    getPath(): string;
}
//# sourceMappingURL=node-map.d.ts.map