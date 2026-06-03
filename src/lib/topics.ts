// Topics steering data for the admin dashboard (TODO 5.3). Server-only, RLS-
// scoped via the SSR client (tp_select / prompts / answers are all is_member_of
// readable). For each storyteller we list the library categories in their
// language with coverage (explored / available) and the current admin
// preference (focus / ease_off / avoid / neutral).
import { supabaseServer } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type TopicPreference = Database["public"]["Enums"]["topic_preference"];

export type TopicRow = {
  category: string;
  available: number; // prompts in this category for the storyteller's language
  explored: number; // distinct prompts they've answered in it
  preference: TopicPreference | null; // admin steering, null = neutral
};

export type StorytellerTopics = {
  id: string;
  name: string;
  language: string;
  topics: TopicRow[];
};

function one<T>(rel: unknown): T | null {
  if (Array.isArray(rel)) return (rel[0] as T) ?? null;
  return (rel as T) ?? null;
}

export async function loadTopics(familyId: string): Promise<StorytellerTopics[]> {
  const sb = await supabaseServer();

  const [stRes, promptsRes, answeredRes, prefsRes] = await Promise.all([
    sb.from("storytellers").select("id, name, language").eq("family_id", familyId),
    // The library available to this family: globals + this family's customs.
    sb
      .from("prompts")
      .select("id, category, lang")
      .or(`family_id.is.null,family_id.eq.${familyId}`),
    // Every answered prompt with its category → distinct-explored per storyteller.
    sb
      .from("answers")
      .select("storyteller_id, prompt_id, prompt:prompts(category)")
      .eq("family_id", familyId)
      .not("prompt_id", "is", null),
    sb
      .from("topic_preferences")
      .select("storyteller_id, category, preference")
      .eq("family_id", familyId),
  ]);

  // available[lang][category] = prompt count.
  const available = new Map<string, Map<string, number>>();
  for (const p of promptsRes.data ?? []) {
    const byCat = available.get(p.lang) ?? new Map<string, number>();
    byCat.set(p.category, (byCat.get(p.category) ?? 0) + 1);
    available.set(p.lang, byCat);
  }

  // explored[storyteller][category] = set of distinct answered prompt ids.
  const explored = new Map<string, Map<string, Set<string>>>();
  for (const a of answeredRes.data ?? []) {
    const category = one<{ category: string }>(a.prompt)?.category;
    if (!category || !a.prompt_id) continue;
    const byCat = explored.get(a.storyteller_id) ?? new Map<string, Set<string>>();
    const set = byCat.get(category) ?? new Set<string>();
    set.add(a.prompt_id);
    byCat.set(category, set);
    explored.set(a.storyteller_id, byCat);
  }

  // prefs[storyteller][category] = preference.
  const prefs = new Map<string, Map<string, TopicPreference>>();
  for (const row of prefsRes.data ?? []) {
    const byCat = prefs.get(row.storyteller_id) ?? new Map<string, TopicPreference>();
    byCat.set(row.category, row.preference);
    prefs.set(row.storyteller_id, byCat);
  }

  return (stRes.data ?? []).map((st) => {
    const catCounts = available.get(st.language) ?? new Map<string, number>();
    const exploredByCat = explored.get(st.id);
    const prefByCat = prefs.get(st.id);
    const topics: TopicRow[] = [...catCounts.keys()]
      .sort((a, b) => a.localeCompare(b))
      .map((category) => ({
        category,
        available: catCounts.get(category) ?? 0,
        explored: exploredByCat?.get(category)?.size ?? 0,
        preference: prefByCat?.get(category) ?? null,
      }));
    return { id: st.id, name: st.name, language: st.language, topics };
  });
}
