"use server";

// Settings actions (TODO 5.5). Admin-only; RLS is the real boundary
// (st_write = admin for storyteller phones, mem_write = admin for the alert
// number — and the alert-number write is additionally scoped to the caller's
// OWN membership row). Family-access invites reuse the 1.3 createInvitation
// action; cloned-voice setup lives on /storytellers (4.1) and is only surfaced
// here, so it has no action of its own.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Normalize a phone for SMS: keep a single leading "+" then digits only. Returns
// the cleaned E.164-ish string, or null when blank / not a plausible number
// (7–15 digits, per E.164). Twilio wants E.164; we store what the admin typed
// once it passes this gate. Blank clears the field.
function normalizePhone(raw: string): { ok: true; value: string | null } | { ok: false } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null }; // blank = clear
  const plus = trimmed.startsWith("+") ? "+" : "";
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return { ok: false };
  return { ok: true, value: `${plus}${digits}` };
}

// Set/clear a storyteller's SMS phone (where the story deep link is texted).
export async function setStorytellerPhone(formData: FormData) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;

  const storytellerId = String(formData.get("storyteller_id") ?? "");
  if (!UUID_RE.test(storytellerId)) return;

  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!phone.ok) {
    redirect(`/storytellers/${storytellerId}?error=phone`);
  }

  // A2P 10DLC consent gate: a non-blank number can only be saved when the admin
  // checks the consent box confirming the storyteller agreed to receive
  // reminders. Clearing the number (value === null) needs no consent.
  if (phone.value && formData.get("consent") !== "on") {
    redirect(`/storytellers/${storytellerId}?error=consent`);
  }

  const sb = await supabaseServer();
  const { error } = await sb
    .from("storytellers")
    .update({ phone: phone.value })
    .eq("id", storytellerId)
    .eq("family_id", active.family_id);
  if (error) throw error;

  revalidatePath(`/storytellers/${storytellerId}`);
  redirect(`/storytellers/${storytellerId}?saved=phone`);
}

// Set/clear the signed-in admin's OWN alert number (failure alerts). Scoped to
// user_id = the caller, so an admin can only set their own — never another
// member's. The mic-failed route reads these to text each admin.
export async function setAlertPhone(formData: FormData) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;

  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!phone.ok) {
    redirect("/settings?error=alert");
  }

  // A2P 10DLC consent gate: saving a real alert number requires the admin to
  // confirm they agree to receive failure-alert texts at it. Clearing is exempt.
  if (phone.value && formData.get("consent") !== "on") {
    redirect("/settings?error=alert-consent");
  }

  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await sb
    .from("memberships")
    .update({ alert_phone: phone.value })
    .eq("family_id", active.family_id)
    .eq("user_id", user.id);
  if (error) throw error;

  revalidatePath("/settings");
  redirect("/settings?saved=alert");
}
