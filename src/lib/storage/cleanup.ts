// Private-media cleanup for deletions (TODO 5.2a). Server-only, SERVICE ROLE.
//
// DB foreign keys cascade `answers` rows away when a storyteller (and, later, a
// family) is removed, and follow-ups cascade via `parent_answer_id` — but the
// private `story-audio` objects are NOT touched by those cascades, so the voice
// recordings would orphan. This module is the explicit erase path: gather the
// exact object keys from the answer rows, then remove them through the Storage
// API (the only way that actually deletes the underlying blob; deleting the
// storage.objects row alone would leave the file behind).
//
// Callers pass the active family_id so collection is tenant-scoped: a forged
// answer id from another family yields no paths here, and the family-scoped row
// delete that follows no-ops — never a cross-tenant erase.
import { supabaseService } from "@/lib/supabase/service";

const BUCKET = "story-audio";
const PHOTO_BUCKET = "story-photos";

// Remove the given object keys from the private bucket. Dedupes/filters, no-ops
// on an empty set, and THROWS on error so the caller can abort the row delete
// rather than erase the DB record while the audio survives.
export async function removeAudioObjects(paths: (string | null | undefined)[]): Promise<void> {
  const keys = Array.from(new Set(paths.filter((p): p is string => !!p)));
  if (keys.length === 0) return;

  const svc = supabaseService();
  const { error } = await svc.storage.from(BUCKET).remove(keys);
  if (error) {
    console.error("[storage/cleanup] failed to remove audio objects", error);
    throw error;
  }
}

// Audio keys for one story: the answer itself plus its follow-up thread
// (children via parent_answer_id, which cascade-delete with the answer).
export async function collectAnswerAudioPaths(
  familyId: string,
  answerId: string
): Promise<string[]> {
  const svc = supabaseService();
  const { data } = await svc
    .from("answers")
    .select("audio_path")
    .eq("family_id", familyId)
    .or(`id.eq.${answerId},parent_answer_id.eq.${answerId}`);
  return (data ?? []).map((a) => a.audio_path).filter((p): p is string => !!p);
}

// Audio keys for every answer under a storyteller (their whole archive).
export async function collectStorytellerAudioPaths(
  familyId: string,
  storytellerId: string
): Promise<string[]> {
  const svc = supabaseService();
  const { data } = await svc
    .from("answers")
    .select("audio_path")
    .eq("family_id", familyId)
    .eq("storyteller_id", storytellerId);
  return (data ?? []).map((a) => a.audio_path).filter((p): p is string => !!p);
}

// --- keepsake photos (TODO 7.1) -------------------------------------------
// Same story as audio: story_photos rows cascade with their answer/storyteller/
// family, but the story-photos objects do not — so a story/storyteller delete
// must explicitly erase them. Object-before-row, family-scoped collection.

// Remove the given keys from the private photo bucket. THROWS on error so the
// caller aborts the row delete rather than orphan a deleted-record's photos.
export async function removePhotoObjects(paths: (string | null | undefined)[]): Promise<void> {
  const keys = Array.from(new Set(paths.filter((p): p is string => !!p)));
  if (keys.length === 0) return;

  const svc = supabaseService();
  const { error } = await svc.storage.from(PHOTO_BUCKET).remove(keys);
  if (error) {
    console.error("[storage/cleanup] failed to remove photo objects", error);
    throw error;
  }
}

// Photo keys for one story: photos on the answer itself plus any on its
// follow-up thread (children via parent_answer_id, which cascade with it).
export async function collectAnswerPhotoPaths(
  familyId: string,
  answerId: string
): Promise<string[]> {
  const svc = supabaseService();
  const { data: children } = await svc
    .from("answers")
    .select("id")
    .eq("family_id", familyId)
    .eq("parent_answer_id", answerId);
  const answerIds = [answerId, ...(children ?? []).map((c) => c.id)];
  const { data } = await svc
    .from("story_photos")
    .select("storage_path")
    .eq("family_id", familyId)
    .in("answer_id", answerIds);
  return (data ?? []).map((p) => p.storage_path).filter((p): p is string => !!p);
}

// Photo keys for every story under a storyteller (their whole archive). Joins
// story_photos to answers (inner) so we scope by storyteller without a column.
export async function collectStorytellerPhotoPaths(
  familyId: string,
  storytellerId: string
): Promise<string[]> {
  const svc = supabaseService();
  const { data } = await svc
    .from("story_photos")
    .select("storage_path, answers!inner(storyteller_id)")
    .eq("family_id", familyId)
    .eq("answers.storyteller_id", storytellerId);
  return (data ?? []).map((p) => p.storage_path).filter((p): p is string => !!p);
}
