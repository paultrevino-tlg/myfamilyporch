-- Phase A of the consent-flow redesign (docs/consent-flow.md): the audit spine
-- and the SPEC's first-party consent vocabulary. This replaces the proxy-consent
-- "reply YES" model (see 0014) at the schema level. No behavior change ships in
-- this migration — the flows that write these tables land in later phases.
-- Everything here is additive EXCEPT the storyteller state rename (mechanical,
-- value-preserving).

-- ---------------------------------------------------------------------------
-- 1. Storyteller consent state: rename sms_consent -> consent_state and adopt
--    the SPEC vocabulary. Value remap is 1:1 and behavior-preserving:
--      confirmed -> opted_in     stopped -> opted_out     pending -> pending
-- ---------------------------------------------------------------------------
alter table storytellers drop constraint if exists storytellers_sms_consent_check;
alter table storytellers rename column sms_consent to consent_state;
update storytellers set consent_state = case consent_state
  when 'confirmed' then 'opted_in'
  when 'stopped'   then 'opted_out'
  else 'pending'
end;
alter table storytellers
  alter column consent_state set default 'pending',
  add constraint storytellers_consent_state_check
    check (consent_state in ('pending','opted_in','opted_out'));

-- ---------------------------------------------------------------------------
-- 2. Member-level SMS consent. The family member is now an A2P recipient too
--    (magic-link SMS, copy-paste block delivery, "ready to begin"). Identity is
--    the per-family membership row, so consent + program phone + language live
--    there. sms_phone is the number the member opts in with (distinct from the
--    per-admin failure-alert alert_phone added in 0006).
-- ---------------------------------------------------------------------------
alter table memberships
  add column if not exists sms_phone text,
  add column if not exists consent_state text not null default 'pending'
    check (consent_state in ('pending','opted_in','opted_out')),
  add column if not exists sms_confirm_sent_at timestamptz,
  add column if not exists language text not null default 'en'
    check (language in ('en','es'));

-- ---------------------------------------------------------------------------
-- 3. consent_events: append-only audit of every opt-in / opt-out / re-opt-in.
--    Never mutated — a state change is a new row. Written via the service role;
--    family members may READ their own family's trail. Carriers audit this and
--    TCPA plaintiffs demand it, so it stores the EXACT localized disclosure.
-- ---------------------------------------------------------------------------
create table consent_events (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references families(id) on delete cascade,
  subject_type    text not null check (subject_type in ('member','storyteller')),
  subject_id      uuid not null,          -- memberships.id or storytellers.id
  phone_e164      text not null,          -- the number consent applies to
  event_type      text not null check (event_type in ('opt_in','opt_out','re_opt_in')),
  method          text not null,          -- magic_link | auth_page | sms_stop | sms_start | natural_optout
  token_id        uuid,                   -- links back to the tokenized invite (no FK: tokens are signed, not always DB rows)
  disclosure_text text not null,          -- EXACT copy shown/sent at the moment of consent
  language        text check (language in ('en','es')),  -- language the disclosure was shown in
  ip              inet,
  user_agent      text,
  occurred_at     timestamptz not null default now()
);
create index on consent_events (subject_id, occurred_at desc);
create index on consent_events (phone_e164);

-- ---------------------------------------------------------------------------
-- 4. sms_suppressions: GLOBAL, per-number opt-out list (no family_id). An
--    opt-out survives even if a different family later tries to set up the same
--    number. The pre-send gate (service role) checks this before every A2P send.
-- ---------------------------------------------------------------------------
create table sms_suppressions (
  phone_e164    text primary key,
  reason        text not null,   -- sms_stop | natural_optout | carrier_block | manual
  source        text,            -- inbound | provider_webhook | admin
  suppressed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5. sms_inbound: audit trail of every inbound message + the natural-language
--    opt-out review queue (needs_review). Global (an inbound number may match
--    several families or none), so touched only by the service role.
-- ---------------------------------------------------------------------------
create table sms_inbound (
  id           uuid primary key default gen_random_uuid(),
  phone_e164   text not null,
  body         text not null,
  matched      text,             -- stop | help | start | natural_optout | none
  needs_review boolean not null default false,
  received_at  timestamptz not null default now()
);
create index on sms_inbound (phone_e164, received_at desc);

-- ---------------------------------------------------------------------------
-- 6. RLS. consent_events: members read their family's trail; writes are
--    service-role only (append-only — no member insert/update/delete policy).
--    sms_suppressions + sms_inbound are global operational tables touched only
--    by the service role, so enable RLS with NO policies (default deny to
--    anon/authenticated; the service role bypasses RLS).
-- ---------------------------------------------------------------------------
alter table consent_events   enable row level security;
alter table sms_suppressions enable row level security;
alter table sms_inbound      enable row level security;

create policy ce_select on consent_events for select using ( is_member_of(family_id) );
