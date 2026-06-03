-- ============================================================================
-- TODO 6.1 — Weekly cron Worker: send the due story nudges
-- The cron scans schedules across all families and decides who to nudge "now".
-- Two columns make that possible against the existing one-row-per-storyteller
-- schedule:
--   * timezone     — IANA zone anchoring send_time_local / quiet_after. The
--                    Schedule UI collects a local send time but had nowhere to
--                    say *which* local. Nullable: app falls back to a default
--                    constant when unset (see lib/schedule.ts DEFAULTS).
--   * last_nudged_at — idempotency marker. The cron runs hourly; this stamps
--                    when we last nudged so a storyteller gets at most one
--                    nudge per local day even across multiple ticks.
-- No new RLS: schedules already has sch_select (member read) / sch_write (admin
-- write); the cron itself reads/writes via the service role (system job).
-- ============================================================================
alter table schedules add column timezone text;
alter table schedules add column last_nudged_at timestamptz;
