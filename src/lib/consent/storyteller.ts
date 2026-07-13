// Storyteller consent: the authorization-page flow (docs/consent-flow.md,
// steps 5-10). This is the LEGAL SPINE — the storyteller's own first-person tap
// is the operative consent, never the family member's. Nothing from our A2P
// system reaches the storyteller until confirmStorytellerConsent runs.
//
// SERVER-ONLY. Uses the service role: the auth page is token-gated (tapped on
// the storyteller's phone with no session), and the signed 'consent' token is
// the authorization. Follows the provider failure contract (fail soft on
// missing Twilio config).
import { supabaseService } from "@/lib/supabase/service";
import { sendSms } from "@/lib/sms/twilio";
import { preSendGate } from "@/lib/sms/gate";
import { signConsentToken, verifyConsentToken } from "./token";
import { last4 } from "@/lib/phone";
import { t, type Lang } from "@/lib/i18n";

// The consent link is long-lived — an elder may open it days after the family
// member texts it (never a scolding timeout, per Elder-facing UX).
const CONSENT_TTL_SECONDS = 30 * 24 * 60 * 60;

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name.trim();
}

// Step 5: mint the storyteller's authorization link. Called by the copy-paste
// block UI (Phase 4C.D); exposed here so the whole flow is testable now. The
// phone + family + storyteller travel INSIDE the signed token, not the URL path.
export async function buildConsentLink(
  storytellerId: string,
  familyId: string,
  phoneE164: string,
  language: Lang,
): Promise<string | null> {
  const token = await signConsentToken(
    { purpose: "consent", familyId, storytellerId, phone: phoneE164, language },
    CONSENT_TTL_SECONDS,
    Date.now(),
  );
  if (!token) return null;
  const base = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
  return `${base}/c/${token}`;
}

export type ConsentContext = {
  storytellerId: string;
  familyId: string;
  name: string;
  last4: string;
  language: Lang;
};

// Step 7 (paint): verify the token and load what the authorization page shows.
// Returns null on a forged/expired token or a missing storyteller (calm dead-link).
export async function loadConsentContext(token: string): Promise<ConsentContext | null> {
  const payload = await verifyConsentToken(token, "consent", Date.now());
  if (!payload || !payload.storytellerId) return null;
  const db = supabaseService();
  const { data: st } = await db
    .from("storytellers")
    .select("id, name, language")
    .eq("id", payload.storytellerId)
    .eq("family_id", payload.familyId)
    .maybeSingle();
  if (!st) return null;
  return {
    storytellerId: st.id,
    familyId: payload.familyId,
    name: st.name,
    last4: last4(payload.phone),
    language: payload.language === "es" ? "es" : "en",
  };
}

export type ConfirmResult =
  | { status: "confirmed"; language: Lang }
  | { status: "invalid" };

// Step 8-10: the storyteller taps "Yes, text me". Record the operative consent
// (append-only), clear any prior suppression (a fresh first-party opt-in beats a
// past STOP), and fire the step-9 (storyteller) + step-10 (family) sends.
// Idempotent: a re-submit re-affirms without stacking events or re-texting.
export async function confirmStorytellerConsent(
  token: string,
  opts: { name?: string; language?: Lang; ip?: string | null; ua?: string | null },
): Promise<ConfirmResult> {
  const payload = await verifyConsentToken(token, "consent", Date.now());
  if (!payload || !payload.storytellerId) return { status: "invalid" };

  const db = supabaseService();
  const { data: st } = await db
    .from("storytellers")
    .select("id, name, consent_state, family_id")
    .eq("id", payload.storytellerId)
    .eq("family_id", payload.familyId)
    .maybeSingle();
  if (!st) return { status: "invalid" };

  const lang: Lang = (opts.language ?? payload.language) === "es" ? "es" : "en";
  const editedName = opts.name?.trim() || null;
  const alreadyOptedIn = st.consent_state === "opted_in";

  // Persist opt-in + the storyteller's own edits (name / language chosen on the
  // page before opting in).
  const update: Record<string, unknown> = { consent_state: "opted_in", language: lang };
  if (editedName && editedName !== st.name) update.name = editedName;
  await db.from("storytellers").update(update).eq("id", st.id).eq("family_id", st.family_id);

  // A fresh first-party opt-in clears any prior suppression for this number.
  await db.from("sms_suppressions").delete().eq("phone_e164", payload.phone);

  if (!alreadyOptedIn) {
    // The operative consent event — the EXACT localized opt-in control copy.
    await db.from("consent_events").insert({
      family_id: st.family_id,
      subject_type: "storyteller",
      subject_id: st.id,
      phone_e164: payload.phone,
      event_type: "opt_in",
      method: "auth_page",
      disclosure_text: t(lang, "consent_optin_control"),
      language: lang,
      ip: opts.ip ?? null,
      user_agent: opts.ua ?? null,
    });

    const stName = firstName(editedName ?? st.name);
    // Step 9: the storyteller's confirmation — first message under valid consent.
    // They just acted, so it's a direct response (quiet-hours exempt).
    await sendSms(payload.phone, t(lang, "sms_storyteller_welcome", { name: stName }));
    // Step 10: tell the family member who set this up that their storyteller is ready.
    await notifyFamilyReady(db, st.id, st.family_id, stName);
  }

  return { status: "confirmed", language: lang };
}

// Step 10: notify the interviewer member. Gated — the member must be opted_in
// (they consented at signup) and not suppressed. Sent in the MEMBER's language.
// Fully fail-soft: a miss never blocks the storyteller's confirmation.
async function notifyFamilyReady(
  db: ReturnType<typeof supabaseService>,
  storytellerId: string,
  familyId: string,
  storytellerFirstName: string,
): Promise<void> {
  try {
    const { data: rels } = await db
      .from("storyteller_relationships")
      .select("user_id, is_interviewer")
      .eq("storyteller_id", storytellerId)
      .order("is_interviewer", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1);
    const userId = rels?.[0]?.user_id;
    if (!userId) return;

    const { data: mem } = await db
      .from("memberships")
      .select("sms_phone, consent_state, language")
      .eq("family_id", familyId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!mem?.sms_phone) return;
    const gate = await preSendGate(db, { consentState: mem.consent_state, phone: mem.sms_phone });
    if (!gate.ok) return;

    const mlang: Lang = mem.language === "es" ? "es" : "en";
    await sendSms(mem.sms_phone, t(mlang, "sms_family_ready", { name: storytellerFirstName }));
  } catch (e) {
    console.error("[consent] family-ready notify failed", e);
  }
}
