// Settings data for the admin dashboard (TODO 5.5). Gathers the Settings panels:
// the signed-in member's own SMS number + consent state, THEIR cloned voice
// ("My voice" — voice-per-member), and the family-access roster + invitations.
//
// Reads are RLS-scoped via the SSR client. The ONE exception is resolving member
// names/emails: auth.users isn't RLS-readable, so those come from a service-role
// admin lookup (in loadFamilyMembers), gated by the caller already being a member.
import { supabaseServer } from "@/lib/supabase/server";
import { loadFamilyMembers, type FamilyMember } from "@/lib/members";

export type MyVoice = { id: string; label: string } | null;

export type RosterMember = FamilyMember & { isYou: boolean };

export type PendingInvite = {
  id: string;
  email: string;
  role: "owner" | "admin" | "viewer";
  status: "Accepted" | "Expired" | "Pending";
};

// The signed-in member's own SMS state: the ONE consented number (migration
// 0016 merged the old separate alert_phone into it), where it stands in the
// consent lifecycle, and whether they want session-failure alerts on it.
export type MySms = {
  phone: string | null;
  consentState: "pending" | "opted_in" | "opted_out";
  language: "en" | "es";
  alertOnFailure: boolean;
};

export type FamilySettings = {
  mySms: MySms;
  myVoice: MyVoice;
  roster: RosterMember[];
  invitations: PendingInvite[];
};

export async function loadSettings(familyId: string): Promise<FamilySettings> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const myId = user?.id ?? "";

  const [members, memRes, invRes, voiceRes] = await Promise.all([
    loadFamilyMembers(familyId),
    // Only the caller's OWN row — this panel is "my number", and there's no
    // reason to pull every family member's phone to render it.
    sb
      .from("memberships")
      .select("sms_phone, consent_state, language, alert_on_failure")
      .eq("family_id", familyId)
      .eq("user_id", myId)
      .maybeSingle(),
    sb
      .from("invitations")
      .select("id, email, role, accepted_at, expires_at, created_at")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false }),
    // My own cloned voice (voice-per-member). owner_user_id = me.
    sb
      .from("voice_profiles")
      .select("id, label")
      .eq("family_id", familyId)
      .eq("owner_user_id", myId)
      .maybeSingle(),
  ]);

  const myMem = memRes.data;
  const mySms: MySms = {
    phone: myMem?.sms_phone ?? null,
    consentState:
      myMem?.consent_state === "opted_in" || myMem?.consent_state === "opted_out"
        ? myMem.consent_state
        : "pending",
    language: myMem?.language === "es" ? "es" : "en",
    alertOnFailure: myMem?.alert_on_failure ?? false,
  };

  const myVoice: MyVoice = voiceRes.data
    ? { id: voiceRes.data.id, label: voiceRes.data.label }
    : null;

  const roster: RosterMember[] = members.map((m) => ({ ...m, isYou: m.userId === myId }));

  const invitations: PendingInvite[] = (invRes.data ?? []).map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    status: inv.accepted_at
      ? "Accepted"
      : new Date(inv.expires_at) < new Date()
        ? "Expired"
        : "Pending",
  }));

  return { mySms, myVoice, roster, invitations };
}
