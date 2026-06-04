// TODO 6.3 — the schedule-suggestion signal. SERVER-ONLY (service role).
//
// SPEC § three signals: when an elder *consistently engages at a different hour*
// than they're nudged, recommend (never auto-change) a time shift in a positive
// tone + text the family. Requires a baseline + a meaningful, sustained gap.
// Plain, explainable arithmetic over completed-session times, all evaluated in
// the storyteller's own timezone. Throttled and pause-aware. Computed by the same
// hourly cron that sends nudges (TODO 6.1); the throttle keeps it effectively
// weekly.
import { supabaseService } from "@/lib/supabase/service";
import { alertFamilyAdmins } from "@/lib/sms/admin-alert";
import { DEFAULT_TIMEZONE } from "@/lib/schedule";

// Tuning — all in one place, all explainable.
const MIN_SESSIONS = 4; // baseline: too few completed sessions → no opinion
const RECENT_WINDOW = 8; // only look at the most recent N completed sessions
const GAP_HOURS = 2; // "meaningful": median engagement vs nudge must differ by ≥ this
const CLUSTER_RADIUS = 1.5; // "sustained": sessions within ±this of the median…
const CLUSTER_FRACTION = 0.6; // …must be at least this share, else it's scattered
const THROTTLE_DAYS = 30; // don't re-suggest (or re-nag a "keep") within this window

// Local decimal hour (e.g. 14.5 = 2:30 PM) for an instant in an IANA zone. Uses
// the same Intl approach as scheduler/run.ts. Throws on a bad zone (caller falls
// back to DEFAULT_TIMEZONE).
function localHourDecimal(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  let hour = parseInt(get("hour"), 10);
  if (hour === 24) hour = 0; // some engines emit "24" at midnight
  return hour + parseInt(get("minute"), 10) / 60;
}

function safeLocalHour(at: Date, timeZone: string): number {
  try {
    return localHourDecimal(at, timeZone);
  } catch {
    return localHourDecimal(at, DEFAULT_TIMEZONE);
  }
}

// "HH:MM" / "HH:MM:SS" → decimal hour. Defaults to 10:00 (the schedules default).
function hhmmToDecimal(t: string | null): number {
  if (!t) return 10;
  const [h, m] = t.split(":");
  return parseInt(h, 10) + (parseInt(m ?? "0", 10) || 0) / 60;
}

