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

  revalidatePath("/storytellers");
  redirect("/storytellers");
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

  revalidatePath("/storytellers");
  redirect("/storytellers");
}

// Upsert the current member's relationship to a storyteller. The unique
// (user_id, storyteller_id) constraint makes this idempotent per member.
export async function updateMyRelationship(formData: FormData) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;

  const storyteller_id = String(formData.get("storyteller_id") ?? "");
  const address_term = String(formData.get("address_term") ?? "").trim();
  if (!storyteller_id || !address_term) return;

  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await sb.from("storyteller_relationships").upsert(
    {
      family_id: active.family_id,
      user_id: user.id,
      storyteller_id,
      address_term,
      kind: asKind(formData.get("kind")),
      asker_relation: String(formData.get("asker_relation") ?? "").trim() || null,
      is_interviewer: formData.get("is_interviewer") === "on",
    },
    { onConflict: "user_id,storyteller_id" },
  );
  if (error) throw error;

  revalidatePath("/storytellers");
  redirect("/storytellers");
}

// Mint a recording link (magic-link token) for a storyteller. We authorize via
// the RLS-scoped SSR client first (the storyteller must be visible to this admin
// in the active family), THEN mint with the service role. The raw token is shown
// to the admin ONCE — we only ever persist its hash — so it rides back on the
// redirect's ?link= param for a single copy.
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
  revalidatePath("/storytellers");
  if (!token) redirect("/storytellers?error=link"); // secret unset / mint failed
  redirect(`/storytellers?link=${encodeURIComponent(token)}&for=${storytellerId}`);
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
  revalidatePath("/storytellers");
  redirect("/storytellers");
}

// Remove a storyteller. Cascades drop their relationships, sessions, answers, etc.
export async function deleteStoryteller(formData: FormData) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const sb = await supabaseServer();
  const { error } = await sb
    .from("storytellers")
    .delete()
    .eq("id", id)
    .eq("family_id", active.family_id);
  if (error) throw error;

  revalidatePath("/storytellers");
  redirect("/storytellers");
}
