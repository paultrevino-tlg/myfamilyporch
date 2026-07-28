// Schedule data for the admin dashboard (TODO 5.4). Server-only, RLS-scoped via
// the SSR client (sch_select = is_member_of readable). One schedule row per
// storyteller; where none exists yet we surface the table defaults so the form
// always has sensible values to render. The weekly cron (TODO 6.1) reads these
// same rows to decide when to nudge.
import { supabaseServer } from "@/lib/supabase/server";

// Two-letter day codes, ordered Sun→Sat. Matches the schedules.days_of_week
// default ({TU,FR}) and how lib/overview.ts sums scheduled days.
export const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;
export type DayCode = (typeof DAY_CODES)[number];

export const DAY_LABEL: Record<DayCode, string> = {
  SU: "Su",
  MO: "Mo",
  TU: "Tu",
  WE: "We",
  TH: "Th",
  FR: "Fr",
  SA: "Sa",
};

// Display helpers live here rather than on a page, because the storyteller hub
// and the setup wizard both render schedules and must phrase them identically.
// "10:00" → "10:00 AM".
export function prettyTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export function daysSummary(days: DayCode[]): string {
  if (days.length === 0) return "No days set";
  if (days.length === 7) return "Every day";
  return DAY_CODES.filter((d) => days.includes(d))
    .map((d) => DAY_LABEL[d])
    .join(" · ");
}

// Fallback IANA zone when a schedule has no timezone yet. The cron interprets
// send_time_local / quiet_after in the storyteller's own zone (TODO 6.1); rows
// predating that column resolve here.
export const DEFAULT_TIMEZONE = "America/New_York";

// Manual nudges allowed per storyteller per LOCAL day — the cap enforced by
// lib/sms/nudge-quota.ts on the "Ask now" / "Send a nudge" buttons. Generous
// enough for the real use case (an admin is with their elder and wants to prompt
// now) while still bounding the only unbounded outbound path (PRICING §6.3).
//
// It lives HERE rather than in nudge-quota.ts so the storyteller hub can render
// the number in its "that's enough for today" banner without importing the
// service-role client into a page's module graph.
export const MANUAL_NUDGE_DAILY_CAP = 3;