// Decimal hour → "HH:MM", rounded to the nearest half hour (the granularity of
// the Schedule picker). 14.4 → "14:30", 23.8 → "00:00" (wraps).
function decimalToHHMM(hourDecimal: number): string {
  const halves = Math.round(hourDecimal * 2);
  const total = ((halves % 48) + 48) % 48; // wrap into [0,48) half-hours
  const h = Math.floor(total / 2);
  const m = (total % 2) * 30;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Decimal hour → friendly 12-hour label ("2:30 PM"). Rounded to the minute.
function decimalToLabel(hourDecimal: number): string {
  let h = Math.floor(hourDecimal);
  let m = Math.round((hourDecimal - h) * 60);
  if (m === 60) {
    m = 0;
    h += 1;
  }
  h = ((h % 24) + 24) % 24;
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export type ScheduleSuggestion = {
  bestHourLocal: number; // median engagement hour (decimal), in the storyteller's zone
  bestTimeLabel: string; // "2:30 PM"
  suggestedSendTime: string; // "HH:MM", the median rounded to the nearest half hour
  currentSendTime: string; // "HH:MM" the nudge currently goes out
  sampleSize: number; // completed sessions considered
  clusteredCount: number; // how many of them fell near the median
  timezone: string;
};

// PURE decision. Given a storyteller's recent completed-session engagement times
// (ISO strings), their current nudge send time, and their timezone, decide
// whether to recommend a shift. Returns null unless the baseline + meaningful +
// sustained gates all pass. No DB, no clock — fully unit-testable.
export function deriveScheduleSuggestion(input: {
  engagementTimestamps: string[];
  sendTimeLocal: string | null;
  timezone: string | null;
}): ScheduleSuggestion | null {
  const tz = (input.timezone ?? DEFAULT_TIMEZONE).trim() || DEFAULT_TIMEZONE;

  // Most recent sessions only (the timestamps may not be pre-sorted).
  const recent = [...input.engagementTimestamps]
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, RECENT_WINDOW);

  if (recent.length < MIN_SESSIONS) return null; // baseline gate

  const hours = recent.map((iso) => safeLocalHour(new Date(iso), tz));
  const med = median(hours);
  const sendHour = hhmmToDecimal(input.sendTimeLocal);

  if (Math.abs(med - sendHour) < GAP_HOURS) return null; // meaningful gate

  // Sustained gate: a majority must cluster near the median, not be scattered.
  const clusteredCount = hours.filter(
    (h) => Math.abs(h - med) <= CLUSTER_RADIUS,
  ).length;
  if (clusteredCount / hours.length < CLUSTER_FRACTION) return null;

  return {
    bestHourLocal: med,
    bestTimeLabel: decimalToLabel(med),
    suggestedSendTime: decimalToHHMM(med),
    currentSendTime: decimalToHHMM(sendHour),
    sampleSize: hours.length,
    clusteredCount,
    timezone: tz,
  };
}

export type SuggestionRunSummary = {
  considered: number; // active (non-paused) schedules examined
  suggested: string[]; // storyteller ids that got a fresh suggestion this run
  throttled: number; // would-suggest rows skipped by the throttle window
};

// Scan every active schedule, compute the suggestion, and emit a throttled
// insight + family SMS for each fresh one. Pause-aware (paused rows excluded at
// the source), fail-soft per row.
export async function runScheduleSuggestions(
  now: Date = new Date(),
): Promise<SuggestionRunSummary> {
  const db = supabaseService();
  const summary: SuggestionRunSummary = { considered: 0, suggested: [], throttled: 0 };

  const { data: rows, error } = await db
    .from("schedules")
    .select("family_id, storyteller_id, send_time_local, timezone")
    .eq("paused", false);
  if (error || !rows) return summary;

  const throttleSince = new Date(
    now.getTime() - THROTTLE_DAYS * 86_400_000,
  ).toISOString();

  for (const row of rows) {
    summary.considered++;

    try {
      // Recent completed sessions for this storyteller. Engagement time = when
      // they began the session (started_at), falling back to completion.
      const { data: sessions } = await db
        .from("sessions")
        .select("started_at, completed_at")
        .eq("family_id", row.family_id)
        .eq("storyteller_id", row.storyteller_id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(RECENT_WINDOW);

      const timestamps = (sessions ?? [])
        .map((s) => (s.started_at as string | null) ?? (s.completed_at as string | null))
        .filter((t): t is string => !!t);

      const suggestion = deriveScheduleSuggestion({
        engagementTimestamps: timestamps,
        sendTimeLocal: row.send_time_local,
        timezone: row.timezone,
      });
      if (!suggestion) continue;

      // Throttle: any schedule_suggestion for this storyteller within the window
      // (dismissed or not) suppresses a new one — so "Keep current time" isn't
      // re-nagged and we never pile up.
      const { data: recentInsight } = await db
        .from("insights")
        .select("id")
        .eq("storyteller_id", row.storyteller_id)
        .eq("type", "schedule_suggestion")
        .gte("created_at", throttleSince)
        .limit(1)
        .maybeSingle();
      if (recentInsight) {
        summary.throttled++;
        continue;
      }

      const { error: insErr } = await db.from("insights").insert({
        family_id: row.family_id,
        storyteller_id: row.storyteller_id,
        type: "schedule_suggestion",
        payload: {
          best_time_label: suggestion.bestTimeLabel,
          suggested_send_time: suggestion.suggestedSendTime,
          current_send_time: suggestion.currentSendTime,
          sample_size: suggestion.sampleSize,
          timezone: suggestion.timezone,
          at: now.toISOString(),
        },
      });
      if (insErr) {
        console.error("[schedule-suggestion] insert failed", row.storyteller_id, insErr);
        continue;
      }
      summary.suggested.push(row.storyteller_id);

      // Resolve the storyteller's name for the family SMS (best-effort).
      const { data: st } = await db
        .from("storytellers")
        .select("name")
        .eq("id", row.storyteller_id)
        .eq("family_id", row.family_id)
        .maybeSingle();
      const name = st?.name ?? "Your storyteller";

      await alertFamilyAdmins(
        db,
        row.family_id,
        `My Family Porch: ${name} tends to record around ${suggestion.bestTimeLabel}. ` +
          `Shifting their reminder closer to then might make it even easier — open the ` +
          `dashboard to switch, or keep the current time.`,
      );
    } catch (e) {
      console.error("[schedule-suggestion] row failed", row.storyteller_id, e);
    }
  }

  return summary;
}
