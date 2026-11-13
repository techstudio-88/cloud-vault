create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invited_email text not null,
  role text not null default 'member' check (role in ('admin','member','viewer')),
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists workspace_invites_workspace_created_idx on public.workspace_invites(workspace_id, created_at desc);
create index if not exists workspace_invites_email_idx on public.workspace_invites(lower(invited_email));
alter table public.workspace_invites enable row level security;
create policy "workspace_invites_owner_select" on public.workspace_invites for select to authenticated using (private.is_workspace_owner(workspace_id, (select auth.uid())));
create policy "workspace_invites_owner_insert" on public.workspace_invites for insert to authenticated with check (private.is_workspace_owner(workspace_id, (select auth.uid())) and invited_by = (select auth.uid()));
create policy "workspace_invites_owner_update" on public.workspace_invites for update to authenticated using (private.is_workspace_owner(workspace_id, (select auth.uid()))) with check (private.is_workspace_owner(workspace_id, (select auth.uid())));
create policy "workspace_invites_owner_delete" on public.workspace_invites for delete to authenticated using (private.is_workspace_owner(workspace_id, (select auth.uid())));
alter table public.automation_rules add column if not exists schedule_interval text check (schedule_interval in ('hourly','daily','weekly'));
alter table public.automation_rules add column if not exists next_run_at timestamptz;
alter table public.automation_rules add column if not exists last_status text;
alter table public.automation_rules add column if not exists run_count integer not null default 0;
create index if not exists automation_rules_enabled_schedule_idx on public.automation_rules(enabled, next_run_at) where enabled = true;
