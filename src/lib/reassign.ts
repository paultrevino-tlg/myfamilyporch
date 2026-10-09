// Move a story to a different question (TODO 5.9). Sometimes a storyteller
// answers something other than what was asked; an admin re-points the story at
// the question it actually answers. Because the interview picker treats "has an
// answer with this prompt_id" as asked (assembly.ts — never re-ask), moving the
// story frees the original question to be asked again and retires the new one,
// with no extra state.
//
// SERVER-ONLY. Reads go through the RLS-scoped SSR client; the only service-role
// read is buildRelationshipContext (names/pronouns to word the questions), and it
// runs only after the storyteller was proven visible to the caller.
import { supabaseServer } from "@/lib/supabase/server";
import { buildRelationshipContext } from "@/lib/ai/assembly";
import { resolveTokens } from "@/lib/ai/interviewer";
import { loadStorytellerQuestions, type StorytellerQuestions } from "@/lib/questions";

export type PickableCategory = {
  category: string;
  questions: { id: string; text: string }[];
};

// The questions a story can move to: the storyteller's unanswered library
// questions, grouped by topic. The story's own current question is answered (by
// this very story), so it drops out with the rest. Pure — unit-checked.
export function pickableQuestions(
  library: Pick<StorytellerQuestions, "categories">,
  word: (raw: string) => string,
): PickableCategory[] {
  return library.categories
    .map((c) => ({
      category: c.category,
      questions: c.questions.filter((q) => !q.answered).map((q) => ({ id: q.id, text: word(q.text) })),
    }))
    .filter((c) => c.questions.length > 0);
}

export type MoveContext = {
  answerId: string;
  storytellerName: string;
  currentQuestion: string | null;
  fromLibrary: boolean; // the story is filed under a library question (not open-floor)
  // Whether the current question is a library question that goes back in the
  // queue: false when the story has no library question (an open-floor answer)
  // or another story also answers it.
  frees: boolean;
  transcript: string | null;
  options: PickableCategory[];
};

// Everything the Move page needs for one top-level story in the active family.
// null when the story isn't visible, doesn't exist, or is a follow-up (moving a
// single reply out of its thread is out of scope).
export async function loadMoveContext(familyId: string, answerId: string): Promise<MoveContext | null> {
  const sb = await supabaseServer();
  const { data: a } = await sb
    .from("answers")
    .select("id, storyteller_id, prompt_id, question_text, transcript, is_followup, storyteller:storytellers(name)")
    .eq("family_id", familyId)
    .eq("id", answerId)
    .maybeSingle();
  if (!a || a.is_followup) return null;

  const [library, ctx, sameQuestion] = await Promise.all([
    loadStorytellerQuestions(familyId, a.storyteller_id),
    buildRelationshipContext(a.storyteller_id),
    a.prompt_id
      ? sb
          .from("answers")
          .select("id", { count: "exact", head: true })
          .eq("family_id", familyId)
          .eq("storyteller_id", a.storyteller_id)
          .eq("prompt_id", a.prompt_id)
      : Promise.resolve({ count: 0 }),
  ]);
  if (!library || !ctx) return null;

  const st = Array.isArray(a.storyteller) ? a.storyteller[0] : a.storyteller;
  return {
    answerId: a.id,
    storytellerName: (st as { name: string } | null)?.name ?? library.name,
    currentQuestion: a.question_text,
    fromLibrary: !!a.prompt_id,
    frees: !!a.prompt_id && (sameQuestion.count ?? 0) <= 1,
    transcript: a.transcript,
    options: pickableQuestions(library, (raw) => resolveTokens(raw, ctx)),
  };
}
