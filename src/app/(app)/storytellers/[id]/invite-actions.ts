"use server";

// "Send this to my phone" — texts the family member a forwardable copy of the
// storyteller's invitation, on demand (never automatically). Shared by the
// storyteller page and the setup wizard, which both render CopyBlock.
//
// The invitation text is rebuilt HERE rather than accepted from the client: the
// client already displays it, but taking it as input would let a caller put
// arbitrary text into an outbound A2P message. The action takes only a
// storyteller id, re-derives the message from the database, and sends it to the
// caller's OWN verified number.
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";
import { buildConsentLink } from "@/lib/consent/storyteller";
import { sendInviteCopyToMember, type InviteCopyResult } from "@/lib/consent/invite";
import { t, type Lang } from "@/lib/i18n";

export async function sendInviteToMyPhone(storytellerId: string): Promise<InviteCopyResult> {
  // Same boundary as every other storyteller write (setStorytellerPhone et al):
  // the button only renders for admins, but a server action is callable
  // directly, so the guard belongs here too.
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return { status: "error" };

  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { status: "error" };

  // The caller's own membership row in the active family (RLS-scoped) — this is
  // the number the copy is sent to, so it can only ever be their own.
  const { data: mem } = await sb
    .from("memberships")
    .select("id")
    .eq("family_id", active.family_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!mem) return { status: "error" };

  // RLS-scoped read: a storyteller id from another family resolves to nothing.
  const { data: st } = await sb
    .from("storytellers")
    .select("id, name, phone, language, consent_state")
    .eq("id", storytellerId)
    .eq("family_id", active.family_id)
    .maybeSingle();
  if (!st?.phone?.trim()) return { status: "skipped", reason: "no-number" };

  // Once they've opted in, the invitation is spent — there's nothing to forward.
  if (st.consent_state === "opted_in") return { status: "error" };

  const stLang: Lang = st.language === "es" ? "es" : "en";
  const link = await buildConsentLink(st.id, active.family_id, st.phone.trim(), stLang);
  if (!link) return { status: "error" };

  const firstName = st.name.trim().split(/\s+/)[0] || st.name;
  const inviteMessage = t(stLang, "copy_paste_block", { name: firstName, link });

  return sendInviteCopyToMember({
    membershipId: mem.id,
    familyId: active.family_id,
    storytellerName: firstName,
    inviteMessage,
  });
}
