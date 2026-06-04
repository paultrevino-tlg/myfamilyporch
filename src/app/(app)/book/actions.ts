"use server";

// Server actions for the keepsake book (TODO 7.1). All admin-only and family-
// scoped. The role guard here is UX; the real boundary is RLS — ans_write /
// st_write / sp_write are all `has_family_role(admin)`, enforced regardless.
// Called from BookEditor (client) with typed args, not FormData.
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function bookPath(storytellerId: string) {
  return `/book/${storytellerId}`;
}

// Persist the admin's chapter (category) order for one storyteller. Stored as a
// plain text[] of category names; loadBook falls back to the canonical life-arc
// for anything not listed, so a partial array is safe.
export async function reorderChapters(storytellerId: string, categories: string[]) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;
  if (!UUID_RE.test(storytellerId) || !Array.isArray(categories)) return;

  const order = categories
    .filter((c) => typeof c === "string" && c.length > 0 && c.length <= 120)
    .slice(0, 50);

  const sb = await supabaseServer();
  await sb
    .from("storytellers")
    .update({ book_chapter_order: order })
    .eq("id", storytellerId)
    .eq("family_id", active.family_id);

  revalidatePath(bookPath(storytellerId));
}

// Persist story order within a chapter: book_sort = position. The client sends
// the chapter's answer ids in their new order; we stamp each with its index.
export async function reorderStories(storytellerId: string, answerIds: string[]) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;
  if (!UUID_RE.test(storytellerId) || !Array.isArray(answerIds)) return;

  const ids = answerIds.filter((id) => UUID_RE.test(id)).slice(0, 500);
  const sb = await supabaseServer();
  await Promise.all(
    ids.map((id, i) =>
      sb
        .from("answers")
        .update({ book_sort: i })
        .eq("id", id)
        .eq("family_id", active.family_id),
    ),
  );

  revalidatePath(bookPath(storytellerId));
}

// Persist photo order within a story: story_photos.sort = position.
export async function reorderPhotos(storytellerId: string, photoIds: string[]) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;
  if (!UUID_RE.test(storytellerId) || !Array.isArray(photoIds)) return;

  const ids = photoIds.filter((id) => UUID_RE.test(id)).slice(0, 200);
  const sb = await supabaseServer();
  await Promise.all(
    ids.map((id, i) =>
      sb
        .from("story_photos")
        .update({ sort: i })
        .eq("id", id)
        .eq("family_id", active.family_id),
    ),
  );

  revalidatePath(bookPath(storytellerId));
}

// Caption a photo (blank clears it). Family-scoped admin write.
export async function setPhotoCaption(
  storytellerId: string,
  photoId: string,
  caption: string,
) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;
  if (!UUID_RE.test(storytellerId) || !UUID_RE.test(photoId)) return;

  const trimmed = caption.trim().slice(0, 280);
  const sb = await supabaseServer();
  await sb
    .from("story_photos")
    .update({ caption: trimmed.length ? trimmed : null })
    .eq("id", photoId)
    .eq("family_id", active.family_id);

  revalidatePath(bookPath(storytellerId));
}

// Remove a photo: erase the storage object FIRST (service role — the bucket has
// no policies), then the row. Object-before-row so a storage failure aborts and
// never orphans a deleted record's image. Family-scoped throughout.
export async function removePhoto(storytellerId: string, photoId: string) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;
  if (!UUID_RE.test(storytellerId) || !UUID_RE.test(photoId)) return;

  const svc = supabaseService();
  // Family-scoped read: a forged id from another family yields no row → no-op.
  const { data: photo } = await svc
    .from("story_photos")
    .select("storage_path")
    .eq("id", photoId)
    .eq("family_id", active.family_id)
    .maybeSingle();
  if (!photo) return;

  if (photo.storage_path) {
    const { error } = await svc.storage.from("story-photos").remove([photo.storage_path]);
    if (error) {
      console.error("[book/removePhoto] storage remove failed", error);
      throw error; // don't delete the row while the object survives
    }
  }
  await svc
    .from("story_photos")
    .delete()
    .eq("id", photoId)
    .eq("family_id", active.family_id);

  revalidatePath(bookPath(storytellerId));
}
