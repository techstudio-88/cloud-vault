-- Phase 5 SaaS: plans, subscriptions, billing records and notifications
create table if not exists public.subscription_plans (
 id text primary key, name text not null, description text not null default '',
 monthly_price_inr numeric(12,2), yearly_price_inr numeric(12,2),
 storage_limit_bytes bigint not null, connected_account_limit integer not null,
 seat_limit integer not null, features jsonb not null default '[]'::jsonb,
 is_active boolean not null default true, created_at timestamptz not null default now()
);
insert into public.subscription_plans(id,name,description,monthly_price_inr,yearly_price_inr,storage_limit_bytes,connected_account_limit,seat_limit,features)
values ('free','Free','For personal cloud organization',0,0,5368709120,1,1,'["5 GB storage","1 connected Drive","Personal workspace","Core file tools"]'::jsonb),
('pro','Pro','For power users managing multiple drives',null,null,107374182400,5,5,'["100 GB storage allowance","5 connected Drives","5 workspace seats","Smart routing and duplicate review","Automation rules"]'::jsonb),
('team','Team','For teams collaborating across cloud accounts',null,null,1099511627776,20,20,'["1 TB storage allowance","20 connected Drives","20 workspace seats","Team collaboration","Priority support"]'::jsonb)
on conflict(id) do update set name=excluded.name,description=excluded.description,storage_limit_bytes=excluded.storage_limit_bytes,connected_account_limit=excluded.connected_account_limit,seat_limit=excluded.seat_limit,features=excluded.features,is_active=true;
create table if not exists public.user_subscriptions (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null unique references auth.users(id) on delete cascade,
 plan_id text not null references public.subscription_plans(id), status text not null default 'active' check(status in ('active','pending','cancelled','past_due')),
 billing_cycle text not null default 'monthly' check(billing_cycle in ('monthly','yearly')),
 current_period_start timestamptz not null default now(), current_period_end timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.billing_records (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 subscription_id uuid references public.user_subscriptions(id) on delete set null, plan_id text references public.subscription_plans(id),
 amount_inr numeric(12,2), currency text not null default 'INR',
 status text not null default 'pending' check(status in ('pending','paid','failed','refunded','void')),
 billing_period text, provider text, provider_reference text, description text not null default '',
 created_at timestamptz not null default now(), paid_at timestamptz
);
create table if not exists public.user_notifications (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null, body text not null default '', category text not null default 'general',
 read_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists billing_records_owner_created_idx on public.billing_records(owner_id,created_at desc);
create index if not exists user_notifications_owner_created_idx on public.user_notifications(owner_id,created_at desc);
alter table public.subscription_plans enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.billing_records enable row level security;
alter table public.user_notifications enable row level security;
drop policy if exists subscription_plans_read on public.subscription_plans;
create policy subscription_plans_read on public.subscription_plans for select to authenticated using (is_active=true);
drop policy if exists user_subscriptions_owner_all on public.user_subscriptions;
create policy user_subscriptions_owner_all on public.user_subscriptions for all to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
drop policy if exists billing_records_owner_select on public.billing_records;
create policy billing_records_owner_select on public.billing_records for select to authenticated using (owner_id=(select auth.uid()));
drop policy if exists user_notifications_owner_all on public.user_notifications;
create policy user_notifications_owner_all on public.user_notifications for all to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
grant select on public.subscription_plans to authenticated;
grant select,insert,update on public.user_subscriptions to authenticated;
grant select on public.billing_records to authenticated;
grant select,update on public.user_notifications to authenticated;
