// Member phone verification + first-party SMS opt-in (docs/consent-flow.md,
// steps 1-3). The family member is now an A2P recipient (magic-link SMS,
// copy-block delivery, "ready to begin"). This module proves they possess the
// number they entered and records their OWN express opt-in in the append-only
// consent_events audit — the exact opposite of the rejected proxy model, since
// the member consents for their own number.
//
// SERVER-ONLY. Uses the service role because the confirm link is tapped on the
// member's phone, which may carry no Supabase session. The signed token is the
// authorization (it names the membership); the service role only applies what
// the token attests. Follows the provider failure contract (fail soft on
// missing config; a real Twilio error with creds present throws upstream).
import { supabaseService } from "@/lib/supabase/service";
import { sendSms } from "@/lib/sms/twilio";
import { signConsentToken, verifyConsentToken } from "./token";
import { t, type Lang } from "@/lib/i18n";

// The verify link is long-lived (elder-adjacent, forgiving) but not forever.
const VERIFY_TTL_SECONDS = 24 * 60 * 60;

export type StartResult =
  | { status: "sent" }
  | { status: "error"; reason: "no-secret" | "not-found" };

export type ConfirmResult =
  | { status: "confirmed"; language: Lang; phone: string }
  | { status: "invalid" };

// Step 1→2: persist the member's number (state → pending), mint a possession
// token, and send the magic-link SMS to their own number. Caller must have
// already authorized the request (it's the signed-in member acting on their own
// membership row).
export async function startMemberVerification(
  membershipId: string,
  familyId: string,
  phoneE164: string,
  language: Lang,
): Promise<StartResult> {
  const db = supabaseService();

  // Defense in depth: confirm the membership is in the named family before the
  // service role writes to it.
  const { data: m } = await db
    .from("memberships")
    .select("id")
    .eq("id", membershipId)
    .eq("family_id", familyId)
    .maybeSingle();
  if (!m) return { status: "error", reason: "not-found" };

  const token = await signConsentToken(
    { purpose: "member_verify", familyId, membershipId, phone: phoneE164, language },
    VERIFY_TTL_SECONDS,
    Date.now(),
  );
  if (!token) return { status: "error", reason: "no-secret" };

  await db
    .from("memberships")
    .update({
      sms_phone: phoneE164,
      language,
      consent_state: "pending",
      sms_confirm_sent_at: new Date().toISOString(),
    })
    .eq("id", membershipId)
    .eq("family_id", familyId);

  const base = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
  const url = `${base}/verify/${token}`;
  // {link} is a URL — no brace collisions with the interpolator, so it's safe to
  // place inline (matches the SPEC layout, unlike the nudge which appends).
  await sendSms(phoneE164, t(language, "magic_link_sms", { link: url }));
  return { status: "sent" };
}

// Step 3: the member taps the SMS link. Verify the token, flip consent to
// opted_in, and append the opt-in event carrying the EXACT disclosure they
// agreed to on the form (consent_events is append-only). Idempotent: a re-tap
// re-affirms without stacking duplicate opt-in rows.
export async function confirmMemberVerification(
  token: string,
  meta: { ip?: string | null; ua?: string | null },
): Promise<ConfirmResult> {
  const payload = await verifyConsentToken(token, "member_verify", Date.now());
  if (!payload || !payload.membershipId) return { status: "invalid" };
  const lang: Lang = payload.language === "es" ? "es" : "en";
  const db = supabaseService();

  const { data: current } = await db
    .from("memberships")
    .select("consent_state")
    .eq("id", payload.membershipId)
    .eq("family_id", payload.familyId)
    .maybeSingle();
  if (!current) return { status: "invalid" };

  if (current.consent_state !== "opted_in") {
    await db
      .from("memberships")
      .update({ consent_state: "opted_in" })
      .eq("id", payload.membershipId)
      .eq("family_id", payload.familyId);

    // The disclosure they agreed to was shown on the English app form (the app
    // UI is English for v1 — see Phase 8), so the audit records the English copy
    // and 'en' as the disclosure language, independent of payload.language
    // (their chosen SMS language, stored on memberships.language).
    // TODO: localize the form disclosure when the app UI goes bilingual.
    await db.from("consent_events").insert({
      family_id: payload.familyId,
      subject_type: "member",
      subject_id: payload.membershipId,
      phone_e164: payload.phone,
      event_type: "opt_in",
      method: "magic_link",
      disclosure_text: t("en", "member_optin_disclosure"),
      language: "en",
      ip: meta.ip ?? null,
      user_agent: meta.ua ?? null,
    });
  }

  return { status: "confirmed", language: lang, phone: payload.phone };
}
