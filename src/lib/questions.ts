// The full question library for one storyteller (the "show all questions"
// view). Server-only, RLS-scoped via the SSR client — the same is_member_of
// readable reads as topics.ts (prompts + answers). No service role, no writes.
//
// Where topics.ts collapses each category to a coverage count, this lists every
// individual prompt with whether the storyteller has answered it yet.
import { supabaseServer } from "@/lib/supabase/server";

export type LibraryQuestion = {
  id: string;
  text: string;
  custom: boolean; // a family-authored question (family_id set), not a global
  answered: boolean;
};

export type QuestionCategory = {
  category: string;
  total: number;
  answered: number;
  questions: LibraryQuestion[];
};

export type StorytellerQuestions = {
  id: string;
  name: string;
  language: string;
  total: number;
  answered: number; // distinct prompts answered across all categories
  categories: QuestionCategory[];
};

// One storyteller's full question library, grouped by category. Mirrors
// loadStorytellerTopics' RLS-scoped reads and language/library filter so the
// counts here line up with the Topics coverage view. null = not visible.
export async function loadStorytellerQuestions(
  familyId: string,
  storytellerId: string,
): Promise<StorytellerQuestions | null> {
  const sb = await supabaseServer();

  const stRes = await sb
    .from("storytellers")
    .select("id, name, language")
    .eq("family_id", familyId)
    .eq("id", storytellerId)
    .maybeSingle();
  const st = stRes.data;
  if (!st) return null;

  const [promptsRes, answeredRes] = await Promise.all([
    // The library available to this family in the storyteller's language:
    // globals (family_id null) plus this family's own custom questions.
    sb
      .from("prompts")
      .select("id, category, prompt, family_id, lang")
      .or(`family_id.is.null,family_id.eq.${familyId}`)
      .eq("lang", st.language),
    sb
      .from("answers")
      .select("prompt_id")
      .eq("family_id", familyId)
      .eq("storyteller_id", storytellerId)
      .not("prompt_id", "is", null),
  ]);

  // The distinct set of prompts this storyteller has answered.
  const answeredIds = new Set<string>();
  for (const a of answeredRes.data ?? []) {
    if (a.prompt_id) answeredIds.add(a.prompt_id);
  }

  // Bucket prompts by category; custom (family-authored) questions sort first
  // within a category so a family's own additions are easy to find.
  const byCategory = new Map<string, LibraryQuestion[]>();
  for (const p of promptsRes.data ?? []) {
    const list = byCategory.get(p.category) ?? [];
    list.push({
      id: p.id,
      text: p.prompt,
      custom: p.family_id !== null,
      answered: answeredIds.has(p.id),
    });
    byCategory.set(p.category, list);
  }

  let total = 0;
  let answeredTotal = 0;
  const categories: QuestionCategory[] = [...byCategory.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map((category) => {
      const questions = (byCategory.get(category) ?? []).sort((a, b) => {
        if (a.custom !== b.custom) return a.custom ? -1 : 1;
        return a.text.localeCompare(b.text);
      });
      const answered = questions.filter((q) => q.answered).length;
      total += questions.length;
      answeredTotal += answered;
      return { category, total: questions.length, answered, questions };
    });

  return {
    id: st.id,
    name: st.name,
    language: st.language,
    total,
    answered: answeredTotal,
    categories,
  };
}
