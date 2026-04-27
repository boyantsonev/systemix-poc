export interface SkillHandoff<T = unknown> {
    skillName: string;
    runId: string;
    skillIndex: number;
    completedAt: string;
    tokenCount: number;
    durationMs: number;
    output: T;
    errors?: string[];
    nextSkill?: string;
}
export interface RunMeta {
    runId: string;
    startedAt: string;
    triggeredBy: string;
    skills: string[];
    status: "running" | "completed" | "failed";
    totalTokens: number;
}
export declare class HandoffManager {
    private handoffsDir;
    constructor(projectRoot: string);
    generateRunId(): string;
    private runDir;
    initRun(meta: RunMeta): Promise<void>;
    writeHandoff<T>(runId: string, handoff: SkillHandoff<T>): Promise<void>;
    readPreviousHandoff<T>(runId: string, currentSkillIndex: number): Promise<SkillHandoff<T> | null>;
    readRunMeta(runId: string): Promise<RunMeta | null>;
    listRuns(): Promise<string[]>;
    closeRun(runId: string, status: "completed" | "failed", totalTokens: number): Promise<void>;
}
//# sourceMappingURL=handoff.d.ts.map