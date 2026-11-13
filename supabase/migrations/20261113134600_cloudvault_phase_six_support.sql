-- CloudVault Phase 6: member support intake
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
