// Family-membership helpers for the authenticated family/admin area.
// All reads go through the cookie-bound SSR client, so RLS scopes them to the
// signed-in member automatically. The "active family" is a UX cookie, never a
// security boundary — RLS still gates every row regardless of what's selected.
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";

export type Role = "owner" | "admin" | "viewer";
export const ACTIVE_FAMILY_COOKIE = "mfp_family";

export type FamilyMembership = {
  family_id: string;
  role: Role;
  name: string;
};

// owner > admin > viewer. True when `role` meets or exceeds `min`.
export function roleAtLeast(role: Role, min: Role): boolean {
  const rank = { viewer: 1, admin: 2, owner: 3 } as const;
  return rank[role] >= rank[min];
}

// The caller's families with their role in each (empty for a brand-new user).
export async function getFamilies(): Promise<FamilyMembership[]> {
  const sb = await supabaseServer();
  const { data } = await sb
    .from("memberships")
    .select("family_id, role, families(name)")
    .order("created_at", { ascending: true });
  return (data ?? []).map((m) => {
    // Postgrest embeds the to-one `families` as an object at runtime, but the
    // generated types widen it to an array — normalize either shape.
    const fam = m.families as unknown;
    const name = Array.isArray(fam) ? fam[0]?.name : (fam as { name?: string } | null)?.name;
    return { family_id: m.family_id, role: m.role, name: name ?? "Family" };
  });
}

// The family the UI is currently focused on: the cookie's pick if the caller
// still belongs to it, otherwise their first family (null if they have none).
export async function getActiveMembership(): Promise<FamilyMembership | null> {
  const families = await getFamilies();
  if (families.length === 0) return null;
  const store = await cookies();
  const active = store.get(ACTIVE_FAMILY_COOKIE)?.value;
  return families.find((f) => f.family_id === active) ?? families[0];
}
