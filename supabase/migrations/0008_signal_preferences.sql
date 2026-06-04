-- ============================================================================
-- TODO 6.5 — Sensitivity controls for the adaptive signals
-- Per-storyteller knobs on the existing one-row-per-storyteller schedule. The
-- adaptive-signal cron (6.3 schedule-suggestion, 6.4 engaging-less) reads these
-- to decide whether — and how readily — to surface a signal. mic-failed (2.4)
-- stays always-on: it's an acute technical fault, not something to silence.
--   * signal_engagement_enabled            — turn the engaging-less signal off
--                                             entirely (SPEC: "Tunable, incl. off").
--   * signal_engagement_sensitivity        — how big a drop trips it: 'gentle'
--                                             (only a large drop), 'standard'
--                                             (the current behavior), 'sensitive'
--                                             (a smaller drop). See deriveEngagementDrop.
--   * signal_schedule_suggestion_enabled   — turn the time-shift suggestion off.
-- Pause is the broader exclusion and already exists (schedules.paused); the cron
-- runners skip paused rows. No new RLS: columns inherit sch_select (member read)
-- / sch_write (admin write); the cron reads via the service role (system job).
-- ============================================================================
create type engagement_sensitivity as enum ('gentle', 'standard', 'sensitive');

alter table schedules add column signal_engagement_enabled boolean not null default true;
alter table schedules add column signal_engagement_sensitivity engagement_sensitivity not null default 'standard';
alter table schedules add column signal_schedule_suggestion_enabled boolean not null default true;
