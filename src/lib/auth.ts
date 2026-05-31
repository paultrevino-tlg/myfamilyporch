// Family-membership helpers for the authenticated family/admin area.
// All reads go through the cookie-bound SSR client, so RLS scopes them to the
// signed-in member automatically. Reused by onboarding (1.2) and the family
// switcher (1.3).
import { supabaseServer } from "@/lib/supabase/server";

export type Membership = {
  family_id: string;
  role: "owner" | "admin" | "viewer";
};

// The caller's memberships across all their families (empty for a brand-new user).
export async function getMemberships(): Promise<Membership[]> {
  const sb = await supabaseServer();
  const { data } = await sb.from("memberships").select("family_id,role");
  return data ?? [];
}