// The calendar day ("YYYY-MM-DD") at `at` in `timeZone`, falling back to the
// default zone if the zone string is unusable — never throws, because callers
// are on send paths that must not break on bad data.
//
// Used by the manual-nudge daily cap (lib/sms/nudge-quota.ts) so "3 a day" means
// the storyteller's day, not UTC's. The cron has its own richer `inZone` in
// lib/scheduler/run.ts that also needs weekday + wall time; this is the
// day-only slice, kept here next to DEFAULT_TIMEZONE.
export function localDayIn(timeZone: string, at: Date = new Date()): string {
  const fmt = (tz: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(at); // en-CA yields YYYY-MM-DD, which is also Postgres `date` input
  try {
    return fmt(timeZone);
  } catch {
    return fmt(DEFAULT_TIMEZONE);
  }
}

// Curated IANA zones for the Schedule picker — the US zones (incl. the no-DST
// ones) plus a few for ES families. saveSchedule validates anything submitted
// against Intl regardless, so this list is for friendliness, not security.
export const TIMEZONES: { value: string; label: string }[] = [
  { value: "America/New_York", label: "Eastern (New York)" },
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/Denver", label: "Mountain (Denver)" },
  { value: "America/Phoenix", label: "Arizona (no daylight saving)" },
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska (Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii (Honolulu)" },
  { value: "America/Mexico_City", label: "Central Mexico (Mexico City)" },
  { value: "America/Puerto_Rico", label: "Puerto Rico / Atlantic" },
  { value: "UTC", label: "UTC" },
];

export function tzLabel(tz: string): string {
  return TIMEZONES.find((z) => z.value === tz)?.label ?? tz;
}

// Per-storyteller adaptive-signal sensitivity (TODO 6.5). Mirrors the
// schedules.signal_engagement_sensitivity enum.
export type EngagementSensitivity = "gentle" | "standard" | "sensitive";

export const SENSITIVITY_LABEL: Record<EngagementSensitivity, string> = {
  gentle: "Gentle",
  standard: "Standard",
  sensitive: "Sensitive",
};

export type StorytellerSchedule = {
  id: string;
  name: string;
  language: string;
  // Whether a schedules ROW actually exists. The fields below fall back to table
  // defaults so the editor always renders, which means they can't answer this —
  // and it matters: runScheduler only iterates real rows, so `false` means this
  // storyteller is never considered and never nudged.
  saved: boolean;
  days: DayCode[]; // mornings the nudge goes out
  sendTimeLocal: string; // "HH:MM" in the storyteller's local time
  questionsPer: number; // 1–2, kept short on purpose
  quietAfter: string | null; // "HH:MM" or null = no quiet-hours cutoff
  timezone: string; // IANA zone anchoring the local send time
  paused: boolean; // hold all outreach
  // Check-in alert knobs (TODO 6.5). mic-failed stays always-on (acute).
  engagementEnabled: boolean; // surface the engaging-less signal at all
  engagementSensitivity: EngagementSensitivity; // how big a drop trips it
  scheduleSuggestionEnabled: boolean; // surface the time-shift suggestion
};

// Defaults mirror the schedules table column defaults so a storyteller with no
// row yet renders the same starting point the DB would have inserted.
const DEFAULTS = {
  days: ["TU", "FR"] as DayCode[],
  sendTimeLocal: "10:00",
  questionsPer: 2,
  quietAfter: null as string | null,
  timezone: DEFAULT_TIMEZONE,
  paused: false,
  engagementEnabled: true,
  engagementSensitivity: "standard" as EngagementSensitivity,
  scheduleSuggestionEnabled: true,
};

// Postgres `time` comes back as "HH:MM:SS"; the <input type=time> form wants
// "HH:MM". Trim to minutes, tolerate already-short values.
function toHHMM(t: string | null): string | null {
  if (!t) return null;
  return t.slice(0, 5);
}

// One storyteller's schedule for the detail-page hub. Same RLS-scoped read as
// loadSchedules, pinned to a single id; returns the table defaults when no row
// exists yet so the inline editor always has sensible values. null = the
// storyteller isn't visible in this family (caller 404s).
export async function loadStorytellerSchedule(
  familyId: string,
  storytellerId: string,
): Promise<StorytellerSchedule | null> {
  const sb = await supabaseServer();

  const [stRes, schRes] = await Promise.all([
    sb
      .from("storytellers")
      .select("id, name, language")
      .eq("family_id", familyId)
      .eq("id", storytellerId)
      .maybeSingle(),
    sb
      .from("schedules")
      .select(
        "days_of_week, send_time_local, questions_per, quiet_after, timezone, paused, signal_engagement_enabled, signal_engagement_sensitivity, signal_schedule_suggestion_enabled",
      )
      .eq("family_id", familyId)
      .eq("storyteller_id", storytellerId)
      .maybeSingle(),
  ]);

  const st = stRes.data;
  if (!st) return null;
  const row = schRes.data;
  return {
    id: st.id,
    name: st.name,
    language: st.language,
    saved: !!row,
    days: (row?.days_of_week as DayCode[] | null) ?? DEFAULTS.days,
    sendTimeLocal: toHHMM(row?.send_time_local ?? null) ?? DEFAULTS.sendTimeLocal,
    questionsPer: row?.questions_per ?? DEFAULTS.questionsPer,
    quietAfter: toHHMM(row?.quiet_after ?? null) ?? DEFAULTS.quietAfter,
    timezone: row?.timezone ?? DEFAULTS.timezone,
    paused: row?.paused ?? DEFAULTS.paused,
    engagementEnabled: row?.signal_engagement_enabled ?? DEFAULTS.engagementEnabled,
    engagementSensitivity:
      (row?.signal_engagement_sensitivity as EngagementSensitivity | null) ??
      DEFAULTS.engagementSensitivity,
    scheduleSuggestionEnabled:
      row?.signal_schedule_suggestion_enabled ?? DEFAULTS.scheduleSuggestionEnabled,
  };
}

export async function loadSchedules(familyId: string): Promise<StorytellerSchedule[]> {
  const sb = await supabaseServer();

  const [stRes, schRes] = await Promise.all([
    sb.from("storytellers").select("id, name, language").eq("family_id", familyId),
    sb
      .from("schedules")
      .select(
        "storyteller_id, days_of_week, send_time_local, questions_per, quiet_after, timezone, paused, signal_engagement_enabled, signal_engagement_sensitivity, signal_schedule_suggestion_enabled",
      )
      .eq("family_id", familyId),
  ]);

  const byStoryteller = new Map(
    (schRes.data ?? []).map((s) => [s.storyteller_id, s]),
  );

  return (stRes.data ?? [])
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((st) => {
      const row = byStoryteller.get(st.id);
      return {
        saved: !!row,
        id: st.id,
        name: st.name,
        language: st.language,
        days: (row?.days_of_week as DayCode[] | null) ?? DEFAULTS.days,
        sendTimeLocal: toHHMM(row?.send_time_local ?? null) ?? DEFAULTS.sendTimeLocal,
        questionsPer: row?.questions_per ?? DEFAULTS.questionsPer,
        quietAfter: toHHMM(row?.quiet_after ?? null) ?? DEFAULTS.quietAfter,
        timezone: row?.timezone ?? DEFAULTS.timezone,
        paused: row?.paused ?? DEFAULTS.paused,
        engagementEnabled: row?.signal_engagement_enabled ?? DEFAULTS.engagementEnabled,
        engagementSensitivity:
          (row?.signal_engagement_sensitivity as EngagementSensitivity | null) ??
          DEFAULTS.engagementSensitivity,
        scheduleSuggestionEnabled:
          row?.signal_schedule_suggestion_enabled ?? DEFAULTS.scheduleSuggestionEnabled,
      };
    });
}
