"use server";

// Server actions for Stories review (TODO 5.2): toggle a story "in the book",
// edit its transcript, move it to a different question (5.9) — including one
// written on the spot (5.11). All admin-only.
// The guard here is UX; RLS (ans_write = has_family_role admin) is the real
// boundary, enforced regardless.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";
import { translateToEnglish } from "@/lib/ai/translate";
import { buildRelationshipContext } from "@/lib/ai/assembly";
import { resolveTokens } from "@/lib/ai/interviewer";
import { validateNewQuestion } from "@/lib/reassign";
import {
  collectAnswerAudioPaths,
  removeAudioObjects,
  collectAnswerPhotoPaths,
  removePhotoObjects,
} from "@/lib/storage/cleanup";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Flip an answer's `in_book` flag. The form posts the desired next value so the
// action stays idempotent (no read-modify-write race on a fast double-tap).
export async function toggleInBook(formData: FormData) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;

  const id = String(formData.get("answer_id") ?? "");
  if (!UUID_RE.test(id)) return;
  const next = String(formData.get("in_book") ?? "") === "true";

  const sb = await supabaseServer();
  // family_id filter is belt-and-suspenders; RLS already scopes the write.
  await sb
    .from("answers")
    .update({ in_book: next })
    .eq("id", id)
    .eq("family_id", active.family_id);

  revalidatePath("/stories");
}

// Save a corrected transcript. Members fix mis-hearings before the keepsake;
// an empty value clears it back to null (e.g. a wrong auto-transcript).
export async function editTranscript(formData: FormData) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;

  const id = String(formData.get("answer_id") ?? "");
  if (!UUID_RE.test(id)) return;
  const raw = String(formData.get("transcript") ?? "").trim();
  const transcript = raw.length ? raw : null;

  const sb = await supabaseServer();
  // Clear any cached translation (7.4): editing the source makes the old
  // translation stale, in either direction; an admin can re-translate on demand.
  await sb
    .from("answers")
    .update({ transcript, transcript_en: null, transcript_es: null })
    .eq("id", id)
    .eq("family_id", active.family_id);

  revalidatePath("/stories");
}

// Translate a Spanish story to English on demand (TODO 7.4). Admin-gated, opt-in,
// cached: translates the opening answer AND its follow-up thread, storing each
// row's transcript_en so it's generated once and read on Stories + in the book.
// Already-translated or non-Spanish rows are skipped. Fail-soft per row (a model
// error leaves that row's transcript_en null rather than failing the whole story).
export async function translateStory(formData: FormData) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;

  const id = String(formData.get("answer_id") ?? "");
  if (!UUID_RE.test(id)) return;

  const sb = await supabaseServer();
  // The opening answer plus its follow-up thread, scoped to the active family.
  const { data: rows } = await sb
    .from("answers")
    .select("id, transcript, transcript_en, lang, storyteller_id")
    .eq("family_id", active.family_id)
    .or(`id.eq.${id},parent_answer_id.eq.${id}`);
  if (!rows || rows.length === 0) return;

  const todo = rows.filter(
    (r) =>
      r.lang === "es" &&
      (r.transcript ?? "").trim() &&
      !(r.transcript_en ?? "").trim(),
  );
  await Promise.all(
    todo.map(async (r) => {
      try {
        const en = await translateToEnglish(r.transcript as string);
        await sb
          .from("answers")
          .update({ transcript_en: en })
          .eq("id", r.id)
          .eq("family_id", active.family_id);
      } catch (e) {
        console.error("[stories/translateStory] translate failed", r.id, e);
      }
    }),
  );

  revalidatePath("/stories");
  const storytellerId = rows[0]?.storyteller_id;
  if (storytellerId) revalidatePath(`/book/${storytellerId}`);
}

// Delete a whole story: the opening answer and its follow-up thread. The voice
// recordings are erased FIRST (5.2a) — DB cascades drop the rows but never the
// Storage objects, so "delete the story" must explicitly erase the audio. We
// remove the objects before the row delete, so a storage failure aborts and
// never leaves an orphaned recording behind a deleted story.
export async function deleteStory(formData: FormData) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;

  const id = String(formData.get("answer_id") ?? "");
  if (!UUID_RE.test(id)) return;

  // Tenant-scoped collection: a forged id from another family yields no paths
  // and the family-scoped row delete below no-ops — never a cross-tenant erase.
  // Erase audio + keepsake photos (7.1) before the row delete: a storage
  // failure aborts and never leaves orphaned media behind a deleted story.
  await removeAudioObjects(await collectAnswerAudioPaths(active.family_id, id));
  await removePhotoObjects(await collectAnswerPhotoPaths(active.family_id, id));

  const sb = await supabaseServer();
  // Deleting the opening answer cascades its follow-ups (parent_answer_id).
  await sb
    .from("answers")
    .delete()
    .eq("id", id)
    .eq("family_id", active.family_id);

  revalidatePath("/stories");
}

// Move a story to a different question (TODO 5.9): re-point the opening answer
// at the library question it actually answers. The original question is then no
// longer "answered" (unless another story also answers it), so the interview
// picker can ask it again; the new one is retired. The follow-up thread, audio,
// transcripts, photos and in-book flag all stay with the story.
type ServerClient = Awaited<ReturnType<typeof supabaseServer>>;
type MovableStory = { id: string; storyteller_id: string; prompt_id: string | null; language: string };

