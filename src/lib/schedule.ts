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

// Fallback IANA zone when a schedule has no timezone yet. The cron interprets
// send_time_local / quiet_after in the storyteller's own zone (TODO 6.1); rows
// predating that column resolve here.
export const DEFAULT_TIMEZONE = "America/New_York";

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

export type StorytellerSchedule = {
  id: string;
  name: string;
  language: string;
  days: DayCode[]; // mornings the nudge goes out
  sendTimeLocal: string; // "HH:MM" in the storyteller's local time
  questionsPer: number; // 1–2, kept short on purpose
  quietAfter: string | null; // "HH:MM" or null = no quiet-hours cutoff
  timezone: string; // IANA zone anchoring the local send time
  paused: boolean; // hold all outreach
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
};

// Postgres `time` comes back as "HH:MM:SS"; the <input type=time> form wants
// "HH:MM". Trim to minutes, tolerate already-short values.
function toHHMM(t: string | null): string | null {
  if (!t) return null;
  return t.slice(0, 5);
}

export async function loadSchedules(familyId: string): Promise<StorytellerSchedule[]> {
  const sb = await supabaseServer();

  const [stRes, schRes] = await Promise.all([
    sb.from("storytellers").select("id, name, language").eq("family_id", familyId),
    sb
      .from("schedules")
      .select(
        "storyteller_id, days_of_week, send_time_local, questions_per, quiet_after, timezone, paused",
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
        id: st.id,
        name: st.name,
        language: st.language,
        days: (row?.days_of_week as DayCode[] | null) ?? DEFAULTS.days,
        sendTimeLocal: toHHMM(row?.send_time_local ?? null) ?? DEFAULTS.sendTimeLocal,
        questionsPer: row?.questions_per ?? DEFAULTS.questionsPer,
        quietAfter: toHHMM(row?.quiet_after ?? null) ?? DEFAULTS.quietAfter,
        timezone: row?.timezone ?? DEFAULTS.timezone,
        paused: row?.paused ?? DEFAULTS.paused,
      };
    });
}
