/**
 * ProxyLogger
 *
 * Appends structured log entries to .systemix/proxy-log.json.
 * Keeps the log file capped at MAX_ENTRIES (500) by rotating (dropping the
 * oldest entries) when the limit is exceeded.
 */

import * as fs from 'fs'
import * as path from 'path'

const MAX_ENTRIES = 500

export interface ProxyLogEntry {
  tool: string
  args: Record<string, unknown>
  intercepted: boolean
  reason?: string
  fromCache: boolean
  fromDedup: boolean
  timestamp: string
}

export class ProxyLogger {
  private readonly logPath: string

  constructor(projectRoot: string) {
    this.logPath = path.join(projectRoot, '.systemix', 'proxy-log.json')
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async ensureDir(): Promise<void> {
    await fs.promises.mkdir(path.dirname(this.logPath), { recursive: true })
  }

  private async readLog(): Promise<ProxyLogEntry[]> {
    try {
      const raw = await fs.promises.readFile(this.logPath, 'utf-8')
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as ProxyLogEntry[]) : []
    } catch {
      return []
    }
  }

  private async writeLog(entries: ProxyLogEntry[]): Promise<void> {
    await this.ensureDir()
    await fs.promises.writeFile(this.logPath, JSON.stringify(entries, null, 2), 'utf-8')
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Append an entry to the proxy log.  If the log reaches MAX_ENTRIES the
   * oldest entries are dropped to keep the file bounded.
   */
  async log(entry: ProxyLogEntry): Promise<void> {
    const entries = await this.readLog()
    entries.push(entry)

    // Rotate: keep only the most recent MAX_ENTRIES
    const trimmed = entries.length > MAX_ENTRIES
      ? entries.slice(entries.length - MAX_ENTRIES)
      : entries

    await this.writeLog(trimmed)
  }
}
