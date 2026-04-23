export interface TokenRun {
  runId: string
  date: string
  skills: string[]
  totalTokens: number
  cacheHitRatio: number // 0–1
  status: 'completed' | 'failed'
}

export const mockRuns: TokenRun[] = [
  {
    runId: 'run_2026-04-03_001',
    date: '2026-04-03T09:14:22Z',
    skills: ['figma-read', 'token-sync', 'component-gen'],
    totalTokens: 34200,
    cacheHitRatio: 0.82,
    status: 'completed',
  },
  {
    runId: 'run_2026-04-02_003',
    date: '2026-04-02T16:47:05Z',
    skills: ['figma-read', 'drift-report'],
    totalTokens: 91500,
    cacheHitRatio: 0.31,
    status: 'completed',
  },
  {
    runId: 'run_2026-04-02_002',
    date: '2026-04-02T11:22:48Z',
    skills: ['check-parity', 'deploy-annotate'],
    totalTokens: 28750,
    cacheHitRatio: 0.74,
    status: 'completed',
  },
  {
    runId: 'run_2026-04-02_001',
    date: '2026-04-02T08:05:33Z',
    skills: ['figma-read', 'sync-to-figma', 'figma-push'],
    totalTokens: 12300,
    cacheHitRatio: 0.91,
    status: 'failed',
  },
  {
    runId: 'run_2026-04-01_002',
    date: '2026-04-01T14:30:17Z',
    skills: ['tokens', 'apply-theme'],
    totalTokens: 19800,
    cacheHitRatio: 0.68,
    status: 'completed',
  },
  {
    runId: 'run_2026-04-01_001',
    date: '2026-04-01T09:55:01Z',
    skills: ['figma-inspect', 'component-gen', 'storybook'],
    totalTokens: 44100,
    cacheHitRatio: 0.57,
    status: 'completed',
  },
]

export const mockStats = {
  totalRuns: 24,
  totalTokens: 698400,
  avgCacheHitRatio: 0.71,
  tokensSavedByCache: 1720000,
}

export const mockAlerts = [
  {
    skill: 'figma-read',
    message: 'Used 3× more tokens than last run — possible schema drift',
    severity: 'warning' as const,
  },
]
