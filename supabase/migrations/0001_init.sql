-- ============================================================================
-- Storyline — multi-tenant schema (Supabase / Postgres)
-- Tenancy: `family` is the tenant. `family_id` on every domain row.
-- Separation enforced by Row-Level Security, not application code.
-- Two auth surfaces:
--   1. Family members -> Supabase Auth (auth.users) + memberships (this file)
--   2. Storytellers    -> scoped magic-link tokens, writes go through a
--      backend using the service role (which bypasses RLS). Storytellers are
--      NOT auth.users and never touch admin data.
-- ============================================================================

create extension if not exists pgcrypto;  -- gen_random_uuid()

-- ---------- enums ----------------------------------------------------------
create type membership_role  as enum ('owner','admin','viewer');
create type pronoun_set       as enum ('he_him','she_her','they_them');
create type relationship_type as enum ('any','parent','grandparent','aunt_uncle','sibling','spouse','other');
create type emo_weight        as enum ('light','medium','heavy');
create type session_status    as enum ('scheduled','sent','in_progress','completed','skipped','missed');
create type insight_type      as enum ('mic_failed','schedule_suggestion','engagement_drop');

-- ---------- updated_at helper ----------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ============================================================================
-- core tenant tables
-- ============================================================================
create table families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  plan        text not null default 'starter',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_families_u before update on families
  for each row execute function set_updated_at();

-- user <-> family, many-to-many, role per family.
-- This is what makes "a user of multiple families" trivial: one row per family,
-- and the same person can be 'owner' in one and 'viewer' in another.
create table memberships (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  family_id   uuid not null references families(id) on delete cascade,
  role        membership_role not null default 'viewer',
  created_at  timestamptz not null default now(),
  unique (user_id, family_id)
);
create index on memberships (user_id);
create index on memberships (family_id);

