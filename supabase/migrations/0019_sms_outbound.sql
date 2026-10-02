-- 0019 — Outbound SMS log (TODO 4.5).
--
-- 2026-10-02: a member pressed "Ask now" / "Send a nudge" and concluded nothing
-- was sending — Twilio showed all three texts DELIVERED, but the app had no
-- record of what went out or whether it arrived. This table is that record, for
-- story nudges: one row per send, keyed by Twilio's message SID, with the
-- delivery status Twilio reports back to api/sms/status.
--
-- No phone number is stored — the row only needs to say "a request went to this
-- storyteller at this time, and here's what happened to it".
--
-- RLS: family members may READ their family's rows (the storyteller page shows
-- "Last request: … · Delivered"). There are no write policies: only the service
-- role writes (the send path and the signed Twilio status callback).

create table sms_outbound (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references families(id) on delete cascade,
  storyteller_id uuid references storytellers(id) on delete cascade,
  kind           text not null check (kind in ('nudge')),
  source         text not null check (source in ('manual', 'schedule')),
  twilio_sid     text unique,
  -- Twilio's MessageStatus: queued → sent → delivered | undelivered | failed.
  status         text not null default 'queued',
  error_code     int,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index sms_outbound_storyteller_recent on sms_outbound (storyteller_id, created_at desc);
create index sms_outbound_family on sms_outbound (family_id);

alter table sms_outbound enable row level security;

create policy smsout_select on sms_outbound for select using ( is_member_of(family_id) );
