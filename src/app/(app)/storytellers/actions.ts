"use server";

// Server actions for storyteller + relationship CRUD (TODO 2.1).
// A storyteller holds shared facts (name, pronouns, birth year, language);
// the relationship is per-member (address term, kind, asker relation,
// interviewer flag), keyed unique(user_id, storyteller_id) — the same elder is
// "Dad" to one member and "Grandpa" to another. Writes require admin; RLS
// (st_write / rel_write) enforces the same boundary regardless of this guard.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";
import { mintStorytellerToken, revokeStorytellerTokens } from "@/lib/storyteller/token";
import { sendStorytellerNudge } from "@/lib/sms/nudge";
import { deleteVoice } from "@/lib/voice/elevenlabs";
import {
  collectStorytellerAudioPaths,
  removeAudioObjects,
  collectStorytellerPhotoPaths,
  removePhotoObjects,
} from "@/lib/storage/cleanup";
import type { Database } from "@/lib/supabase/database.types";

type Pronouns = Database["public"]["Enums"]["pronoun_set"];
type Kind = Database["public"]["Enums"]["relationship_type"];

const PRONOUNS: Pronouns[] = ["he_him", "she_her", "they_them"];
const KINDS: Kind[] = ["any", "parent", "grandparent", "aunt_uncle", "sibling", "spouse", "other"];
const LANGS = ["en", "es"] as const;

// Coerce free-form form values to the DB enums, falling back to a safe default.
function asPronouns(v: unknown): Pronouns {
  return PRONOUNS.includes(v as Pronouns) ? (v as Pronouns) : "they_them";
}
function asKind(v: unknown): Kind {
  return KINDS.includes(v as Kind) ? (v as Kind) : "other";
}
function asLang(v: unknown): string {
  return (LANGS as readonly string[]).includes(String(v)) ? String(v) : "en";
}
// birth_year: a plausible 4-digit year, else null (the column is nullable).
function asBirthYear(v: unknown): number | null {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isInteger(n) && n >= 1900 && n <= 2025 ? n : null;
}

// Create a storyteller in the active family AND the creating member's
// relationship to them, together — a storyteller isn't useful without an
// address term to resolve prompt tokens against.
export async function createStoryteller(formData: FormData) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;

  const name = String(formData.get("name") ?? "").trim();
  const address_term = String(formData.get("address_term") ?? "").trim();
  if (!name || !address_term) return;

  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: storyteller, error } = await sb
    .from("storytellers")
    .insert({
      family_id: active.family_id,
      name,
      pronouns: asPronouns(formData.get("pronouns")),
      birth_year: asBirthYear(formData.get("birth_year")),
      language: asLang(formData.get("language")),
    })
    .select("id")
    .single();
  if (error) throw error;

  const { error: relError } = await sb.from("storyteller_relationships").insert({
    family_id: active.family_id,
    user_id: user.id,
    storyteller_id: storyteller.id,
    address_term,
    kind: asKind(formData.get("kind")),
    asker_relation: String(formData.get("asker_relation") ?? "").trim() || null,
    is_interviewer: formData.get("is_interviewer") === "on",
  });
  if (relError) throw relError;

  revalidatePath("/dashboard");
  redirect(`/storytellers/${storyteller.id}`);
}

// Update a storyteller's shared facts. Scoped to the active family so a stray id
// can't touch another tenant (RLS would block it anyway).
export async function updateStoryteller(formData: FormData) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;

  const sb = await supabaseServer();
  const { error } = await sb
    .from("storytellers")
    .update({
      name,
      pronouns: asPronouns(formData.get("pronouns")),
      birth_year: asBirthYear(formData.get("birth_year")),
      language: asLang(formData.get("language")),
    })
    .eq("id", id)
    .eq("family_id", active.family_id);
  if (error) throw error;

  revalidatePath(`/storytellers/${id}`);
  redirect(`/storytellers/${id}`);
}

// Choose which family member interviews this storyteller (voice-per-member).
// The picked member becomes the single interviewer, and the questions play in
// THEIR voice (resolved later via voice_profiles.owner_user_id). The interviewer
// relationship also carries the address term + kind the AI/SMS use, so they're
// set here too. Exactly one interviewer per storyteller (DB enforces it), so we
// clear the flag on every other relationship first, then upsert the chosen one.
export async function setInterviewer(formData: FormData) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;

  const storyteller_id = String(formData.get("storyteller_id") ?? "");
  const user_id = String(formData.get("user_id") ?? "");
  const address_term = String(formData.get("address_term") ?? "").trim();
  if (!storyteller_id || !user_id || !address_term) {
    redirect(`/storytellers/${storyteller_id}?error=interviewer`);
  }

  const sb = await supabaseServer();

  // The storyteller must be in the active family, and the chosen interviewer must
  // be a member of it — refuse a stray id rather than write a bogus edge.
  const [{ data: storyteller }, { data: member }] = await Promise.all([
    sb.from("storytellers").select("id").eq("id", storyteller_id).eq("family_id", active.family_id).maybeSingle(),
    sb.from("memberships").select("user_id").eq("family_id", active.family_id).eq("user_id", user_id).maybeSingle(),
  ]);
  if (!storyteller || !member) {
    redirect(`/storytellers/${storyteller_id}?error=interviewer`);
  }

  // Single interviewer: demote everyone for this storyteller before promoting the
  // pick (the partial unique index would otherwise reject two interviewers).
  await sb
    .from("storyteller_relationships")
    .update({ is_interviewer: false })
    .eq("storyteller_id", storyteller_id)
    .eq("family_id", active.family_id);

  const { error } = await sb.from("storyteller_relationships").upsert(
    {
      family_id: active.family_id,
      user_id,
      storyteller_id,
      address_term,
      kind: asKind(formData.get("kind")),
      asker_relation: String(formData.get("asker_relation") ?? "").trim() || null,
      is_interviewer: true,
    },
    { onConflict: "user_id,storyteller_id" },
  );
  if (error) throw error;

  revalidatePath(`/storytellers/${storyteller_id}`);
  redirect(`/storytellers/${storyteller_id}?saved=interviewer`);
}

