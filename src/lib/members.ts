// Family members (voice-per-member). Lists the people in a family with a display
// name and whether they've recorded a cloned voice — drives the storyteller
// "Interviewer" picker and the Settings "Family voices" overview.
//
// Membership rows are RLS-scoped via the SSR client. Display names/emails live in
// auth.users (not RLS-readable), so they come from a service-role admin lookup —
// gated by the caller already being a member of the family before this runs.
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export type FamilyMember = {
  userId: string;
  name: string; // best display name (full_name/name → email local part → "Member")
  email: string | null;
  role: "owner" | "admin" | "viewer";
  hasVoice: boolean; // a cloned voice is recorded for this member
};

function displayName(
  meta: Record<string, unknown> | undefined,
  email: string | null,
): string {
  const m = meta ?? {};
  const full = (m.full_name ?? m.name) as string | undefined;
  if (full && full.trim()) return full.trim();
  if (email) return email.split("@")[0];
  return "Member";
}

export async function loadFamilyMembers(familyId: string): Promise<FamilyMember[]> {
  const sb = await supabaseServer();
  const [memRes, voiceRes] = await Promise.all([
    sb.from("memberships").select("user_id, role").eq("family_id", familyId),
    sb.from("voice_profiles").select("owner_user_id").eq("family_id", familyId),
  ]);

  const withVoice = new Set(
    (voiceRes.data ?? []).map((v) => v.owner_user_id).filter(Boolean) as string[],
  );

  const svc = supabaseService();
  const members: FamilyMember[] = await Promise.all(
    (memRes.data ?? []).map(async (m) => {
      let email: string | null = null;
      let meta: Record<string, unknown> | undefined;
      try {
        const { data } = await svc.auth.admin.getUserById(m.user_id);
        email = data?.user?.email ?? null;
        meta = data?.user?.user_metadata ?? undefined;
      } catch {
        // best-effort; the row still renders by role
      }
      return {
        userId: m.user_id,
        name: displayName(meta, email),
        email,
        role: m.role,
        hasVoice: withVoice.has(m.user_id),
      };
    }),
  );

  const rank = { owner: 0, admin: 1, viewer: 2 } as const;
  members.sort((a, b) => rank[a.role] - rank[b.role] || a.name.localeCompare(b.name));
  return members;
}
