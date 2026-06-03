"use server";

// Server action for the Overview signals (TODO 6.2): dismiss a surfaced insight
// (mic-failed today; schedule-suggestion / engagement-drop later). Admin-only.
// The guard here is UX; RLS (ins_write = has_family_role admin) is the real
// boundary, enforced regardless of this check.
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Mark a signal handled. Sets dismissed_at so loadSignals stops surfacing it.
// family_id filter is belt-and-suspenders; RLS already scopes the write.
export async function dismissInsight(formData: FormData) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;

  const id = String(formData.get("insight_id") ?? "");
  if (!UUID_RE.test(id)) return;

  const sb = await supabaseServer();
  await sb
    .from("insights")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("family_id", active.family_id);

  revalidatePath("/dashboard");
}
