-- CloudVault Phase 6: protected platform administration
create schema if not exists platform_private;
revoke all on schema platform_private from public,anon,authenticated;
create table if not exists platform_private.admins(user_id uuid primary key references auth.users(id) on delete cascade,created_at timestamptz not null default now());
create table if not exists platform_private.audit_logs(id uuid primary key default gen_random_uuid(),actor_user_id uuid references auth.users(id) on delete set null,action text not null,target_type text,target_id text,details jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
create index if not exists platform_admin_audit_created_idx on platform_private.audit_logs(created_at desc);
create table if not exists platform_private.support_tickets(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete set null,subject text not null,message text not null,status text not null default 'open' check(status in('open','in_progress','resolved','closed')),priority text not null default 'normal' check(priority in('low','normal','high','urgent')),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists platform_support_status_created_idx on platform_private.support_tickets(status,created_at desc);
insert into platform_private.admins(user_id) values('c8d8fbd4-ad41-44db-b275-a129807bde75') on conflict do nothing;
create or replace function platform_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from platform_private.admins a where a.user_id=(select auth.uid())) $$;
revoke all on function platform_private.is_admin() from public,anon,authenticated;
create or replace function public.admin_dashboard_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not platform_private.is_admin() then raise exception 'Platform admin access required'; end if;
 return jsonb_build_object('users',(select count(*) from auth.users),'active_subscriptions',(select count(*) from public.user_subscriptions where status='active'),'pending_subscriptions',(select count(*) from public.user_subscriptions where status='pending'),'connected_accounts',(select count(*) from public.connected_accounts where status='connected'),'storage_jobs',(select count(*) from public.storage_jobs),'open_tickets',(select count(*) from platform_private.support_tickets where status in('open','in_progress')),'paid_revenue',(select coalesce(sum(amount_inr),0) from public.billing_records where status='paid'),'pending_revenue',(select coalesce(sum(amount_inr),0) from public.billing_records where status='pending'),'recent_billing',(select coalesce(jsonb_agg(x),'[]'::jsonb) from(select b.id,b.owner_id,u.email,b.plan_id,b.amount_inr,b.status,b.created_at from public.billing_records b left join auth.users u on u.id=b.owner_id order by b.created_at desc limit 8)x),'recent_audit',(select coalesce(jsonb_agg(x),'[]'::jsonb) from(select id,actor_user_id,action,target_type,target_id,details,created_at from platform_private.audit_logs order by created_at desc limit 30)x),'plans',(select coalesce(jsonb_agg(x),'[]'::jsonb) from(select id,name,monthly_price_inr,yearly_price_inr,is_active from public.subscription_plans order by monthly_price_inr nulls first)x));
end $$;
create or replace function public.admin_list_users(search_term text default '') returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not platform_private.is_admin() then raise exception 'Platform admin access required'; end if;
 return (select coalesce(jsonb_agg(x),'[]'::jsonb) from(select u.id,u.email,u.created_at,u.last_sign_in_at,u.banned_until,coalesce(s.status,'none') subscription_status,s.plan_id,p.name plan_name,(select count(*) from public.connected_accounts c where c.owner_id=u.id and c.status='connected') connected_accounts from auth.users u left join public.user_subscriptions s on s.owner_id=u.id left join public.subscription_plans p on p.id=s.plan_id where coalesce(u.email,'') ilike '%'||coalesce(search_term,'')||'%' order by u.created_at desc limit 200)x);
end $$;
create or replace function public.admin_update_subscription(target_user_id uuid,target_plan_id text,target_status text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result public.user_subscriptions;
begin
 if auth.uid() is null or not platform_private.is_admin() then raise exception 'Platform admin access required'; end if;
 if target_status not in('active','pending','cancelled','past_due') then raise exception 'Invalid subscription status'; end if;
 if not exists(select 1 from public.subscription_plans where id=target_plan_id) then raise exception 'Plan not found'; end if;
 insert into public.user_subscriptions(owner_id,plan_id,status,billing_cycle,updated_at) values(target_user_id,target_plan_id,target_status,'monthly',now()) on conflict(owner_id) do update set plan_id=excluded.plan_id,status=excluded.status,updated_at=now() returning * into result;
 insert into platform_private.audit_logs(actor_user_id,action,target_type,target_id,details) values(auth.uid(),'subscription.updated','user',target_user_id::text,jsonb_build_object('plan_id',target_plan_id,'status',target_status));
 return to_jsonb(result);
end $$;
create or replace function public.admin_list_support_tickets() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not platform_private.is_admin() then raise exception 'Platform admin access required'; end if;
 return (select coalesce(jsonb_agg(x),'[]'::jsonb) from(select t.*,u.email from platform_private.support_tickets t left join auth.users u on u.id=t.user_id order by t.created_at desc limit 200)x);
end $$;
create or replace function public.admin_update_ticket(ticket_id uuid,next_status text,next_priority text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not platform_private.is_admin() then raise exception 'Platform admin access required'; end if;
 if next_status not in('open','in_progress','resolved','closed') then raise exception 'Invalid ticket status'; end if;
 if next_priority is not null and next_priority not in('low','normal','high','urgent') then raise exception 'Invalid priority'; end if;
 update platform_private.support_tickets t set status=next_status,priority=coalesce(next_priority,t.priority),updated_at=now() where t.id=ticket_id returning to_jsonb(t) into result;
 if result is null then raise exception 'Ticket not found'; end if;
 insert into platform_private.audit_logs(actor_user_id,action,target_type,target_id) values(auth.uid(),'support_ticket.updated','ticket',ticket_id::text);
 return result;
end $$;
revoke all on function public.admin_dashboard_snapshot() from public,anon;
revoke all on function public.admin_list_users(text) from public,anon;
revoke all on function public.admin_update_subscription(uuid,text,text) from public,anon;
revoke all on function public.admin_list_support_tickets() from public,anon;
revoke all on function public.admin_update_ticket(uuid,text,text) from public,anon;
grant execute on function public.admin_dashboard_snapshot() to authenticated;
grant execute on function public.admin_list_users(text) to authenticated;
grant execute on function public.admin_update_subscription(uuid,text,text) to authenticated;
grant execute on function public.admin_list_support_tickets() to authenticated;
grant execute on function public.admin_update_ticket(uuid,text,text) to authenticated;


-- Authenticated members can open tickets; ticket storage remains private.
create or replace function public.support_create_ticket(ticket_subject text,ticket_message text,ticket_priority text default 'normal')
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if length(trim(coalesce(ticket_subject,'')))<4 or length(ticket_subject)>140 then raise exception 'Subject must be 4–140 characters'; end if;
 if length(trim(coalesce(ticket_message,'')))<10 or length(ticket_message)>5000 then raise exception 'Message must be 10–5000 characters'; end if;
 if ticket_priority not in('low','normal','high','urgent') then raise exception 'Invalid priority'; end if;
 insert into platform_private.support_tickets(user_id,subject,message,priority) values(auth.uid(),trim(ticket_subject),trim(ticket_message),ticket_priority)
 returning to_jsonb(platform_private.support_tickets.*) into result;
 return result;
end $$;
revoke all on function public.support_create_ticket(text,text,text) from public,anon;
grant execute on function public.support_create_ticket(text,text,text) to authenticated;
