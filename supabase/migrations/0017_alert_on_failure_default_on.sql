-- 0017 — Session-failure alerts default ON for new members.
--
-- If a recording session fails to connect, the family member is the only person
-- who can do anything about it, and the elder often won't report it. Defaulting
-- the preference off meant the common case was silent failure.
--
-- This is safe to default on because it is only a PREFERENCE, never a consent:
-- every send still passes lib/sms/gate.ts preSendGate, which requires
-- consent_state = 'opted_in' AND the number not suppressed. Turning this on can
-- never text someone who hasn't verified their number or who has replied STOP.
-- The disclosure they accept at /verify-phone — "automated, recurring texts ...
-- to help set up and record my family's stories" — covers a failed-session
-- alert.
alter table memberships alter column alert_on_failure set default true;

-- Existing members keep whatever they chose; only new rows pick up the default.
