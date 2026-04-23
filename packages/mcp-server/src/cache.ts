import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

export interface CacheEntry {
  data: unknown
  hash: string
  cachedAt: string
  fileId: string
  nodeId?: string
}

export interface CacheManifest {
  fileId: string
  lastModified: string   // ISO timestamp from Figma
  cachedAt: string
  nodes: Record<string, { hash: string; cachedAt: string }>
}

// ---------------------------------------------------------------------------
// Directory layout under .systemix/cache/[fileId]/
//   manifest.json           – per-file staleness metadata
//   variables.json          – cached variables for the file
//   styles.json             – cached styles for the file
//   nodes/[nodeId].json     – cached data for individual nodes
// ---------------------------------------------------------------------------

export class FigmaCache {
  private cacheDir: string

  constructor(projectRoot: string) {
    this.cacheDir = path.join(projectRoot, '.systemix', 'cache')
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Return the directory for a given fileId. */
  private fileDir(fileId: string): string {
    return path.join(this.cacheDir, fileId)
  }

  /** Return the path for a cache entry (node or top-level file data). */
  private entryPath(fileId: string, nodeId?: string): string {
    if (nodeId) {
      return path.join(this.fileDir(fileId), 'nodes', `${nodeId}.json`)
    }
    // Without a nodeId we store a generic file-level payload
    return path.join(this.fileDir(fileId), 'data.json')
  }

  /** SHA-256 hash of the JSON-stringified data. */
  private hashData(data: unknown): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
  }

  /** Ensure a directory (and all parents) exist. */
  private async ensureDir(dir: string): Promise<void> {
    await fs.promises.mkdir(dir, { recursive: true })
  }

  /** Read and parse a JSON file; returns null if the file does not exist. */
  private async readJson<T>(filePath: string): Promise<T | null> {
    try {
      const raw = await fs.promises.readFile(filePath, 'utf-8')
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }

  /** Write an object as pretty-printed JSON to a file, creating parent dirs. */
  private async writeJson(filePath: string, value: unknown): Promise<void> {
    await this.ensureDir(path.dirname(filePath))
    await fs.promises.writeFile(filePath, JSON.stringify(value, null, 2), 'utf-8')
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Get cached node data.
   * Returns null if no cache entry exists.
   */
  async get(fileId: string, nodeId?: string): Promise<CacheEntry | null> {
    const filePath = this.entryPath(fileId, nodeId)
    return this.readJson<CacheEntry>(filePath)
  }

  /**
   * Store data for a file/node.
   * Computes a SHA-256 hash of the data and writes to disk.
   */
  async set(fileId: string, data: unknown, nodeId?: string): Promise<CacheEntry> {
    const entry: CacheEntry = {
      data,
      hash: this.hashData(data),
      cachedAt: new Date().toISOString(),
      fileId,
      ...(nodeId !== undefined ? { nodeId } : {}),
    }

    const filePath = this.entryPath(fileId, nodeId)
    await this.writeJson(filePath, entry)

    // Keep the manifest's node index in sync when a nodeId is provided.
    if (nodeId) {
      const manifest = await this.getManifest(fileId)
      if (manifest) {
        manifest.nodes[nodeId] = { hash: entry.hash, cachedAt: entry.cachedAt }
        await this.writeJson(
          path.join(this.fileDir(fileId), 'manifest.json'),
          manifest,
        )
      }
    }

    return entry
  }

  /**
   * Check whether the cache for a file is stale.
   *
   * Strategy: compare manifest.json `lastModified` against the provided
   * `figmaLastModified` timestamp.  If no manifest exists → stale (true).
   */
  async isStale(fileId: string, figmaLastModified?: string): Promise<boolean> {
    const manifest = await this.getManifest(fileId)
    if (!manifest) return true
    if (!figmaLastModified) return false

    // Both are ISO strings — direct string comparison works because ISO 8601
    // timestamps sort lexicographically.
    return figmaLastModified > manifest.lastModified
  }

  /**
   * Invalidate cache for a file or specific nodes.
   *
   * - If `nodeIds` is provided, only those node files are removed and the
   *   manifest node index is updated.
   * - If `nodeIds` is omitted, the entire file cache directory is removed.
   */
  async invalidate(fileId: string, nodeIds?: string[]): Promise<void> {
    const dir = this.fileDir(fileId)

    if (!nodeIds || nodeIds.length === 0) {
      // Remove the whole directory for this file.
      try {
        await fs.promises.rm(dir, { recursive: true, force: true })
      } catch {
        // Directory may not exist; that's fine.
      }
      return
    }

    // Remove individual node files and update the manifest.
    const manifest = await this.getManifest(fileId)

    for (const nodeId of nodeIds) {
      const nodePath = path.join(dir, 'nodes', `${nodeId}.json`)
      try {
        await fs.promises.unlink(nodePath)
      } catch {
        // File may not exist; ignore.
      }
      if (manifest) {
        delete manifest.nodes[nodeId]
      }
    }

    if (manifest) {
      await this.writeJson(path.join(dir, 'manifest.json'), manifest)
    }
  }

  /**
   * Get the cache manifest for a file.
   * Returns null if no manifest exists.
   */
  async getManifest(fileId: string): Promise<CacheManifest | null> {
    const manifestPath = path.join(this.fileDir(fileId), 'manifest.json')
    return this.readJson<CacheManifest>(manifestPath)
  }

  /**
   * Write or update the manifest after a successful fetch.
   *
   * Preserves the existing `nodes` index if a manifest already exists.
   */
  async updateManifest(fileId: string, lastModified: string): Promise<void> {
    const existing = await this.getManifest(fileId)
    const now = new Date().toISOString()

    const manifest: CacheManifest = {
      fileId,
      lastModified,
      cachedAt: now,
      nodes: existing?.nodes ?? {},
    }

    const manifestPath = path.join(this.fileDir(fileId), 'manifest.json')
    await this.writeJson(manifestPath, manifest)
  }
}
