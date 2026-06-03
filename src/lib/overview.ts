// Overview data for the family/admin dashboard (TODO 5.1).
// Server-only. Every read goes through the cookie-bound SSR client, so RLS
// scopes rows to the signed-in member; we additionally filter to the active
// family (the cookie's focus). No service role here — members read their own.
import { supabaseServer } from "@/lib/supabase/server";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type RecentStory = {
  id: string;
  question: string | null;
  category: string | null;
  storyteller: string;
  createdAt: string;
  durationSec: number | null;
  followUps: number;
  hasAudio: boolean; // a recording is linked → show a player (TODO 5.2)
};

// The same four status metrics as Overview, but scoped to one storyteller —
// powers the per-storyteller blocks on the dashboard and the detail page header.
export type StorytellerStat = {
  id: string;
  name: string;
  language: string;
  lastSessionAt: string | null;
  lastSessionFresh: boolean;
  thisWeekCount: number;
  weeklyTarget: number | null; // this storyteller's scheduled days, or null if unscheduled
  storiesSaved: number;
  topicsTouched: number;
  topicsTotal: number; // family-wide library size (shared across storytellers)
};

export type Overview = {
  lastSessionAt: string | null; // ISO of most recent completed session, or null
  lastSessionFresh: boolean; // completed within the last 7 days
  thisWeekCount: number; // completed sessions in the trailing 7 days
  weeklyTarget: number | null; // summed scheduled days across storytellers, or null
  storiesSaved: number; // top-level answers (follow-ups thread under them)
  topicsTouched: number; // distinct categories answered
  topicsTotal: number; // distinct categories in the available library
  recent: RecentStory[];
};

// PostgREST embeds a to-one relation as an object at runtime but the generated
// types widen it to an array — normalize either shape (same gotcha as auth.ts).
function one<T>(rel: unknown): T | null {
  if (Array.isArray(rel)) return (rel[0] as T) ?? null;
  return (rel as T) ?? null;
}

// Per-storyteller breakdown of the four status metrics for the active family.
// One grouped pass over sessions / schedules / answers (bucketed by
// storyteller_id in JS) rather than N per-storyteller round-trips. RLS scopes
// every read to the member's families; we additionally filter to the active one.
export async function loadStorytellerStats(
  familyId: string
): Promise<StorytellerStat[]> {
  const sb = await supabaseServer();
  const weekAgo = new Date(Date.now() - WEEK_MS).toISOString();

  const [storytellersRes, sessionsRes, schedulesRes, answersRes, libraryRes] =
    await Promise.all([
      sb
        .from("storytellers")
        .select("id,name,language")
        .eq("family_id", familyId)
        .order("created_at", { ascending: true }),
      sb
        .from("sessions")
        .select("storyteller_id, completed_at")
        .eq("family_id", familyId)
        .not("completed_at", "is", null),
      sb
        .from("schedules")
        .select("storyteller_id, days_of_week")
        .eq("family_id", familyId),
      sb
        .from("answers")
        .select("storyteller_id, prompt:prompts(category)")
        .eq("family_id", familyId)
        .eq("is_followup", false),
      sb
        .from("prompts")
        .select("category")
        .or(`family_id.is.null,family_id.eq.${familyId}`),
    ]);

  const topicsTotal = new Set(
    (libraryRes.data ?? []).map((p) => p.category as string).filter(Boolean)
  ).size;

  // Completed-session timestamps per storyteller (for last session + this week).
  const sessionsBy = new Map<string, string[]>();
  for (const s of sessionsRes.data ?? []) {
    if (!s.completed_at) continue;
    const id = s.storyteller_id as string;
    const arr = sessionsBy.get(id) ?? [];
    arr.push(s.completed_at as string);
    sessionsBy.set(id, arr);
  }

  // Weekly target = this storyteller's scheduled days (null when unscheduled).
  const scheduleBy = new Map<string, number>();
  for (const s of schedulesRes.data ?? []) {
    scheduleBy.set(
      s.storyteller_id as string,
      (s.days_of_week as string[] | null)?.length ?? 0
    );
  }

  // Stories saved (top-level answer count) + distinct categories per storyteller.
  const storiesBy = new Map<string, number>();
  const topicsBy = new Map<string, Set<string>>();
  for (const a of answersRes.data ?? []) {
    const id = a.storyteller_id as string;
    storiesBy.set(id, (storiesBy.get(id) ?? 0) + 1);
    const cat = one<{ category: string }>(a.prompt)?.category;
    if (cat) {
      const set = topicsBy.get(id) ?? new Set<string>();
      set.add(cat);
      topicsBy.set(id, set);
    }
  }

  return (
    (storytellersRes.data ?? []) as {
      id: string;
      name: string;
      language: string;
    }[]
  ).map((st) => {
    const completed = (sessionsBy.get(st.id) ?? [])
      .slice()
      .sort((a, b) => b.localeCompare(a));
    const lastSessionAt = completed[0] ?? null;
    return {
      id: st.id,
      name: st.name,
      language: st.language,
      lastSessionAt,
      lastSessionFresh: !!lastSessionAt && lastSessionAt >= weekAgo,
      thisWeekCount: completed.filter((c) => c >= weekAgo).length,
      weeklyTarget: scheduleBy.has(st.id) ? (scheduleBy.get(st.id) ?? 0) : null,
      storiesSaved: storiesBy.get(st.id) ?? 0,
      topicsTouched: topicsBy.get(st.id)?.size ?? 0,
      topicsTotal,
    };
  });
}

