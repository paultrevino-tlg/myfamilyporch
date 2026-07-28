// On-demand "text me the invitation" (invite hand-off to the member's phone).
//
// The family member composes the storyteller's invitation on a computer but has
// to SEND it from their own handset — that person-to-person text is what carries
// the /c/<token> link, and it is the one message our A2P system must never send
// to the storyteller. This module texts a copy of that invitation to the
// MEMBER's own opted-in number so they can forward it, and only when they ask
// for it by tapping the button. Nothing here reaches the storyteller.
//
// SERVER-ONLY. Uses the service role to read the member's own SMS state (the
// caller has already been authorized as that member by the action). Follows the
// provider failure contract: fail soft, never throw into the UI.
import { supabaseService } from "@/lib/supabase/service";
import { sendSms } from "@/lib/sms/twilio";
import { preSendGate } from "@/lib/sms/gate";
import { t, type Lang } from "@/lib/i18n";

export type InviteCopyResult =
  | { status: "sent" }
  | { status: "skipped"; reason: "no-number" | "not-opted-in" | "suppressed" }
  | { status: "error" };

// Text the member a forwardable copy of the storyteller's invitation.
// `inviteMessage` is the already-built copy_paste_block, in the STORYTELLER's
// language, and is quoted verbatim so it can be forwarded as-is; the wrapper
// around it is rendered in the MEMBER's language.
export async function sendInviteCopyToMember(params: {
  membershipId: string;
  familyId: string;
  storytellerName: string;
  inviteMessage: string;
}): Promise<InviteCopyResult> {
  try {
    const db = supabaseService();

    // Defense in depth: the membership must belong to the named family before
    // the service role reads its number.
    const { data: mem } = await db
      .from("memberships")
      .select("sms_phone, consent_state, language")
      .eq("id", params.membershipId)
      .eq("family_id", params.familyId)
      .maybeSingle();

    if (!mem?.sms_phone) return { status: "skipped", reason: "no-number" };

    const gate = await preSendGate(db, {
      consentState: mem.consent_state,
      phone: mem.sms_phone,
    });
    if (!gate.ok) return { status: "skipped", reason: gate.reason };

    const lang: Lang = mem.language === "es" ? "es" : "en";
    await sendSms(
      mem.sms_phone,
      t(lang, "sms_invite_copy", {
        name: params.storytellerName,
        invite: params.inviteMessage,
      }),
    );
    return { status: "sent" };
  } catch (e) {
    // The on-screen copy block still works, so a failed hand-off must never
    // break the setup flow.
    console.error("[invite-copy] send failed", e);
    return { status: "error" };
  }
}
