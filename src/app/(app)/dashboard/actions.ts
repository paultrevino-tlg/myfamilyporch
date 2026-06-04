"use server";

// Server action for the Overview signals (TODO 6.2): dismiss a surfaced insight
// (mic-failed today; schedule-suggestion / engagement-drop later). Admin-only.
// The guard here is UX; RLS (ins_write = has_family_role admin) is the real
// boundary, enforced regardless of this check.
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

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

// Accept a schedule-suggestion signal (TODO 6.3): shift that storyteller's nudge
// to the recommended time, then dismiss the insight. "Recommend, never
// auto-change" — this only fires on an explicit admin tap of "Switch to {time}".
// Reads the storyteller + suggested time off the insight row itself (so we honor
// what was actually recommended), then upserts the schedule. RLS sch_write /
// ins_write (admin) is the real boundary; the role check here is UX.
export async function applyScheduleSuggestion(formData: FormData) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;

  const id = String(formData.get("insight_id") ?? "");
  if (!UUID_RE.test(id)) return;

  const sb = await supabaseServer();

  // Load the insight (scoped to the active family) for its storyteller + payload.
  const { data: insight } = await sb
    .from("insights")
    .select("id, storyteller_id, payload")
    .eq("id", id)
    .eq("family_id", active.family_id)
    .eq("type", "schedule_suggestion")
    .maybeSingle();
  if (!insight) return;

  const payload = (insight.payload as Record<string, unknown>) ?? {};
  const sendTime = String(payload.suggested_send_time ?? "");
  if (!HHMM_RE.test(sendTime)) return;

  // Shift the nudge. There is always a schedule row (the suggestion is computed
  // from one); update by storyteller within the family.
  await sb
    .from("schedules")
    .update({ send_time_local: sendTime })
    .eq("storyteller_id", insight.storyteller_id as string)
    .eq("family_id", active.family_id);

  await sb
    .from("insights")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("family_id", active.family_id);

  revalidatePath("/dashboard");
  revalidatePath("/schedule");
}
