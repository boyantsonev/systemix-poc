/**
 * Token counter — BAST-75
 *
 * Records actual token usage per skill per run and writes a structured log to
 * .systemix/runs/[runId].json.  This file is the data source consumed by the
 * TokenGuard Dashboard (BAST-78).
 *
 * Usage:
 *   const tc = new TokenCounter(projectRoot);
 *   tc.startRun('run-2026-04-03-001', 'cli');
 *   tc.recordSkill('figma-read', 4200, true, 320);
 *   tc.recordSkill('token-diff', 2800, false, 510);
 *   const log = await tc.completeRun();   // writes JSON + prints summary
 */
export interface SkillTokenRecord {
    name: string;
    tokens: number;
    cacheHit: boolean;
    durationMs: number;
}
export interface RunLog {
    runId: string;
    startedAt: string;
    completedAt?: string;
    triggeredBy: string;
    skills: SkillTokenRecord[];
    totalTokens: number;
    /** Fraction of skills that were served from cache: 0–1 */
    cacheHitRatio: number;
    status: "running" | "completed" | "failed";
}
export declare class TokenCounter {
    private readonly runsDir;
    private currentRunId;
    private currentRun;
    constructor(projectRoot: string);
    /**
     * Start tracking a new run.  Calling this again while a run is active
     * implicitly discards the previous in-flight run without writing its log.
     */
    startRun(runId: string, triggeredBy: string): void;
    /**
     * Record tokens consumed by a single skill invocation.
     * Must be called after `startRun`.
     */
    recordSkill(skillName: string, tokens: number, cacheHit: boolean, durationMs: number): void;
    /**
     * Complete the run: set the final status, write the JSON log file, and
     * print a human-readable summary to stdout.
     *
     * Returns the completed RunLog.
     */
    completeRun(status?: "completed" | "failed"): Promise<RunLog>;
    /**
     * Print a compact token-usage summary to stdout.
     *
     * Example output:
     *
     *   TokenGuard · Run complete
     *     figma-read    4,200 tokens  (cache hit)
     *     token-diff    2,800 tokens
     *     ...
     *     Total         29,100 tokens  |  Cache saved ~82k
     */
    printSummary(run: RunLog): void;
    /** Read a past run log by its runId.  Returns null if not found. */
    readRun(runId: string): Promise<RunLog | null>;
    /**
     * List all run IDs stored in .systemix/runs/, sorted newest-first based on
     * the ISO timestamp embedded in the JSON rather than file-system mtime.
     */
    listRuns(): Promise<string[]>;
    /**
     * Compute aggregate stats across ALL stored run logs.
     * Intended as the data source for the TokenGuard Dashboard (BAST-78).
     */
    getStats(): Promise<{
        totalRuns: number;
        totalTokens: number;
        avgTokensPerRun: number;
        cacheHitRatio: number;
    }>;
    private _computeCacheHitRatio;
}
//# sourceMappingURL=token-counter.d.ts.map