// The story must be a top-level answer in the active family (RLS + filter).
async function loadMovableStory(sb: ServerClient, familyId: string, id: string): Promise<MovableStory | null> {
  const { data } = await sb
    .from("answers")
    .select("id, storyteller_id, prompt_id, is_followup, storyteller:storytellers(language)")
    .eq("family_id", familyId)
    .eq("id", id)
    .maybeSingle();
  if (!data || data.is_followup) return null;
  const st = Array.isArray(data.storyteller) ? data.storyteller[0] : data.storyteller;
  return {
    id: data.id,
    storyteller_id: data.storyteller_id,
    prompt_id: data.prompt_id,
    language: (st as { language: string } | null)?.language ?? "en",
  };
}

// Shared tail of both moves: refuse a question this storyteller already
// answered (stale page / double submit), word it with their names, re-point the
// story, and refresh every surface that reads answers.prompt_id. Redirects.
async function applyMove(
  sb: ServerClient,
  familyId: string,
  story: MovableStory,
  prompt: { id: string; prompt: string },
): Promise<never> {
  const back = `/stories/${story.id}/move`;
  const { count } = await sb
    .from("answers")
    .select("id", { count: "exact", head: true })
    .eq("family_id", familyId)
    .eq("storyteller_id", story.storyteller_id)
    .eq("prompt_id", prompt.id);
  if ((count ?? 0) > 0) redirect(`${back}?error=taken`);

  const ctx = await buildRelationshipContext(story.storyteller_id);
  const questionText = ctx ? resolveTokens(prompt.prompt, ctx) : prompt.prompt;

  // book_sort cleared: the story may land in a different chapter (by category),
  // where its old position means nothing — it sits chronologically until moved.
  const { error } = await sb
    .from("answers")
    .update({ prompt_id: prompt.id, question_text: questionText, book_sort: null })
    .eq("id", story.id)
    .eq("family_id", familyId);
  if (error) redirect(`${back}?error=save`);

  revalidatePath("/stories");
  revalidatePath(`/storytellers/${story.storyteller_id}`, "layout");
  revalidatePath("/book", "layout");
  redirect("/stories");
}

export async function reassignStory(formData: FormData) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;

  const id = String(formData.get("answer_id") ?? "");
  const promptId = String(formData.get("prompt_id") ?? "");
  if (!UUID_RE.test(id)) return;
  if (!UUID_RE.test(promptId)) redirect(`/stories/${id}/move?error=pick`);

  const sb = await supabaseServer();
  const story = await loadMovableStory(sb, active.family_id, id);
  if (!story || story.prompt_id === promptId) redirect("/stories");

  // The new question must be readable to this family (pr_select: global or own
  // custom) AND belong to it — a forged id can't attach another family's custom
  // question — and be in the storyteller's language.
  const { data: prompt } = await sb
    .from("prompts")
    .select("id, prompt, lang, family_id")
    .eq("id", promptId)
    .maybeSingle();
  if (!prompt || (prompt.family_id && prompt.family_id !== active.family_id) || prompt.lang !== story.language) {
    redirect(`/stories/${id}/move?error=pick`);
  }

  await applyMove(sb, active.family_id, story, prompt);
}

// Write a new question while moving a story (TODO 5.11). The question joins the
// family's own list (prompts.family_id = this family, in the storyteller's
// language), so the interview picker can ask it of the family's other
// storytellers; this storyteller has now answered it. Filed under an existing
// topic only. Same wording already in the family list → reuse it, no duplicate.
// pr_write (admin of a family, family_id set) is the boundary for the insert.
export async function moveToNewQuestion(formData: FormData) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;

  const id = String(formData.get("answer_id") ?? "");
  if (!UUID_RE.test(id)) return;
  const back = `/stories/${id}/move`;

  const sb = await supabaseServer();
  const story = await loadMovableStory(sb, active.family_id, id);
  if (!story) redirect("/stories");

  // Topics come from the library itself, never from the form.
  const { data: rows } = await sb
    .from("prompts")
    .select("id, prompt, category, family_id")
    .eq("lang", story.language)
    .or(`family_id.is.null,family_id.eq.${active.family_id}`);
  const topics = [...new Set((rows ?? []).map((r) => r.category))];
  const v = validateNewQuestion(
    String(formData.get("question") ?? ""),
    String(formData.get("topic") ?? ""),
    topics,
  );
  if (!v.ok) redirect(`${back}?error=${v.error === "question" ? "new-question" : "new-topic"}`);

  const same = (rows ?? []).find(
    (r) => r.family_id === active.family_id && r.prompt.toLowerCase() === v.text.toLowerCase(),
  );
  let prompt = same ? { id: same.id, prompt: same.prompt } : null;
  if (!prompt) {
    const { data: created } = await sb
      .from("prompts")
      .insert({ family_id: active.family_id, lang: story.language, category: v.topic, prompt: v.text })
      .select("id, prompt")
      .single();
    if (!created) redirect(`${back}?error=save`);
    prompt = created;
  }
  if (story.prompt_id === prompt.id) redirect("/stories");

  await applyMove(sb, active.family_id, story, prompt);
}
