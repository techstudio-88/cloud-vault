alter table public.file_metadata add column if not exists provider_md5_checksum text;
create index if not exists file_metadata_owner_checksum_idx on public.file_metadata(owner_id, provider_md5_checksum, size_bytes) where trashed = false and is_folder = false and provider_md5_checksum is not null;
create table if not exists public.automation_runs (
 id uuid primary key default gen_random_uuid(),
 automation_rule_id uuid not null references public.automation_rules(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'running' check (status in ('running','completed','failed')),
 started_at timestamptz not null default now(),
 completed_at timestamptz,
 result jsonb not null default '{}'::jsonb,
 error_message text
);
create index if not exists automation_runs_owner_started_idx on public.automation_runs(owner_id, started_at desc);
create index if not exists automation_runs_rule_started_idx on public.automation_runs(automation_rule_id, started_at desc);
alter table public.automation_runs enable row level security;
drop policy if exists automation_runs_owner_select on public.automation_runs;
create policy automation_runs_owner_select on public.automation_runs for select to authenticated using (owner_id = (select auth.uid()));
