-- 0020 — Per-storyteller access for viewers (TODO 5.8).
--
-- Until now any member of a family could read every storyteller in it. Viewers
-- now see only the storytellers an admin has shared with them; owners and admins
-- keep seeing (and managing) all of them, since they steer schedules and invites.
--
-- storyteller_access is a plain access list (member ↔ storyteller), deliberately
-- separate from storyteller_relationships (address term / interviewer edge).
-- Composite FKs keep it honest: the member must belong to the storyteller's
-- family, and removing either the membership or the storyteller removes access.
--
-- RLS stays the boundary: every SELECT policy on storyteller-scoped data now goes
-- through can_see_storyteller(). Write policies are unchanged (already admin-only,
-- and admins see everything).

-- A storyteller is only ever assignable within its own family.
alter table storytellers add constraint storytellers_id_family_key unique (id, family_id);

create table storyteller_access (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null,
  user_id        uuid not null,
  storyteller_id uuid not null,
  created_at     timestamptz not null default now(),
  unique (user_id, storyteller_id),
  foreign key (user_id, family_id)
    references memberships (user_id, family_id) on delete cascade,
  foreign key (storyteller_id, family_id)
    references storytellers (id, family_id) on delete cascade
);

create index storyteller_access_family on storyteller_access (family_id);
create index storyteller_access_storyteller on storyteller_access (storyteller_id);

-- Owner/admin see every storyteller in the family; anyone else needs an access row.
create or replace function can_see_storyteller(p_family uuid, p_storyteller uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select has_family_role(p_family, 'admin')
      or exists (
        select 1 from storyteller_access a
        where a.family_id = p_family
          and a.storyteller_id = p_storyteller
          and a.user_id = auth.uid()
      );
$$;

alter table storyteller_access enable row level security;
-- Admins see and manage the family's list; a viewer can read only their own rows.
create policy sa_select on storyteller_access for select
  using (has_family_role(family_id, 'admin') or user_id = auth.uid());
create policy sa_write on storyteller_access for all
  using (has_family_role(family_id, 'admin'))
  with check (has_family_role(family_id, 'admin'));

-- --- SELECT policies → can_see_storyteller ---------------------------------

drop policy st_select on storytellers;
create policy st_select on storytellers for select
  using (can_see_storyteller(family_id, id));

drop policy ans_select on answers;
create policy ans_select on answers for select
  using (can_see_storyteller(family_id, storyteller_id));

drop policy ses_select on sessions;
create policy ses_select on sessions for select
  using (can_see_storyteller(family_id, storyteller_id));

drop policy sch_select on schedules;
create policy sch_select on schedules for select
  using (can_see_storyteller(family_id, storyteller_id));

drop policy tp_select on topic_preferences;
create policy tp_select on topic_preferences for select
  using (can_see_storyteller(family_id, storyteller_id));

drop policy rel_select on storyteller_relationships;
create policy rel_select on storyteller_relationships for select
  using (can_see_storyteller(family_id, storyteller_id));

drop policy tok_select on storyteller_tokens;
create policy tok_select on storyteller_tokens for select
  using (can_see_storyteller(family_id, storyteller_id));

drop policy ins_select on insights;
create policy ins_select on insights for select
  using (can_see_storyteller(family_id, storyteller_id));

drop policy smsout_select on sms_outbound;
create policy smsout_select on sms_outbound for select
  using (
    case when storyteller_id is null then has_family_role(family_id, 'admin')
         else can_see_storyteller(family_id, storyteller_id) end
  );

-- Exports: read AND request only for storytellers you can see.
drop policy exp_select on exports;
create policy exp_select on exports for select
  using (can_see_storyteller(family_id, storyteller_id));
drop policy exp_insert on exports;
create policy exp_insert on exports for insert
  with check (can_see_storyteller(family_id, storyteller_id));

-- Photos follow their story.
drop policy sp_select on story_photos;
create policy sp_select on story_photos for select
  using (exists (
    select 1 from answers a
    where a.id = story_photos.answer_id
      and a.family_id = story_photos.family_id
      and can_see_storyteller(a.family_id, a.storyteller_id)
  ));

-- Consent records: a storyteller's follow the storyteller; members' stay
-- family-visible (as before).
drop policy ce_select on consent_events;
create policy ce_select on consent_events for select
  using (
    case when subject_type = 'storyteller'
         then can_see_storyteller(family_id, subject_id)
         else is_member_of(family_id) end
  );

-- --- Invitations carry the storytellers a new viewer may see ---------------

alter table invitations add column storyteller_ids uuid[] not null default '{}';

create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_inv   invitations;
  v_email text;
begin
  select * into v_inv from invitations where token = p_token;
  if not found                       then raise exception 'invalid_invitation';        end if;
  if v_inv.accepted_at is not null   then raise exception 'invitation_already_used';    end if;
  if v_inv.expires_at  < now()       then raise exception 'invitation_expired';         end if;

  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_email is null                 then raise exception 'not_authenticated';          end if;
  if v_email <> lower(v_inv.email)   then raise exception 'email_mismatch';              end if;

  insert into memberships(user_id, family_id, role)
    values (auth.uid(), v_inv.family_id, v_inv.role)
    on conflict (user_id, family_id) do update set role = excluded.role;

  -- Viewers get exactly the storytellers the invite named — only ones that
  -- still exist in this family (a stale or forged id is simply skipped).
  if v_inv.role = 'viewer' then
    insert into storyteller_access(family_id, user_id, storyteller_id)
      select v_inv.family_id, auth.uid(), s.id
      from storytellers s
      where s.family_id = v_inv.family_id
        and s.id = any(v_inv.storyteller_ids)
      on conflict (user_id, storyteller_id) do nothing;
  end if;

  update invitations set accepted_at = now() where id = v_inv.id;
  return v_inv.family_id;
end; $function$;
