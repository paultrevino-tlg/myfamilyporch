-- A2P 10DLC double opt-in (TODO 4.3): recipient-level SMS consent state.
-- 'pending'   -> number saved by an admin, storyteller not yet confirmed; the
--                nudge path sends a one-time "reply YES to start" confirmation
--                instead of a reminder.
-- 'confirmed' -> storyteller replied YES/START; reminders may send.
-- 'stopped'   -> storyteller replied STOP; never send (Twilio also blocks).
-- Existing rows with a phone deliberately start at 'pending' so every
-- recipient goes through the confirmation step once.
alter table storytellers
  add column if not exists sms_consent text not null default 'pending'
    check (sms_consent in ('pending','confirmed','stopped')),
  add column if not exists sms_confirm_sent_at timestamptz;
