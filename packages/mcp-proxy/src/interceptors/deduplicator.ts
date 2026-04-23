/**
 * SessionDeduplicator
 *
 * In-memory deduplication of identical MCP tool calls within a configurable
 * time window (default 60 s).  Prevents agents from hammering the Figma MCP
 * with the same request multiple times in a single session (e.g. during
 * retries or multi-step planning).
 */

import * as crypto from 'crypto'

export interface DeduplicatorEntry {
  result: unknown
  timestamp: number
}

export class SessionDeduplicator {
  private readonly windowMs: number
  private cache = new Map<string, DeduplicatorEntry>()

  /**
   * @param windowMs  Deduplication window in milliseconds. Defaults to 60 000 (60 s).
   */
  constructor(windowMs = 60_000) {
    this.windowMs = windowMs
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Stable hash of the tool name + serialised args. */
  private hash(toolName: string, args: Record<string, unknown>): string {
    const payload = JSON.stringify({ toolName, args })
    return crypto.createHash('sha256').update(payload).digest('hex')
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Check whether an identical call was made within the deduplication window.
   *
   * @returns The cached result if a hit is found, `null` otherwise.
   */
  check(toolName: string, args: Record<string, unknown>): unknown | null {
    const key = this.hash(toolName, args)
    const entry = this.cache.get(key)
    if (!entry) return null

    const age = Date.now() - entry.timestamp
    if (age > this.windowMs) {
      this.cache.delete(key)
      return null
    }

    return entry.result
  }

  /**
   * Store the result of a tool call so subsequent identical calls can be
   * short-circuited.
   */
  store(toolName: string, args: Record<string, unknown>, result: unknown): void {
    const key = this.hash(toolName, args)
    this.cache.set(key, { result, timestamp: Date.now() })
  }

  /** Clear all entries — useful when starting a new session or on demand. */
  clear(): void {
    this.cache.clear()
  }

  /** Number of entries currently held in the deduplication cache. */
  get size(): number {
    return this.cache.size
  }
}
