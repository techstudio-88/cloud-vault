-- CloudVault Owner Control Center privileged reporting migration.
alter table platform_private.admins enable row level security;
alter table platform_private.audit_logs enable row level security;
alter table platform_private.support_tickets enable row level security;
create or replace function public.admin_list_accounts(search_term text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; begin
 if auth.uid() is null or not platform_private.is_admin() then raise exception 'Platform admin access required'; end if;
 select coalesce(jsonb_agg(x),'[]'::jsonb) into result from (
 select c.id,c.owner_id,u.email owner_email,c.email drive_email,c.display_name,c.status,c.storage_used_bytes,c.storage_total_bytes,c.last_synced_at,c.created_at,
 (select count(*) from public.file_metadata f where f.connected_account_id=c.id and not f.trashed) indexed_files
 from public.connected_accounts c left join auth.users u on u.id=c.owner_id
 where coalesce(u.email,'') ilike '%'||coalesce(search_term,'')||'%' or coalesce(c.email,'') ilike '%'||coalesce(search_term,'')||'%' order by c.created_at desc limit 300) x; return result; end $$;
create or replace function public.admin_list_files(search_term text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; begin
 if auth.uid() is null or not platform_private.is_admin() then raise exception 'Platform admin access required'; end if;
 select coalesce(jsonb_agg(x),'[]'::jsonb) into result from (
 select f.id,f.owner_id,u.email owner_email,f.connected_account_id,c.email drive_email,f.name,f.mime_type,f.size_bytes,f.is_folder,f.trashed,f.modified_at,f.synced_at
 from public.file_metadata f left join auth.users u on u.id=f.owner_id left join public.connected_accounts c on c.id=f.connected_account_id
 where coalesce(u.email,'') ilike '%'||coalesce(search_term,'')||'%' or coalesce(f.name,'') ilike '%'||coalesce(search_term,'')||'%' order by f.synced_at desc limit 300) x; return result; end $$;
create or replace function public.admin_list_jobs() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; begin
 if auth.uid() is null or not platform_private.is_admin() then raise exception 'Platform admin access required'; end if;
 select coalesce(jsonb_agg(x),'[]'::jsonb) into result from (select j.id,j.owner_id,u.email,j.job_type,j.status,j.bytes_total,j.bytes_processed,j.error_code,j.error_message,j.started_at,j.completed_at,j.created_at from public.storage_jobs j left join auth.users u on u.id=j.owner_id order by j.created_at desc limit 300) x; return result; end $$;
create or replace function public.admin_list_billing() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; begin
 if auth.uid() is null or not platform_private.is_admin() then raise exception 'Platform admin access required'; end if;
 select coalesce(jsonb_agg(x),'[]'::jsonb) into result from (select b.id,b.owner_id,u.email,b.plan_id,b.amount_inr,b.currency,b.status,b.billing_period,b.provider,b.provider_reference,b.description,b.created_at,b.paid_at from public.billing_records b left join auth.users u on u.id=b.owner_id order by b.created_at desc limit 300) x; return result; end $$;
create or replace function public.admin_send_notification(target_user_id uuid, notification_title text, notification_body text, notification_category text default 'admin') returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; begin
 if auth.uid() is null or not platform_private.is_admin() then raise exception 'Platform admin access required'; end if;
 if not exists(select 1 from auth.users where id=target_user_id) then raise exception 'User not found'; end if;
 if length(trim(coalesce(notification_title,'')))<3 or length(notification_title)>120 then raise exception 'Title must be 3–120 characters'; end if;
 if length(trim(coalesce(notification_body,'')))<3 or length(notification_body)>2000 then raise exception 'Message must be 3–2000 characters'; end if;
 insert into public.user_notifications(owner_id,title,body,category) values(target_user_id,trim(notification_title),trim(notification_body),left(coalesce(notification_category,'admin'),40)) returning to_jsonb(public.user_notifications.*) into result;
 insert into platform_private.audit_logs(actor_user_id,action,target_type,target_id,details) values(auth.uid(),'notification.sent','user',target_user_id::text,jsonb_build_object('title',trim(notification_title))); return result; end $$;
create or replace function public.admin_dashboard_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; begin
 if auth.uid() is null or not platform_private.is_admin() then raise exception 'Platform admin access required'; end if;
 select jsonb_build_object(
 'users',(select count(*) from auth.users),'active_subscriptions',(select count(*) from public.user_subscriptions where status='active'),
 'pending_subscriptions',(select count(*) from public.user_subscriptions where status='pending'),'connected_accounts',(select count(*) from public.connected_accounts where status='connected'),
 'storage_jobs',(select count(*) from public.storage_jobs),'open_tickets',(select count(*) from platform_private.support_tickets where status in ('open','in_progress')),
 'paid_revenue',(select coalesce(sum(amount_inr),0) from public.billing_records where status='paid'),'pending_revenue',(select coalesce(sum(amount_inr),0) from public.billing_records where status='pending'),
 'total_storage_used',(select coalesce(sum(storage_used_bytes),0) from public.connected_accounts where status='connected'),
 'total_storage_capacity',(select coalesce(sum(storage_total_bytes),0) from public.connected_accounts where status='connected'),
 'indexed_files',(select count(*) from public.file_metadata where not trashed),'failed_jobs',(select count(*) from public.storage_jobs where status='failed'),
 'successful_jobs',(select count(*) from public.storage_jobs where status='succeeded'),
 'recent_billing',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (select b.id,b.owner_id,u.email,b.plan_id,b.amount_inr,b.status,b.created_at from public.billing_records b left join auth.users u on u.id=b.owner_id order by b.created_at desc limit 8) x),
 'recent_audit',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (select id,actor_user_id,action,target_type,target_id,details,created_at from platform_private.audit_logs order by created_at desc limit 30) x),
 'plans',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (select id,name,monthly_price_inr,yearly_price_inr,storage_limit_bytes,connected_account_limit,seat_limit,is_active from public.subscription_plans order by storage_limit_bytes) x)) into result; return result; end $$;
revoke all on function public.admin_list_accounts(text) from public,anon;
revoke all on function public.admin_list_files(text) from public,anon;
revoke all on function public.admin_list_jobs() from public,anon;
revoke all on function public.admin_list_billing() from public,anon;
revoke all on function public.admin_send_notification(uuid,text,text,text) from public,anon;
grant execute on function public.admin_list_accounts(text) to authenticated;
grant execute on function public.admin_list_files(text) to authenticated;
grant execute on function public.admin_list_jobs() to authenticated;
grant execute on function public.admin_list_billing() to authenticated;
grant execute on function public.admin_send_notification(uuid,text,text,text) to authenticated;
