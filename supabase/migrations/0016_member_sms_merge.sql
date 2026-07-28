-- 0016 — Merge the member's two phone numbers into one consented number.
--
-- Before this migration a member could carry TWO numbers with TWO independent
-- consent records: `sms_phone`/`consent_state` (the Phase 4C first-party opt-in,
-- gated by lib/sms/gate.ts) and `alert_phone` (added in 0006 for session-failure
-- alerts, with its own checkbox on /settings and NO pre-send gate at all). The
-- second path could text a number that had already replied STOP — a carrier
-- opt-out violation — because lib/sms/admin-alert.ts never consulted
-- sms_suppressions.
--
-- After this migration there is exactly ONE member number (`sms_phone`), ONE
-- consent record (`consent_state`), and failure alerts become a preference on
-- that consented number rather than a second destination.
--
-- Deliberately NOT migrated: the old alert_phone VALUE does not become sms_phone.
-- The alert checkbox captured a different disclosure than the 4C opt-in, so
-- carrying it over would manufacture a consent record the member never gave.
-- Members re-enter and re-verify their number at /verify-phone.

-- The preference: does this member want a text when a recording session fails?
alter table memberships
  add column alert_on_failure boolean not null default false;

comment on column memberships.alert_on_failure is
  'Member wants a session-failure alert text. Delivered to sms_phone and still subject to the universal pre-send gate (consent_state = opted_in AND not suppressed).';

-- Preserve intent, not consent: anyone who had set an alert number wanted these
-- alerts, so keep the preference on. They will not receive one until they
-- complete the 4C verification, because the pre-send gate requires opted_in.
update memberships
   set alert_on_failure = true
 where alert_phone is not null
   and btrim(alert_phone) <> '';

-- Contract: nothing reads alert_phone after this release (lib/settings.ts,
-- lib/sms/admin-alert.ts, and (app)/settings/actions.ts all move to
-- sms_phone + alert_on_failure in the same commit).
alter table memberships drop column alert_phone;
