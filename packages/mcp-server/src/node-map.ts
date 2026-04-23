/**
 * node-map.ts — Pre-computation module for tracked Figma nodes (BAST-73)
 *
 * Maintains a flat index of all tracked Figma nodes at:
 *   .systemix/[fileId]/node-map.json
 *
 * Built once and updated incrementally via upsert/remove.
 * Supports lookup by type and by token dependency.
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// NodeMapManager
// ---------------------------------------------------------------------------

export class NodeMapManager {
  private mapPath: string;

  /**
   * @param projectRoot  Absolute path to the project root.
   * @param fileId       Figma file ID — used as the sub-directory under .systemix/.
   */
  constructor(projectRoot: string, fileId: string) {
    this.mapPath = path.join(projectRoot, ".systemix", fileId, "node-map.json");
  }

  // ---------------------------------------------------------------------------
  // Core I/O
  // ---------------------------------------------------------------------------

  /**
   * Read the current node map from disk.
   * Returns an empty object if the file does not exist.
   */
  async read(): Promise<NodeMap> {
    if (!fs.existsSync(this.mapPath)) {
      return {};
    }
    const raw = fs.readFileSync(this.mapPath, "utf-8");
    return JSON.parse(raw) as NodeMap;
  }

  /**
   * Write the node map to disk.
   * Creates parent directories if they do not exist.
   */
  async write(map: NodeMap): Promise<void> {
    const dir = path.dirname(this.mapPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.mapPath, JSON.stringify(map, null, 2), "utf-8");
  }

  /**
   * Check if the node map file exists on disk.
   */
  async exists(): Promise<boolean> {
    return fs.existsSync(this.mapPath);
  }

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  /**
   * Add or update a single entry by semantic name.
   * Reads the current map, applies the upsert, then writes back.
   */
  async upsert(name: string, entry: NodeMapEntry): Promise<void> {
    const map = await this.read();
    map[name] = entry;
    await this.write(map);
  }

  /**
   * Remove an entry by semantic name.
   * No-op if the name does not exist.
   */
  async remove(name: string): Promise<void> {
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
  async findByType(type: string): Promise<Array<[string, NodeMapEntry]>> {
    const map = await this.read();
    return Object.entries(map).filter(([, entry]) => entry.type === type);
  }

  /**
   * Find all entries whose `tokenDeps` array includes the given token path.
   * e.g. findByTokenDep("color/primary")
   *
   * @returns Array of [name, entry] tuples in insertion order.
   */
  async findByTokenDep(tokenPath: string): Promise<Array<[string, NodeMapEntry]>> {
    const map = await this.read();
    return Object.entries(map).filter(([, entry]) =>
      entry.tokenDeps.includes(tokenPath)
    );
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  /**
   * Return the absolute file path of the node map JSON on disk.
   */
  getPath(): string {
    return this.mapPath;
  }
}
