"use server";

// Server actions for Stories review (TODO 5.2): toggle a story "in the book"
// and edit its transcript. Both are admin-only. The guard here is UX; RLS
// (ans_write = has_family_role admin) is the real boundary, enforced regardless.
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";
import { translateToEnglish } from "@/lib/ai/translate";
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
  // Clear any cached English translation (7.4): editing the Spanish source makes
  // the old translation stale; an admin can re-translate on demand.
  await sb
    .from("answers")
    .update({ transcript, transcript_en: null })
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
