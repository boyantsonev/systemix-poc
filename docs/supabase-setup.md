# Supabase Setup Guide

Supabase is an optional cloud backend for Systemix multi-user features: shared agent state, HITL task queues, realtime dashboard, and drift history. Local `.systemix/*.json` files continue to work without it.

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed (`brew install supabase/tap/supabase`)
- A Supabase account and project created at [supabase.com](https://supabase.com)
- Node.js 18+

## Initial Setup

**1. Initialize Supabase in the project (first time only):**

```bash
supabase init
```

**2. Link to your remote Supabase project:**

```bash
supabase link --project-ref <your-project-ref>
```

**3. Push the schema:**

```bash
supabase db push
```

This applies `supabase/schema.sql` to your remote database.

**4. (Optional) Seed dev data:**

```bash
supabase db reset --db-url <your-db-url>
# or run seed.sql manually in the Supabase SQL editor
```

## Environment Variables

Add these to your `.env.local` (never commit to git):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Find these in your Supabase dashboard under **Project Settings > API**.

- `NEXT_PUBLIC_SUPABASE_URL` — public, safe to expose in browser
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public, used for client-side queries (RLS enforced)
- `SUPABASE_SERVICE_ROLE_KEY` — secret, server-side only (bypasses RLS — keep private)

## Tables and What They Replace

| Table | Replaces | Purpose |
|---|---|---|
| `projects` | — | One row per Systemix workspace/repo |
| `profiles` | — | Extends `auth.users` with display name and global role |
| `project_members` | — | Maps users to projects with per-project roles |
| `agent_states` | `.systemix/agent-state.json` | Live status of each agent (idle/running/error/success) |
| `events` | `.systemix/events/*.json` | Append-only event log per agent run |
| `hitl_tasks` | `.systemix/hitl-queue.json` | Human-in-the-loop approval queue |
| `sync_log` | `.systemix/sync-log.json` | Record of every design↔code sync operation |
| `drift_snapshots` | — | Historical drift scores for trend tracking |
| `workflows` | — | Saved multi-step agent workflow definitions |
| `workflow_runs` | — | Execution records for workflow runs |
| `token_guard_runs` | — | Per-run token usage and cache stats from TokenGuard |

## Row Level Security (RLS)

All tables have RLS enabled. The current policies enforce:

- **Projects**: A user can only read projects they are a member of (via `project_members`).
- **Events**: Readable only by project members.
- **HITL tasks**: Readable by all project members; resolvable (update) by members with role `owner`, `admin`, or `member` (not `viewer`).

When writing server-side scripts or admin tooling, use `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS. Never expose the service role key to the browser.

## Realtime

The following tables are added to the `supabase_realtime` publication for live updates:

- `events` — agent run events streamed to the dashboard
- `hitl_tasks` — new approval requests appear immediately
- `agent_states` — live agent status indicators
- `sync_log` — sync activity feed

Subscribe in client code using the Supabase JS client:

```ts
const channel = supabase
  .channel('agent-states')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_states' }, (payload) => {
    console.log('Agent state changed:', payload)
  })
  .subscribe()
```

## Local Development with Supabase CLI

To run Supabase locally (full stack including auth and realtime):

```bash
supabase start
```

This starts a local Postgres instance, Studio UI at `http://localhost:54323`, and an API at `http://localhost:54321`. Update your `.env.local` to point to local URLs when developing offline.

```bash
supabase stop   # stop local services
supabase status # show local service URLs and keys
```
