"use server";

// Topics steering action (TODO 5.3). Admin-only; RLS (tp_write = admin) is the
// real boundary. Sets a per-storyteller category preference (focus/ease_off/
// avoid) or clears it back to neutral (deletes the row). The opening-question
// selector (lib/ai/assembly.ts) reads these on the next session.
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";
import type { Database } from "@/lib/supabase/database.types";

type TopicPreference = Database["public"]["Enums"]["topic_preference"];
const PREFS: TopicPreference[] = ["focus", "ease_off", "avoid"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function setTopicPreference(formData: FormData) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;

  const storytellerId = String(formData.get("storyteller_id") ?? "");
  const category = String(formData.get("category") ?? "").trim();
  const raw = String(formData.get("preference") ?? "");
  if (!UUID_RE.test(storytellerId) || !category) return;
  // Empty / unrecognized value clears the preference back to neutral.
  const preference = PREFS.includes(raw as TopicPreference)
    ? (raw as TopicPreference)
    : null;

  const sb = await supabaseServer();
  if (preference === null) {
    await sb
      .from("topic_preferences")
      .delete()
      .eq("storyteller_id", storytellerId)
      .eq("category", category)
      .eq("family_id", active.family_id);
  } else {
    // Upsert on the (storyteller_id, category) unique key — one row per category.
    await sb.from("topic_preferences").upsert(
      {
        family_id: active.family_id,
        storyteller_id: storytellerId,
        category,
        preference,
      },
      { onConflict: "storyteller_id,category" }
    );
  }

  revalidatePath(`/storytellers/${storytellerId}`);
}
