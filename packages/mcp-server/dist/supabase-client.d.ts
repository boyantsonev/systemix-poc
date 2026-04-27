export interface SupabaseConfig {
    url: string;
    serviceRoleKey: string;
    projectId: string;
}
export declare function dualWriteEvent(event: {
    id: string;
    type: string;
    agent?: string;
    data?: unknown;
    runId?: string;
    timestamp: string;
}): Promise<void>;
export declare function dualWriteHitlTask(task: {
    id: string;
    agent: string;
    type: string;
    priority: string;
    title: string;
    description: string;
    payload?: unknown;
    createdAt: string;
}): Promise<void>;
export declare function dualResolveHitlTask(taskId: string, action: string, resolution: unknown, resolvedAt: string): Promise<void>;
export declare function dualWriteSyncLogEntry(entry: {
    type: string;
    agent?: string;
    summary?: string;
    createdAt: string;
}): Promise<void>;
export declare function dualWriteAgentState(agentName: string, state: {
    status: string;
    lastRun?: string;
    runsTotal: number;
    runsSuccess: number;
}): Promise<void>;
//# sourceMappingURL=supabase-client.d.ts.map