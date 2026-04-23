import fs from "fs/promises";
import path from "path";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface SkillHandoff<T = unknown> {
  skillName: string;
  runId: string;
  skillIndex: number;       // 1-based position in the pipeline run
  completedAt: string;      // ISO timestamp
  tokenCount: number;       // actual tokens used (0 if unknown)
  durationMs: number;
  output: T;
  errors?: string[];
  nextSkill?: string;       // suggested next skill name, if any
}

export interface RunMeta {
  runId: string;
  startedAt: string;
  triggeredBy: string;      // "cli" | "dashboard" | "skill:[name]"
  skills: string[];         // skill names in order
  status: "running" | "completed" | "failed";
  totalTokens: number;
}

// ---------------------------------------------------------------------------
// HandoffManager
// ---------------------------------------------------------------------------

export class HandoffManager {
  private handoffsDir: string;

  constructor(projectRoot: string) {
    // Stores handoffs at .systemix/handoffs/[runId]/
    this.handoffsDir = path.join(projectRoot, ".systemix", "handoffs");
  }

  // Generate a new run ID — timestamp-based, e.g. "run-2026-04-04-001"
  generateRunId(): string {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
    const seqPart = String(now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()).padStart(5, "0");
    return `run-${datePart}-${seqPart}`;
  }

  // Resolve the directory for a given runId.
  private runDir(runId: string): string {
    return path.join(this.handoffsDir, runId);
  }

  // Write the run metadata file.
  async initRun(meta: RunMeta): Promise<void> {
    const dir = this.runDir(meta.runId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, "run-meta.json"),
      JSON.stringify(meta, null, 2),
      "utf-8"
    );
  }

  // Write a skill handoff for a completed skill.
  async writeHandoff<T>(runId: string, handoff: SkillHandoff<T>): Promise<void> {
    const dir = this.runDir(runId);
    await fs.mkdir(dir, { recursive: true });
    const filename = `skill-${handoff.skillIndex}-output.json`;
    await fs.writeFile(
      path.join(dir, filename),
      JSON.stringify(handoff, null, 2),
      "utf-8"
    );
  }

  // Read the handoff from the previous skill in the run.
  // Returns null if currentSkillIndex is 1 (no previous skill) or the file is absent.
  async readPreviousHandoff<T>(
    runId: string,
    currentSkillIndex: number
  ): Promise<SkillHandoff<T> | null> {
    if (currentSkillIndex <= 1) return null;

    const previousIndex = currentSkillIndex - 1;
    const filepath = path.join(
      this.runDir(runId),
      `skill-${previousIndex}-output.json`
    );

    try {
      const raw = await fs.readFile(filepath, "utf-8");
      return JSON.parse(raw) as SkillHandoff<T>;
    } catch {
      return null;
    }
  }

  // Read run metadata.
  async readRunMeta(runId: string): Promise<RunMeta | null> {
    const filepath = path.join(this.runDir(runId), "run-meta.json");
    try {
      const raw = await fs.readFile(filepath, "utf-8");
      return JSON.parse(raw) as RunMeta;
    } catch {
      return null;
    }
  }

  // List all run IDs, newest first (sorted lexicographically descending,
  // which works because run IDs are timestamp-prefixed).
  async listRuns(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.handoffsDir, { withFileTypes: true });
      return entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort((a, b) => b.localeCompare(a));
    } catch {
      return [];
    }
  }

  // Mark a run as completed or failed and record final token count.
  async closeRun(
    runId: string,
    status: "completed" | "failed",
    totalTokens: number
  ): Promise<void> {
    const meta = await this.readRunMeta(runId);
    if (!meta) {
      throw new Error(`Run "${runId}" not found — cannot close it.`);
    }
    const updated: RunMeta = { ...meta, status, totalTokens };
    const filepath = path.join(this.runDir(runId), "run-meta.json");
    await fs.writeFile(filepath, JSON.stringify(updated, null, 2), "utf-8");
  }
}
