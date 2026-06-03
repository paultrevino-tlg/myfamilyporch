// Settings data for the admin dashboard (TODO 5.5). The Settings surface gathers
// the four panel fields from the prototype: storyteller phones (where the SMS
// story link goes), the signed-in admin's own alert number (failure alerts),
// the cloned-voice status for the member's interviewer relationships, and the
// family-access roster + invitations.
//
// Reads are RLS-scoped via the SSR client. The ONE exception is resolving member
// emails: auth.users isn't RLS-readable, so the roster emails come from a
// service-role admin lookup (server-only), gated by the caller already being an
// admin of the active family before this loader runs.
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export type StorytellerPhone = {
  id: string;
  name: string;
  phone: string | null;
};

export type VoiceStatus = {
  storytellerId: string;
  storytellerName: string;
  voiceLabel: string | null; // null = no cloned voice linked yet
};

export type RosterMember = {
  userId: string;
  email: string | null;
  role: "owner" | "admin" | "viewer";
  isYou: boolean;
};

export type PendingInvite = {
  email: string;
  role: "owner" | "admin" | "viewer";
  status: "Accepted" | "Expired" | "Pending";
};

export type FamilySettings = {
  storytellers: StorytellerPhone[];
  myAlertPhone: string | null;
  voices: VoiceStatus[];
  roster: RosterMember[];
  invitations: PendingInvite[];
};

export async function loadSettings(familyId: string): Promise<FamilySettings> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const myId = user?.id ?? "";

  const [stRes, memRes, invRes, relRes] = await Promise.all([
    sb
      .from("storytellers")
      .select("id, name, phone")
      .eq("family_id", familyId),
    sb
      .from("memberships")
      .select("user_id, role, alert_phone")
      .eq("family_id", familyId),
    sb
      .from("invitations")
      .select("email, role, accepted_at, expires_at, created_at")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false }),
    // Cloned voice belongs to the signed-in member's interviewer relationships
    // ("what Dad hears asking the questions" = THIS member's voice).
    sb
      .from("storyteller_relationships")
      .select(
        "storyteller_id, is_interviewer, storytellers(name), voice_profiles(label)",
      )
      .eq("family_id", familyId)
      .eq("user_id", myId)
      .eq("is_interviewer", true),
  ]);

  const storytellers: StorytellerPhone[] = (stRes.data ?? [])
    .map((s) => ({ id: s.id, name: s.name, phone: s.phone }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const myAlertPhone =
    (memRes.data ?? []).find((m) => m.user_id === myId)?.alert_phone ?? null;

  // Resolve member emails via the service role (auth.users isn't RLS-readable).
  const svc = supabaseService();
  const roster: RosterMember[] = await Promise.all(
    (memRes.data ?? []).map(async (m) => {
      let email: string | null = null;
      try {
        const { data } = await svc.auth.admin.getUserById(m.user_id);
        email = data?.user?.email ?? null;
      } catch {
        email = null; // best-effort; the row still renders by role
      }
      return { userId: m.user_id, email, role: m.role, isYou: m.user_id === myId };
    }),
  );
  // owner → admin → viewer, then you first within a tie for a stable, readable list.
  const rank = { owner: 0, admin: 1, viewer: 2 } as const;
  roster.sort(
    (a, b) => rank[a.role] - rank[b.role] || Number(b.isYou) - Number(a.isYou),
  );

  const invitations: PendingInvite[] = (invRes.data ?? []).map((inv) => ({
    email: inv.email,
    role: inv.role,
    status: inv.accepted_at
      ? "Accepted"
      : new Date(inv.expires_at) < new Date()
        ? "Expired"
        : "Pending",
  }));

  const voices: VoiceStatus[] = (relRes.data ?? [])
    .map((r) => {
      // PostgREST embeds to-one relations as an object at runtime; the generated
      // types widen them to arrays — normalize either shape.
      const st = r.storytellers as unknown;
      const vp = r.voice_profiles as unknown;
      const storytellerName =
        (Array.isArray(st) ? st[0]?.name : (st as { name?: string } | null)?.name) ??
        "Storyteller";
      const voiceLabel =
        (Array.isArray(vp) ? vp[0]?.label : (vp as { label?: string } | null)?.label) ??
        null;
      return { storytellerId: r.storyteller_id, storytellerName, voiceLabel };
    })
    .sort((a, b) => a.storytellerName.localeCompare(b.storytellerName));

  return { storytellers, myAlertPhone, voices, roster, invitations };
}
