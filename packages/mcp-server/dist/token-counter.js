"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenCounter = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/**
 * Estimated tokens saved per cache hit.
 *
 * A typical Figma design-context payload weighs roughly 40 k tokens when read
 * fresh.  This constant is deliberately conservative so the "Cache saved ~Xk"
 * line in the summary does not over-promise.
 */
const ESTIMATED_TOKENS_SAVED_PER_HIT = 40000;
/** Format a token count with thousands separators (e.g. 29100 → "29,100"). */
function fmtTokens(n) {
    return n.toLocaleString("en-US");
}
// ---------------------------------------------------------------------------
// TokenCounter
// ---------------------------------------------------------------------------
class TokenCounter {
    constructor(projectRoot) {
        this.currentRunId = null;
        this.currentRun = null;
        this.runsDir = path_1.default.join(projectRoot, ".systemix", "runs");
    }
    // -------------------------------------------------------------------------
    // Run lifecycle
    // -------------------------------------------------------------------------
    /**
     * Start tracking a new run.  Calling this again while a run is active
     * implicitly discards the previous in-flight run without writing its log.
     */
    startRun(runId, triggeredBy) {
        this.currentRunId = runId;
        this.currentRun = {
            runId,
            startedAt: new Date().toISOString(),
            triggeredBy,
            skills: [],
            totalTokens: 0,
            cacheHitRatio: 0,
            status: "running",
        };
    }
    /**
     * Record tokens consumed by a single skill invocation.
     * Must be called after `startRun`.
     */
    recordSkill(skillName, tokens, cacheHit, durationMs) {
        if (!this.currentRun) {
            throw new Error("TokenCounter: call startRun() before recording skill usage.");
        }
        this.currentRun.skills.push({
            name: skillName,
            tokens,
            cacheHit,
            durationMs,
        });
        // Keep running totals up-to-date so callers can inspect mid-run.
        this.currentRun.totalTokens += tokens;
        this.currentRun.cacheHitRatio = this._computeCacheHitRatio(this.currentRun.skills);
    }
    /**
     * Complete the run: set the final status, write the JSON log file, and
     * print a human-readable summary to stdout.
     *
     * Returns the completed RunLog.
     */
    async completeRun(status = "completed") {
        if (!this.currentRun || !this.currentRunId) {
            throw new Error("TokenCounter: no active run — call startRun() first.");
        }
        const run = this.currentRun;
        run.completedAt = new Date().toISOString();
        run.status = status;
        // Recompute in case skills were added between last recordSkill and now.
        run.totalTokens = run.skills.reduce((sum, s) => sum + s.tokens, 0);
        run.cacheHitRatio = this._computeCacheHitRatio(run.skills);
        // Write log file.
        fs_1.default.mkdirSync(this.runsDir, { recursive: true });
        const logPath = path_1.default.join(this.runsDir, `${run.runId}.json`);
        fs_1.default.writeFileSync(logPath, JSON.stringify(run, null, 2), "utf-8");
        // Print summary.
        this.printSummary(run);
        // Clear current run state.
        this.currentRunId = null;
        this.currentRun = null;
        return run;
    }
    // -------------------------------------------------------------------------
    // Summary output
    // -------------------------------------------------------------------------
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
    printSummary(run) {
        const lines = ["", "TokenGuard · Run complete"];
        // Determine column width for skill names.
        const maxNameLen = run.skills.reduce((max, s) => Math.max(max, s.name.length), 5 // minimum width for "Total"
        );
        for (const skill of run.skills) {
            const nameCol = skill.name.padEnd(maxNameLen + 2);
            const tokenCol = `${fmtTokens(skill.tokens)} tokens`;
            const cacheTag = skill.cacheHit ? "  (cache hit)" : "";
            lines.push(`  ${nameCol}${tokenCol}${cacheTag}`);
        }
        // Footer totals line.
        const cacheHits = run.skills.filter((s) => s.cacheHit).length;
        const savedApprox = cacheHits * ESTIMATED_TOKENS_SAVED_PER_HIT;
        const savedLabel = savedApprox > 0
            ? `  |  Cache saved ~${Math.round(savedApprox / 1000)}k`
            : "";
        const totalNameCol = "Total".padEnd(maxNameLen + 2);
        lines.push(`  ${totalNameCol}${fmtTokens(run.totalTokens)} tokens${savedLabel}`);
        lines.push("");
        process.stdout.write(lines.join("\n") + "\n");
    }
    // -------------------------------------------------------------------------
    // Log reading
    // -------------------------------------------------------------------------
    /** Read a past run log by its runId.  Returns null if not found. */
    async readRun(runId) {
        const logPath = path_1.default.join(this.runsDir, `${runId}.json`);
        if (!fs_1.default.existsSync(logPath))
            return null;
        const raw = fs_1.default.readFileSync(logPath, "utf-8");
        return JSON.parse(raw);
    }
    /**
     * List all run IDs stored in .systemix/runs/, sorted newest-first based on
     * the ISO timestamp embedded in the JSON rather than file-system mtime.
     */
    async listRuns() {
        if (!fs_1.default.existsSync(this.runsDir))
            return [];
        const files = fs_1.default
            .readdirSync(this.runsDir)
            .filter((f) => f.endsWith(".json"));
        // Read each file just enough to get startedAt for sorting.
        const entries = [];
        for (const file of files) {
            try {
                const raw = fs_1.default.readFileSync(path_1.default.join(this.runsDir, file), "utf-8");
                const log = JSON.parse(raw);
                entries.push({
                    runId: file.replace(/\.json$/, ""),
                    startedAt: log.startedAt ?? "",
                });
            }
            catch {
                // Skip malformed files silently.
            }
        }
        entries.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
        return entries.map((e) => e.runId);
    }
    // -------------------------------------------------------------------------
    // Aggregate stats
    // -------------------------------------------------------------------------
    /**
     * Compute aggregate stats across ALL stored run logs.
     * Intended as the data source for the TokenGuard Dashboard (BAST-78).
     */
    async getStats() {
        const runIds = await this.listRuns();
        if (runIds.length === 0) {
            return {
                totalRuns: 0,
                totalTokens: 0,
                avgTokensPerRun: 0,
                cacheHitRatio: 0,
            };
        }
        let totalTokens = 0;
        let totalSkills = 0;
        let cacheHitSkills = 0;
        for (const runId of runIds) {
            const run = await this.readRun(runId);
            if (!run)
                continue;
            totalTokens += run.totalTokens;
            totalSkills += run.skills.length;
            cacheHitSkills += run.skills.filter((s) => s.cacheHit).length;
        }
        return {
            totalRuns: runIds.length,
            totalTokens,
            avgTokensPerRun: runIds.length > 0 ? Math.round(totalTokens / runIds.length) : 0,
            cacheHitRatio: totalSkills > 0 ? cacheHitSkills / totalSkills : 0,
        };
    }
    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------
    _computeCacheHitRatio(skills) {
        if (skills.length === 0)
            return 0;
        const hits = skills.filter((s) => s.cacheHit).length;
        return hits / skills.length;
    }
}
exports.TokenCounter = TokenCounter;
//# sourceMappingURL=token-counter.js.map