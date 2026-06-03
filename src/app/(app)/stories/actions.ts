"use server";

// Server actions for Stories review (TODO 5.2): toggle a story "in the book"
// and edit its transcript. Both are admin-only. The guard here is UX; RLS
// (ans_write = has_family_role admin) is the real boundary, enforced regardless.
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";

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
  await sb
    .from("answers")
    .update({ transcript })
    .eq("id", id)
    .eq("family_id", active.family_id);

  revalidatePath("/stories");
}
