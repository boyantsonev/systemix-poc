"use strict";
// Optional Supabase client — only active when env vars are present
// Falls back to no-op when not configured
Object.defineProperty(exports, "__esModule", { value: true });
exports.dualWriteEvent = dualWriteEvent;
exports.dualWriteHitlTask = dualWriteHitlTask;
exports.dualResolveHitlTask = dualResolveHitlTask;
exports.dualWriteSyncLogEntry = dualWriteSyncLogEntry;
exports.dualWriteAgentState = dualWriteAgentState;
function getConfig() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const projectId = process.env.SYSTEMIX_PROJECT_ID;
    if (!url || !key || !projectId)
        return null;
    return { url, serviceRoleKey: key, projectId };
}
async function supabaseInsert(config, table, record) {
    const response = await fetch(`${config.url}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.serviceRoleKey}`,
            'apikey': config.serviceRoleKey,
            'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ ...record, project_id: config.projectId }),
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Supabase insert failed: ${response.status} ${text}`);
    }
}
async function supabaseUpdate(config, table, filter, updates) {
    const params = Object.entries(filter).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
    const response = await fetch(`${config.url}/rest/v1/${table}?${params}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.serviceRoleKey}`,
            'apikey': config.serviceRoleKey,
            'Prefer': 'return=minimal',
        },
        body: JSON.stringify(updates),
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Supabase update failed: ${response.status} ${text}`);
    }
}
// Dual-write helpers — each returns immediately, Supabase write is best-effort
async function dualWriteEvent(event) {
    const config = getConfig();
    if (!config)
        return;
    try {
        await supabaseInsert(config, 'events', {
            id: event.id,
            type: event.type,
            agent: event.agent,
            data: event.data ?? {},
            run_id: event.runId,
            created_at: event.timestamp,
        });
    }
    catch { /* best-effort — local write already succeeded */ }
}
async function dualWriteHitlTask(task) {
    const config = getConfig();
    if (!config)
        return;
    try {
        await supabaseInsert(config, 'hitl_tasks', {
            id: task.id,
            agent: task.agent,
            type: task.type,
            priority: task.priority,
            title: task.title,
            description: task.description,
            payload: task.payload,
            status: 'pending',
            created_at: task.createdAt,
        });
    }
    catch { /* best-effort */ }
}
async function dualResolveHitlTask(taskId, action, resolution, resolvedAt) {
    const config = getConfig();
    if (!config)
        return;
    try {
        await supabaseUpdate(config, 'hitl_tasks', { id: taskId }, {
            status: action,
            resolved_at: resolvedAt,
            resolution,
        });
    }
    catch { /* best-effort */ }
}
async function dualWriteSyncLogEntry(entry) {
    const config = getConfig();
    if (!config)
        return;
    try {
        await supabaseInsert(config, 'sync_log', {
            type: entry.type,
            agent: entry.agent,
            summary: entry.summary,
            created_at: entry.createdAt,
        });
    }
    catch { /* best-effort */ }
}
async function dualWriteAgentState(agentName, state) {
    const config = getConfig();
    if (!config)
        return;
    try {
        // Upsert — update if exists, insert if not
        const response = await fetch(`${config.url}/rest/v1/agent_states?agent_name=eq.${encodeURIComponent(agentName)}&project_id=eq.${config.projectId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.serviceRoleKey}`,
                'apikey': config.serviceRoleKey,
                'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
                status: state.status,
                last_run: state.lastRun,
                runs_total: state.runsTotal,
                runs_success: state.runsSuccess,
                updated_at: new Date().toISOString(),
            }),
        });
        if (response.status === 404 || (await response.text()).includes('0 rows')) {
            // Insert if no rows updated
            await supabaseInsert(config, 'agent_states', {
                agent_name: agentName,
                ...state,
                updated_at: new Date().toISOString(),
            });
        }
    }
    catch { /* best-effort */ }
}
//# sourceMappingURL=supabase-client.js.map