export async function loadOverview(familyId: string): Promise<Overview> {
  const sb = await supabaseServer();
  const weekAgo = new Date(Date.now() - WEEK_MS).toISOString();

  const [sessionsRes, schedulesRes, recentRes, answeredRes, libraryRes] =
    await Promise.all([
      // Completed sessions, newest first → last session + this-week count.
      sb
        .from("sessions")
        .select("completed_at")
        .eq("family_id", familyId)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false }),
      // One schedule per storyteller; weekly target = summed scheduled days.
      sb.from("schedules").select("days_of_week").eq("family_id", familyId),
      // The "Lately" list: newest top-level answers + their follow-up count.
      sb
        .from("answers")
        .select(
          "id, question_text, created_at, duration_sec, audio_path, " +
            "storyteller:storytellers(name), prompt:prompts(category), " +
            "followups:answers!parent_answer_id(count)"
        )
        .eq("family_id", familyId)
        .eq("is_followup", false)
        .order("created_at", { ascending: false })
        .limit(5),
      // Categories the family has actually answered (for "topics touched").
      sb
        .from("answers")
        .select("prompt:prompts(category)")
        .eq("family_id", familyId)
        .not("prompt_id", "is", null),
      // The library available to this family: globals + this family's customs.
      sb
        .from("prompts")
        .select("category")
        .or(`family_id.is.null,family_id.eq.${familyId}`),
    ]);

  const sessions = sessionsRes.data ?? [];
  const lastSessionAt = (sessions[0]?.completed_at as string | null) ?? null;
  const lastSessionFresh =
    !!lastSessionAt && lastSessionAt >= weekAgo;
  const thisWeekCount = sessions.filter(
    (s) => (s.completed_at as string) >= weekAgo
  ).length;

  const schedules = schedulesRes.data ?? [];
  const weeklyTarget = schedules.length
    ? schedules.reduce(
        (sum, s) => sum + ((s.days_of_week as string[] | null)?.length ?? 0),
        0
      )
    : null;

  // Stories saved = top-level answers. We already pull the newest 5 for the
  // list; for the total we ask Postgres for a head count (no rows shipped).
  const { count: storiesSaved } = await sb
    .from("answers")
    .select("id", { count: "exact", head: true })
    .eq("family_id", familyId)
    .eq("is_followup", false);

  const answeredCategories = new Set(
    (answeredRes.data ?? [])
      .map((a) => one<{ category: string }>(a.prompt)?.category)
      .filter((c): c is string => !!c)
  );
  const libraryCategories = new Set(
    (libraryRes.data ?? []).map((p) => p.category as string).filter(Boolean)
  );

  // The self-referential `followups` embed defeats PostgREST's static type
  // inference (returns a parser-error type), so type the rows explicitly here.
  type RecentRow = {
    id: string;
    question_text: string | null;
    created_at: string;
    duration_sec: number | null;
    audio_path: string | null;
    storyteller: unknown;
    prompt: unknown;
    followups: unknown;
  };
  const recent: RecentStory[] = ((recentRes.data ?? []) as unknown as RecentRow[]).map((a) => ({
    id: a.id,
    question: a.question_text ?? null,
    category: one<{ category: string }>(a.prompt)?.category ?? null,
    storyteller: one<{ name: string }>(a.storyteller)?.name ?? "Storyteller",
    createdAt: a.created_at,
    durationSec: a.duration_sec ?? null,
    followUps: one<{ count: number }>(a.followups)?.count ?? 0,
    hasAudio: !!a.audio_path,
  }));

  return {
    lastSessionAt,
    lastSessionFresh,
    thisWeekCount,
    weeklyTarget,
    storiesSaved: storiesSaved ?? 0,
    topicsTouched: answeredCategories.size,
    topicsTotal: libraryCategories.size,
    recent,
  };
}
