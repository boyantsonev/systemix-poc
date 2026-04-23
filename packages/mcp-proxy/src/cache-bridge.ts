/**
 * CacheBridge
 *
 * Thin read/write wrapper around the .systemix/cache/ directory.
 * Re-implements the FigmaCache logic inline (no import from mcp-server) so
 * that mcp-proxy has zero internal monorepo dependencies.
 *
 * Directory layout (mirrors FigmaCache in packages/mcp-server/src/cache.ts):
 *   .systemix/cache/[fileId]/data.json          — full-file payload
 *   .systemix/cache/[fileId]/nodes/[nodeId].json — per-node payload
 */

import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

export interface CacheBridgeEntry {
  data: unknown
  hash: string
  cachedAt: string
  fileId: string
  nodeId?: string
}

export class CacheBridge {
  private readonly cacheDir: string

  constructor(projectRoot: string) {
    this.cacheDir = path.join(projectRoot, '.systemix', 'cache')
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private entryPath(fileId: string, nodeId?: string): string {
    if (nodeId) {
      return path.join(this.cacheDir, fileId, 'nodes', `${nodeId}.json`)
    }
    return path.join(this.cacheDir, fileId, 'data.json')
  }

  private hashData(data: unknown): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
  }

  private async ensureDir(dir: string): Promise<void> {
    await fs.promises.mkdir(dir, { recursive: true })
  }

  private async readJson<T>(filePath: string): Promise<T | null> {
    try {
      const raw = await fs.promises.readFile(filePath, 'utf-8')
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }

  private async writeJson(filePath: string, value: unknown): Promise<void> {
    await this.ensureDir(path.dirname(filePath))
    await fs.promises.writeFile(filePath, JSON.stringify(value, null, 2), 'utf-8')
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Return cached data for the given fileId / nodeId pair, or `null` if no
   * cache entry exists.
   */
  async checkCache(fileId: string, nodeId?: string): Promise<CacheBridgeEntry | null> {
    const filePath = this.entryPath(fileId, nodeId)
    return this.readJson<CacheBridgeEntry>(filePath)
  }

  /**
   * Persist data to the cache.  Creates parent directories as needed.
   */
  async storeCache(fileId: string, data: unknown, nodeId?: string): Promise<CacheBridgeEntry> {
    const entry: CacheBridgeEntry = {
      data,
      hash: this.hashData(data),
      cachedAt: new Date().toISOString(),
      fileId,
      ...(nodeId !== undefined ? { nodeId } : {}),
    }

    const filePath = this.entryPath(fileId, nodeId)
    await this.writeJson(filePath, entry)
    return entry
  }
}