// Mint a recording link (magic-link token) for a storyteller. We authorize via
// the RLS-scoped SSR client first (the storyteller must be visible to this admin
// in the active family), THEN mint with the service role. The token is stored
// both hashed (for validation) and encrypted-at-rest (for re-display), so the
// page renders the shareable URL persistently — no one-time ?link= round-trip.
export async function createRecordingLink(formData: FormData) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;

  const storytellerId = String(formData.get("storyteller_id") ?? "");
  if (!storytellerId) return;

  const sb = await supabaseServer();
  const { data: storyteller } = await sb
    .from("storytellers")
    .select("id")
    .eq("id", storytellerId)
    .eq("family_id", active.family_id)
    .maybeSingle();
  if (!storyteller) return; // not visible to this admin → refuse

  const token = await mintStorytellerToken(storytellerId, active.family_id);
  revalidatePath(`/storytellers/${storytellerId}`);
  if (!token) redirect(`/storytellers/${storytellerId}?error=link`); // secret unset / mint failed
  redirect(`/storytellers/${storytellerId}`);
}

// Revoke all active recording links for a storyteller (same authorization path).
export async function revokeRecordingLinks(formData: FormData) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;

  const storytellerId = String(formData.get("storyteller_id") ?? "");
  if (!storytellerId) return;

  const sb = await supabaseServer();
  const { data: storyteller } = await sb
    .from("storytellers")
    .select("id")
    .eq("id", storytellerId)
    .eq("family_id", active.family_id)
    .maybeSingle();
  if (!storyteller) return;

  await revokeStorytellerTokens(storytellerId);
  revalidatePath(`/storytellers/${storytellerId}`);
  redirect(`/storytellers/${storytellerId}`);
}

// Send a localized story nudge now (TODO 4.3). Manual "ask now" hook so the SMS
// path is exercisable today; the weekly cron (6.1) and full Schedule surface
// (5.4) reuse sendStorytellerNudge. Authorize via the RLS-scoped client (the
// storyteller must be visible to this admin in the active family), then send
// with the service role. Fail-soft outcomes (no phone / no link) surface as a
// query flag rather than an error.
export async function sendNudge(formData: FormData) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;

  const storytellerId = String(formData.get("storyteller_id") ?? "");
  if (!storytellerId) return;

  const sb = await supabaseServer();
  const { data: storyteller } = await sb
    .from("storytellers")
    .select("id")
    .eq("id", storytellerId)
    .eq("family_id", active.family_id)
    .maybeSingle();
  if (!storyteller) return; // not visible to this admin → refuse

  let flag = "nudge";
  try {
    const result = await sendStorytellerNudge(storytellerId, active.family_id);
    flag = result.status === "sent" ? "nudge" : `nudge_${result.reason}`;
  } catch (e) {
    console.error("[storytellers/sendNudge] send failed", e);
    flag = "nudge_failed";
  }

  revalidatePath(`/storytellers/${storytellerId}`);
  redirect(`/storytellers/${storytellerId}?sent=${flag}`);
}

// Remove MY cloned voice (voice-per-member). A member manages their own voice in
// Settings → My voice; this deletes the ElevenLabs voice + the voice_profiles row
// owned by the caller. Any signed-in member may remove their OWN voice (owner_user_id
// is the guard — you can't delete someone else's).
export async function deleteMyVoice() {
  const active = await getActiveMembership();
  if (!active) return;

  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await sb
    .from("voice_profiles")
    .select("id, provider_voice")
    .eq("family_id", active.family_id)
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!profile) return;

  if (profile.provider_voice) await deleteVoice(profile.provider_voice);
  await sb.from("voice_profiles").delete().eq("id", profile.id);

  revalidatePath("/settings");
  redirect("/settings");
}

// Remove a storyteller. Cascades drop their relationships, sessions, answers, etc.
// DB cascades DON'T touch Storage, so we erase the private recordings first
// (5.2a) — before the row delete, so a storage failure aborts and never leaves
// orphaned voice files behind a deleted storyteller.
export async function deleteStoryteller(formData: FormData) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Erase the storyteller's audio + keepsake photos (7.1), then the row
  // (answers + story_photos cascade). Objects go before the row delete so a
  // storage failure aborts and never orphans media.
  await removeAudioObjects(await collectStorytellerAudioPaths(active.family_id, id));
  await removePhotoObjects(await collectStorytellerPhotoPaths(active.family_id, id));

  const sb = await supabaseServer();
  const { error } = await sb
    .from("storytellers")
    .delete()
    .eq("id", id)
    .eq("family_id", active.family_id);
  if (error) throw error;

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
