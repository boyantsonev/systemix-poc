"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandoffManager = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
// ---------------------------------------------------------------------------
// HandoffManager
// ---------------------------------------------------------------------------
class HandoffManager {
    constructor(projectRoot) {
        // Stores handoffs at .systemix/handoffs/[runId]/
        this.handoffsDir = path_1.default.join(projectRoot, ".systemix", "handoffs");
    }
    // Generate a new run ID — timestamp-based, e.g. "run-2026-04-04-001"
    generateRunId() {
        const now = new Date();
        const datePart = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
        const seqPart = String(now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()).padStart(5, "0");
        return `run-${datePart}-${seqPart}`;
    }
    // Resolve the directory for a given runId.
    runDir(runId) {
        return path_1.default.join(this.handoffsDir, runId);
    }
    // Write the run metadata file.
    async initRun(meta) {
        const dir = this.runDir(meta.runId);
        await promises_1.default.mkdir(dir, { recursive: true });
        await promises_1.default.writeFile(path_1.default.join(dir, "run-meta.json"), JSON.stringify(meta, null, 2), "utf-8");
    }
    // Write a skill handoff for a completed skill.
    async writeHandoff(runId, handoff) {
        const dir = this.runDir(runId);
        await promises_1.default.mkdir(dir, { recursive: true });
        const filename = `skill-${handoff.skillIndex}-output.json`;
        await promises_1.default.writeFile(path_1.default.join(dir, filename), JSON.stringify(handoff, null, 2), "utf-8");
    }
    // Read the handoff from the previous skill in the run.
    // Returns null if currentSkillIndex is 1 (no previous skill) or the file is absent.
    async readPreviousHandoff(runId, currentSkillIndex) {
        if (currentSkillIndex <= 1)
            return null;
        const previousIndex = currentSkillIndex - 1;
        const filepath = path_1.default.join(this.runDir(runId), `skill-${previousIndex}-output.json`);
        try {
            const raw = await promises_1.default.readFile(filepath, "utf-8");
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
    // Read run metadata.
    async readRunMeta(runId) {
        const filepath = path_1.default.join(this.runDir(runId), "run-meta.json");
        try {
            const raw = await promises_1.default.readFile(filepath, "utf-8");
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
    // List all run IDs, newest first (sorted lexicographically descending,
    // which works because run IDs are timestamp-prefixed).
    async listRuns() {
        try {
            const entries = await promises_1.default.readdir(this.handoffsDir, { withFileTypes: true });
            return entries
                .filter((e) => e.isDirectory())
                .map((e) => e.name)
                .sort((a, b) => b.localeCompare(a));
        }
        catch {
            return [];
        }
    }
    // Mark a run as completed or failed and record final token count.
    async closeRun(runId, status, totalTokens) {
        const meta = await this.readRunMeta(runId);
        if (!meta) {
            throw new Error(`Run "${runId}" not found — cannot close it.`);
        }
        const updated = { ...meta, status, totalTokens };
        const filepath = path_1.default.join(this.runDir(runId), "run-meta.json");
        await promises_1.default.writeFile(filepath, JSON.stringify(updated, null, 2), "utf-8");
    }
}
exports.HandoffManager = HandoffManager;
//# sourceMappingURL=handoff.js.map