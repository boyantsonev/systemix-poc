import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export interface RunLog {
  runId: string
  date: string
  skills: string[]
  totalTokens: number
  cacheHitRatio: number
  status: 'completed' | 'failed'
}

// GET /api/token-guard/runs
// Returns: { runs: RunLog[], stats: { totalRuns, totalTokens, avgCacheHitRatio } }
export async function GET() {
  const runsDir = path.join(process.cwd(), '.systemix', 'runs')

  let runs: RunLog[] = []

  try {
    const files = await fs.readdir(runsDir)
    const jsonFiles = files.filter((f) => f.endsWith('.json'))

    const parsed = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const raw = await fs.readFile(path.join(runsDir, file), 'utf-8')
          return JSON.parse(raw) as RunLog
        } catch {
          return null
        }
      })
    )

    runs = parsed
      .filter((r): r is RunLog => r !== null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  } catch (err: unknown) {
    // Directory doesn't exist yet — return empty result
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('[token-guard/runs] unexpected error:', err)
    }
  }

  const totalRuns = runs.length
  const totalTokens = runs.reduce((sum, r) => sum + (r.totalTokens ?? 0), 0)
  const avgCacheHitRatio =
    totalRuns > 0
      ? runs.reduce((sum, r) => sum + (r.cacheHitRatio ?? 0), 0) / totalRuns
      : 0

  return NextResponse.json({
    runs,
    stats: {
      totalRuns,
      totalTokens,
      avgCacheHitRatio,
    },
  })
}
