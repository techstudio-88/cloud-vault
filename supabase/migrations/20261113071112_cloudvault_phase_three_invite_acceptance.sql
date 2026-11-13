create or replace function public.accept_workspace_invite(p_token_hash text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_invite public.workspace_invites%rowtype;
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email',''));
begin
  if v_user_id is null or v_email = '' then raise exception 'Sign in before accepting an invitation.'; end if;
  select * into v_invite from public.workspace_invites
  where token_hash = p_token_hash and lower(invited_email) = v_email
    and accepted_at is null and expires_at > now() for update;
  if not found then raise exception 'Invitation is invalid, expired, already used, or belongs to another email.'; end if;
  insert into public.workspace_members(workspace_id,user_id,role,invited_at,joined_at)
  values(v_invite.workspace_id,v_user_id,v_invite.role,v_invite.created_at,now())
  on conflict(workspace_id,user_id) do update set role=excluded.role, joined_at=now();
  update public.workspace_invites set accepted_at=now() where id=v_invite.id;
  return v_invite.workspace_id;
end;
$$;
revoke all on function public.accept_workspace_invite(text) from public, anon;
grant execute on function public.accept_workspace_invite(text) to authenticated;
