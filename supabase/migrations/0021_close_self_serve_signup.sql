-- 0021 — Close self-serve signup (TODO 9.0; SPEC § Marketing, signup & billing).
--
-- Pay first, account second: a family (and its owner's account) is created only
-- server-side — today by the operator script, from 9.3 by the Stripe webhook once
-- a subscription is active. Signed-in users can no longer create a family
-- themselves, so create_family loses its client grants.
--
-- provision_family / user_id_by_email are the server's tools for that, callable
-- by the service role only. Supabase grants EXECUTE on new public functions to
-- anon + authenticated by default, so each is revoked explicitly.

revoke execute on function public.create_family(text) from public, anon, authenticated;

-- Resolve an existing auth user by email (the Admin API has no lookup by email).
create or replace function public.user_id_by_email(p_email text)
returns uuid
language sql stable security definer
set search_path = public, auth
as $$
  select id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
$$;

revoke execute on function public.user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.user_id_by_email(text) to service_role;

-- Create a family owned by p_user, atomically. Idempotent: if p_user already
-- owns a family, that family is returned instead of creating a second one, so a
-- replayed webhook or a re-run script never duplicates.
create or replace function public.provision_family(p_user uuid, p_name text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if p_user is null or coalesce(trim(p_name), '') = '' then
    raise exception 'provision_family: user and family name are required';
  end if;

  select family_id into v_id
  from memberships
  where user_id = p_user and role = 'owner'
  order by created_at
  limit 1;
  if found then return v_id; end if;

  insert into families(name) values (trim(p_name)) returning id into v_id;
  insert into memberships(user_id, family_id, role) values (p_user, v_id, 'owner');
  return v_id;
end; $$;

revoke execute on function public.provision_family(uuid, text) from public, anon, authenticated;
grant execute on function public.provision_family(uuid, text) to service_role;