-- pending invitations for family members
create table invitations (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families(id) on delete cascade,
  email       text not null,
  role        membership_role not null default 'viewer',
  token       text not null unique,
  expires_at  timestamptz not null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

-- whose voice asks the questions (cloned voice profiles)
create table voice_profiles (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references families(id) on delete cascade,
  owner_user_id   uuid references auth.users(id) on delete set null,
  label           text not null,            -- e.g. "Paul's voice"
  provider        text not null default 'elevenlabs',
  provider_voice  text,                     -- external voice id
  lang            text not null default 'en',
  created_at      timestamptz not null default now()
);
create index on voice_profiles (family_id);

-- the people whose stories we capture
create table storytellers (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references families(id) on delete cascade,
  name         text not null,
  pronouns     pronoun_set not null default 'they_them',
  birth_year   int,                         -- anchors era-appropriate questions
  language     text not null default 'en',
  phone        text,                        -- where the SMS story link goes
  status       text not null default 'active',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on storytellers (family_id);
create trigger trg_storytellers_u before update on storytellers
  for each row execute function set_updated_at();

-- how each family member relates to a storyteller (the edge, not an attribute).
-- Same storyteller is "Dad" to one member and "Grandpa" to another.
create table storyteller_relationships (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references families(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  storyteller_id  uuid not null references storytellers(id) on delete cascade,
  kind            relationship_type not null default 'other',  -- drives applies_to gating
  address_term    text not null,            -- "Dad", "Grandma", "Uncle Joe"
  asker_relation  text,                     -- "your son", "your niece"
  is_interviewer  boolean not null default false,
  voice_profile_id uuid references voice_profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (user_id, storyteller_id)
);
create index on storyteller_relationships (family_id);
create index on storyteller_relationships (storyteller_id);

-- scoped device/magic-link tokens for the storyteller recording surface.
-- store only a hash; validate server-side; revocable.
create table storyteller_tokens (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references families(id) on delete cascade,
  storyteller_id  uuid not null references storytellers(id) on delete cascade,
  token_hash      text not null,
  created_at      timestamptz not null default now(),
  last_used_at    timestamptz,
  revoked_at      timestamptz
);
create index on storyteller_tokens (storyteller_id);

-- ============================================================================
-- prompts: global library (family_id null) + per-family custom
-- ============================================================================
create table prompts (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid references families(id) on delete cascade,  -- null = global
  lang            text not null default 'en',
  category        text not null,
  prompt          text not null,            -- may contain {address}/{name}/{partner} tokens
  applies_to      relationship_type[] not null default '{any}',
  emotional_weight emo_weight not null default 'light',
  photo_friendly  boolean not null default false,
  warm_up         boolean not null default false,
  follow_ups      text[] not null default '{}',
  created_at      timestamptz not null default now()
);
create index on prompts (family_id);
create index on prompts (lang);

-- ============================================================================
-- sessions & captured stories
-- ============================================================================
create table sessions (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references families(id) on delete cascade,
  storyteller_id  uuid not null references storytellers(id) on delete cascade,
  status          session_status not null default 'scheduled',
  scheduled_at    timestamptz,
  sent_at         timestamptz,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now()
);
create index on sessions (family_id);
create index on sessions (storyteller_id);

create table answers (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references families(id) on delete cascade,
  storyteller_id  uuid not null references storytellers(id) on delete cascade,
  session_id      uuid references sessions(id) on delete set null,
  prompt_id       uuid references prompts(id) on delete set null,
  parent_answer_id uuid references answers(id) on delete cascade,  -- set for AI follow-ups
  is_followup     boolean not null default false,
  question_text   text,                     -- resolved/asked text (incl. AI-generated)
  transcript      text,
  lang            text not null default 'en',
  audio_path      text,                     -- private storage key; serve via signed URL
  duration_sec    int,
  in_book         boolean not null default false,
  created_at      timestamptz not null default now()
);
create index on answers (family_id);
create index on answers (storyteller_id);
create index on answers (session_id);

create table schedules (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references families(id) on delete cascade,
  storyteller_id  uuid not null references storytellers(id) on delete cascade unique,
  days_of_week    text[] not null default '{TU,FR}',
  send_time_local time not null default '10:00',
  questions_per   int  not null default 2,
  quiet_after     time,
  paused          boolean not null default false,
  updated_at      timestamptz not null default now()
);
create trigger trg_schedules_u before update on schedules
  for each row execute function set_updated_at();

create table insights (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references families(id) on delete cascade,
  storyteller_id  uuid not null references storytellers(id) on delete cascade,
  type            insight_type not null,
  payload         jsonb not null default '{}',
  dismissed_at    timestamptz,
  created_at      timestamptz not null default now()
);
create index on insights (family_id);

-- ============================================================================
-- membership helper functions (used in every policy)
-- ============================================================================
create or replace function public.is_member_of(p_family uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.family_id = p_family and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_family_role(p_family uuid, p_min membership_role)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.family_id = p_family and m.user_id = auth.uid()
      and (case m.role  when 'owner' then 3 when 'admin' then 2 else 1 end)
       >= (case p_min   when 'owner' then 3 when 'admin' then 2 else 1 end)
  );
$$;

-- bootstrap: create a family and make the caller its owner, atomically.
-- Clients call this RPC instead of inserting into families directly.
create or replace function public.create_family(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into families(name) values (p_name) returning id into v_id;
  insert into memberships(user_id, family_id, role) values (auth.uid(), v_id, 'owner');
  return v_id;
end; $$;
grant execute on function public.create_family(text) to authenticated;

-- ============================================================================
-- enable RLS everywhere (default deny) + policies
-- ============================================================================
alter table families                  enable row level security;
alter table memberships                enable row level security;
alter table invitations                enable row level security;
alter table voice_profiles             enable row level security;
alter table storytellers               enable row level security;
alter table storyteller_relationships  enable row level security;
alter table storyteller_tokens         enable row level security;
alter table prompts                    enable row level security;
alter table sessions                   enable row level security;
alter table answers                    enable row level security;
alter table schedules                  enable row level security;
alter table insights                   enable row level security;

-- families: members read; only owner updates; insert only via create_family()
create policy fam_select on families for select using ( is_member_of(id) );
create policy fam_update on families for update using ( has_family_role(id,'owner') );

-- memberships: members can see their family's roster; admins manage it
create policy mem_select on memberships for select using ( is_member_of(family_id) );
create policy mem_write  on memberships for all
  using ( has_family_role(family_id,'admin') ) with check ( has_family_role(family_id,'admin') );

-- generic pattern for family-scoped tables: members read, admins write
create policy inv_select  on invitations               for select using ( is_member_of(family_id) );
create policy inv_write   on invitations               for all using ( has_family_role(family_id,'admin') ) with check ( has_family_role(family_id,'admin') );

create policy vp_select   on voice_profiles            for select using ( is_member_of(family_id) );
create policy vp_write    on voice_profiles            for all using ( has_family_role(family_id,'admin') ) with check ( has_family_role(family_id,'admin') );

create policy st_select   on storytellers              for select using ( is_member_of(family_id) );
create policy st_write    on storytellers              for all using ( has_family_role(family_id,'admin') ) with check ( has_family_role(family_id,'admin') );

create policy rel_select  on storyteller_relationships for select using ( is_member_of(family_id) );
create policy rel_write   on storyteller_relationships for all using ( has_family_role(family_id,'admin') ) with check ( has_family_role(family_id,'admin') );

create policy tok_select  on storyteller_tokens        for select using ( is_member_of(family_id) );
create policy tok_write   on storyteller_tokens        for all using ( has_family_role(family_id,'admin') ) with check ( has_family_role(family_id,'admin') );

create policy ses_select  on sessions                  for select using ( is_member_of(family_id) );
create policy ses_write   on sessions                  for all using ( has_family_role(family_id,'admin') ) with check ( has_family_role(family_id,'admin') );

create policy ans_select  on answers                   for select using ( is_member_of(family_id) );
create policy ans_write   on answers                   for all using ( has_family_role(family_id,'admin') ) with check ( has_family_role(family_id,'admin') );

create policy sch_select  on schedules                 for select using ( is_member_of(family_id) );
create policy sch_write   on schedules                 for all using ( has_family_role(family_id,'admin') ) with check ( has_family_role(family_id,'admin') );

create policy ins_select  on insights                  for select using ( is_member_of(family_id) );
create policy ins_write   on insights                  for all using ( has_family_role(family_id,'admin') ) with check ( has_family_role(family_id,'admin') );

-- prompts: everyone sees the global library + their own family's custom prompts;
-- admins manage their family's custom prompts. Globals are seeded via service role.
create policy pr_select on prompts for select
  using ( family_id is null or is_member_of(family_id) );
create policy pr_write  on prompts for all
  using ( family_id is not null and has_family_role(family_id,'admin') )
  with check ( family_id is not null and has_family_role(family_id,'admin') );

-- ============================================================================
-- NOTE on the storyteller surface:
-- The recording app authenticates with a magic-link token, not Supabase Auth.
-- Its reads/writes (start session, save answer, upload audio) go through a
-- backend endpoint that validates storyteller_tokens.token_hash and then uses
-- the SERVICE ROLE key to write. The service role bypasses RLS, so no
-- storyteller-facing policies are needed above, and a leaked link can only
-- ever touch that one storyteller's recording flow — never family admin data.
-- ============================================================================
