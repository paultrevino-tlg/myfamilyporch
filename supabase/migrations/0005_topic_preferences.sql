-- ============================================================================
-- TODO 5.3 — Topics steering (focus / ease-off / avoid)
-- Per-storyteller admin preference over the 12 library categories. The opening-
-- question selector (lib/ai/assembly.ts) reads these: `focus` biases a category
-- to the front, `ease_off` sinks it, `avoid` excludes it. Only non-neutral rows
-- exist — neutral is simply the absence of a row. "Weight, not a script": the AI
-- still chases whatever the elder opens; this only nudges which corners we lead
-- toward and which to leave alone.
-- ============================================================================
create type topic_preference as enum ('focus', 'ease_off', 'avoid');

create table topic_preferences (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references families(id) on delete cascade,
  storyteller_id  uuid not null references storytellers(id) on delete cascade,
  category        text not null,            -- matches prompts.category (free text)
  preference      topic_preference not null,
  updated_at      timestamptz not null default now(),
  unique (storyteller_id, category)
);
create index on topic_preferences (family_id);
create index on topic_preferences (storyteller_id);

create trigger trg_topic_preferences_u before update on topic_preferences
  for each row execute function set_updated_at();

-- RLS: any member reads; only admins steer. Same shape as every domain table.
alter table topic_preferences enable row level security;
create policy tp_select on topic_preferences for select
  using ( is_member_of(family_id) );
create policy tp_write  on topic_preferences for all
  using ( has_family_role(family_id, 'admin') )
  with check ( has_family_role(family_id, 'admin') );
