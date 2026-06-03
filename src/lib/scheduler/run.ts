// TODO 6.1 — the weekly cron's nudge half. SERVER-ONLY (service role).
//
// Scans every active schedule across ALL families and sends the story nudges
// that are "due now" in each storyteller's own timezone, at most one per local
// day. The cron fires hourly (see wrangler.jsonc triggers.crons), so a nudge
// lands within the hour of its send time. Pause-aware, quiet-hours-aware, and
// fail-soft per row — one bad row never stops the loop. The three signals
// (6.2–6.4) are computed separately; this only drives outreach.
import { supabaseService } from "@/lib/supabase/service";
import { sendStorytellerNudge } from "@/lib/sms/nudge";
import { DEFAULT_TIMEZONE, type DayCode } from "@/lib/schedule";

// Intl "short" weekday → our canonical two-letter code (schedules.days_of_week).
const WEEKDAY_CODE: Record<string, DayCode> = {
  Sun: "SU",
  Mon: "MO",
  Tue: "TU",
  Wed: "WE",
  Thu: "TH",
  Fri: "FR",
  Sat: "SA",
};

// A moment expressed in a given IANA zone, reduced to the pieces the due-check
// needs: weekday code, "HH:MM" wall time, and the local calendar day. Throws if
// the zone is unrecognized (callers fall back to DEFAULT_TIMEZONE).
function inZone(at: Date, timeZone: string): { day: DayCode; hhmm: string; ymd: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  let hour = get("hour");
  if (hour === "24") hour = "00"; // some engines emit "24" at midnight
  return {
    day: WEEKDAY_CODE[get("weekday")],
    hhmm: `${hour}:${get("minute")}`,
    ymd: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

// Resolve "now in this zone", falling back to the default for a bad zone (which
// saveSchedule already guards against, but the cron must never throw).
function localNow(at: Date, timeZone: string) {
  try {
    return inZone(at, timeZone);
  } catch {
    return inZone(at, DEFAULT_TIMEZONE);
  }
}

// Postgres `time` → "HH:MM" (it arrives as "HH:MM:SS").
function toHHMM(t: string | null): string | null {
  return t ? t.slice(0, 5) : null;
}

// The fields the due-check reads off a schedule row (paused rows are excluded
// upstream, so it isn't considered here).
export type DueRow = {
  days_of_week: string[] | null;
  send_time_local: string | null;
  quiet_after: string | null;
  timezone: string | null;
  last_nudged_at: string | null;
};

// Pure decision: is this schedule due for a nudge at `now`? Evaluated entirely
// in the row's own timezone — scheduled today, past the send time, not into
// quiet hours, and not already nudged today (the per-local-day idempotency that
// keeps the hourly cron to one nudge). Exported so it can be unit-tested without
// a database or sending anything.
export function isScheduleDue(row: DueRow, now: Date): boolean {
  const tz = (row.timezone ?? DEFAULT_TIMEZONE).trim() || DEFAULT_TIMEZONE;
  const local = localNow(now, tz);

  const days = row.days_of_week ?? [];
  if (!days.includes(local.day)) return false;

  const sendTime = toHHMM(row.send_time_local) ?? "10:00";
  if (local.hhmm < sendTime) return false; // before today's send time

  const quiet = toHHMM(row.quiet_after);
  if (quiet && local.hhmm >= quiet) return false; // into quiet hours

  if (row.last_nudged_at) {
    const lastLocal = localNow(new Date(row.last_nudged_at), tz);
    if (lastLocal.ymd === local.ymd) return false; // already nudged today
  }

  return true;
}

export type ScheduleRunSummary = {
  considered: number; // active (non-paused) schedules examined
  sent: string[]; // storyteller ids actually nudged this run
  skipped: { id: string; reason: string }[]; // due but not sent (no phone, etc.)
};

export async function runScheduler(now: Date = new Date()): Promise<ScheduleRunSummary> {
  const db = supabaseService();
  const summary: ScheduleRunSummary = { considered: 0, sent: [], skipped: [] };

  // System job: read across every family via the service role. Paused rows are
  // excluded at the source.
  const { data: rows, error } = await db
    .from("schedules")
    .select(
      "family_id, storyteller_id, days_of_week, send_time_local, quiet_after, timezone, last_nudged_at",
    )
    .eq("paused", false);
  if (error || !rows) return summary;

  for (const row of rows) {
    summary.considered++;

    if (!isScheduleDue(row, now)) continue;

    // Due. Send (fail-soft) and stamp only on an actual send, so a misconfigured
    // row (no phone / no link) re-attempts cheaply next tick and self-heals the
    // moment it's fixed.
    try {
      const result = await sendStorytellerNudge(row.storyteller_id, row.family_id);
      if (result.status === "sent") {
        summary.sent.push(row.storyteller_id);
        await db
          .from("schedules")
          .update({ last_nudged_at: now.toISOString() })
          .eq("storyteller_id", row.storyteller_id);
      } else {
        summary.skipped.push({ id: row.storyteller_id, reason: result.reason });
      }
    } catch (e) {
      console.error("[scheduler] nudge failed", row.storyteller_id, e);
      summary.skipped.push({ id: row.storyteller_id, reason: "error" });
    }
  }

  return summary;
}
