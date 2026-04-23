-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";

-- ============================================================
-- CORE TABLES
-- ============================================================

-- Projects (one per Systemix workspace/repo)
create table projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  figma_file_key text,
  repo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  settings jsonb default '{}'::jsonb
);

-- Users (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  role text default 'member' check (role in ('admin', 'member', 'viewer')),
  created_at timestamptz default now()
);

-- Project membership
create table project_members (
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  joined_at timestamptz default now(),
  primary key (project_id, user_id)
);

-- ============================================================
-- AGENT STATE
-- ============================================================

create table agent_states (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  agent_name text not null,
  status text default 'idle' check (status in ('idle', 'running', 'error', 'success')),
  last_run timestamptz,
  next_scheduled timestamptz,
  runs_total integer default 0,
  runs_success integer default 0,
  updated_at timestamptz default now(),
  unique (project_id, agent_name)
);

-- ============================================================
-- EVENTS (replaces .systemix/events/*.json)
-- ============================================================

create table events (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  run_id text,
  type text not null,
  agent text,
  data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Index for dashboard queries
create index events_project_created on events(project_id, created_at desc);
create index events_run on events(run_id) where run_id is not null;

-- ============================================================
-- HITL QUEUE (replaces .systemix/hitl-queue.json)
-- ============================================================

create table hitl_tasks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  agent text not null,
  type text not null check (type in ('approve', 'reject', 'input', 'review')),
  priority text default 'normal' check (priority in ('critical', 'high', 'normal', 'low')),
  title text not null,
  description text,
  payload jsonb,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'skipped')),
  created_at timestamptz default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles(id),
  resolution jsonb,
  run_id text
);

create index hitl_pending on hitl_tasks(project_id, status) where status = 'pending';

-- ============================================================
-- SYNC LOG (replaces .systemix/sync-log.json)
-- ============================================================

create table sync_log (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  type text not null,
  agent text,
  summary text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index sync_log_project on sync_log(project_id, created_at desc);

-- ============================================================
-- DRIFT HISTORY
-- ============================================================

create table drift_snapshots (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  score integer,
  total_tokens integer,
  drifted_count integer,
  snapshot jsonb not null,
  created_at timestamptz default now()
);

-- ============================================================
-- WORKFLOWS
-- ============================================================

create table workflows (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  description text,
  steps jsonb not null default '[]'::jsonb,
  version integer default 1,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table workflow_runs (
  id uuid primary key default uuid_generate_v4(),
  workflow_id uuid references workflows(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  status text default 'idle' check (status in ('idle', 'running', 'completed', 'failed', 'cancelled')),
  execution jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  triggered_by uuid references profiles(id)
);

-- ============================================================
-- TOKEN GUARD RUNS
-- ============================================================

create table token_guard_runs (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  run_id text unique not null,
  skills_run integer default 0,
  tokens_used integer default 0,
  tokens_saved integer default 0,
  cache_hits integer default 0,
  cache_misses integer default 0,
  dry_run boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table projects enable row level security;
alter table profiles enable row level security;
alter table project_members enable row level security;
alter table agent_states enable row level security;
alter table events enable row level security;
alter table hitl_tasks enable row level security;
alter table sync_log enable row level security;
alter table drift_snapshots enable row level security;
alter table workflows enable row level security;
alter table workflow_runs enable row level security;
alter table token_guard_runs enable row level security;

-- Members can see their projects
create policy "project members can view" on projects
  for select using (
    id in (select project_id from project_members where user_id = auth.uid())
  );

-- Shared policy helper for project-scoped tables
create policy "project members can view events" on events
  for select using (
    project_id in (select project_id from project_members where user_id = auth.uid())
  );

create policy "project members can view hitl_tasks" on hitl_tasks
  for select using (
    project_id in (select project_id from project_members where user_id = auth.uid())
  );

create policy "project members can resolve hitl_tasks" on hitl_tasks
  for update using (
    project_id in (
      select project_id from project_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'member')
    )
  );

-- ============================================================
-- REALTIME
-- ============================================================

-- Enable realtime for live dashboard tables
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table hitl_tasks;
alter publication supabase_realtime add table agent_states;
alter publication supabase_realtime add table sync_log;
