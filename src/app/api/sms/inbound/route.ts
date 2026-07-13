import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";
import { classifyInbound } from "@/lib/sms/keywords";
import { t, type Lang } from "@/lib/i18n";

// Twilio inbound-SMS webhook (consent-flow.md "Inbound keyword handling"). Set as
// the phone number's "A message comes in" URL in the Twilio console. This is the
// half carriers audit hardest, so EVERY inbound is: (1) logged to sms_inbound,
// (2) classified bilingually (EN+ES exact keywords + natural-language opt-out),
// (3) acted on before any conversational handling.
//
//   opt-out  → global sms_suppressions + every matched party opted_out +
//              consent_events(opt_out) + one final confirmation.
//   help     → program-info reply; no state change.
//   START    → resubscribe ONLY if the number was suppressed by a prior STOP
//              (clear suppression + restore opted_in + re_opt_in). Never a cold
//              opt-in — that must go through the /c authorization page.
//
// SERVER-ONLY (service role — the sender has no session; authenticity comes from
// the X-Twilio-Signature check, which fails closed).
export const dynamic = "force-dynamic";

// Twilio request signature: Base64(HMAC-SHA1(authToken, url + sorted(key+value))).
// Web-Crypto (Worker-compatible), no Node 'crypto' import.
async function twilioSignature(
  authToken: string,
  url: string,
  params: URLSearchParams,
): Promise<string> {
  const keys = [...new Set([...params.keys()])].sort();
  const payload = url + keys.map((k) => k + params.get(k)).join("");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(mac)));
}

// TwiML reply (or an empty <Response/> for "handled, say nothing").
function twiml(message?: string): Response {
  const inner = message
    ? `<Message>${message.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</Message>`
    : "";
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`,
    { headers: { "Content-Type": "text/xml" } },
  );
}

const digitsOf = (s: string) => s.replace(/\D/g, "");

// Match a stored number against Twilio's E.164 From. Stored numbers are
// normalized loosely, so compare digits exactly OR by the last 10 (US national).
function phoneMatches(stored: string, from: string): boolean {
  const a = digitsOf(stored);
  const b = digitsOf(from);
  if (!a || !b) return false;
  return a === b || (a.length >= 10 && b.length >= 10 && a.slice(-10) === b.slice(-10));
}

export async function POST(req: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    // Fail closed: without the token we can't authenticate Twilio.
    return NextResponse.json({ ok: false, error: "unconfigured" }, { status: 503 });
  }

  const raw = await req.text();
  const params = new URLSearchParams(raw);

  // Validate against the public URL Twilio was configured with (APP_BASE_URL),
  // not req.url — the Worker may see an internal host behind the proxy.
  const base = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
  const url = `${base}/api/sms/inbound`;
  const presented = req.headers.get("x-twilio-signature") ?? "";
  const expected = await twilioSignature(authToken, url, params);
  if (presented !== expected) {
    return NextResponse.json({ ok: false, error: "bad signature" }, { status: 403 });
  }

  const from = params.get("From") ?? "";
  const body = params.get("Body") ?? "";
  if (!from) return twiml();

  const db = supabaseService();
  const cls = classifyInbound(body);

  // (1) Audit EVERY inbound + queue natural-language opt-outs for review.
  await db.from("sms_inbound").insert({
    phone_e164: from,
    body,
    matched: cls.matched,
    needs_review: cls.needsReview,
  });

  // Resolve every party this number belongs to — storytellers AND members can
  // both be A2P recipients, and one number can back parties in several families.
  const [{ data: sts }, { data: mems }] = await Promise.all([
    db.from("storytellers").select("id, family_id, language, phone").not("phone", "is", null),
    db.from("memberships").select("id, family_id, language, sms_phone").not("sms_phone", "is", null),
  ]);
  const stMatches = (sts ?? []).filter((r) => r.phone && phoneMatches(r.phone, from));
  const memMatches = (mems ?? []).filter((r) => r.sms_phone && phoneMatches(r.sms_phone, from));

  // Reply language: a clearly ES/EN keyword wins (a strong preference signal),
  // else the matched party's stored language, else English.
  const lang: Lang =
    cls.langHint ??
    ((stMatches[0]?.language ?? memMatches[0]?.language) === "es" ? "es" : "en");

  if (cls.intent === "help") {
    return twiml(t(lang, "sms_help_reply"));
  }

  if (cls.intent === "opt_out") {
    const method = cls.matched === "natural_optout" ? "natural_optout" : "sms_stop";
    // Global, per-number suppression — survives across families and future setups.
    await db
      .from("sms_suppressions")
      .upsert({ phone_e164: from, reason: method, source: "inbound" }, { onConflict: "phone_e164" });

    // Opt out every matched party + record the operative opt-out event (the raw
    // inbound is the auditable evidence of their request).
    for (const s of stMatches) {
      await db.from("storytellers").update({ consent_state: "opted_out" }).eq("id", s.id);
      await db.from("consent_events").insert({
        family_id: s.family_id,
        subject_type: "storyteller",
        subject_id: s.id,
        phone_e164: from,
        event_type: "opt_out",
        method,
        disclosure_text: body,
        language: lang,
      });
    }
    for (const m of memMatches) {
      await db.from("memberships").update({ consent_state: "opted_out" }).eq("id", m.id);
      await db.from("consent_events").insert({
        family_id: m.family_id,
        subject_type: "member",
        subject_id: m.id,
        phone_e164: from,
        event_type: "opt_out",
        method,
        disclosure_text: body,
        language: lang,
      });
    }
    // One final confirmation (permitted even in quiet hours — it's a reply).
    return twiml(t(lang, "sms_stop_confirmation"));
  }

  if (cls.intent === "resubscribe") {
    // START only means something if a prior STOP suppressed the number. If there
    // was never any consent, do NOT auto-opt-in — that must go through the /c
    // authorization page.
    const { data: supp } = await db
      .from("sms_suppressions")
      .select("phone_e164")
      .eq("phone_e164", from)
      .maybeSingle();
    if (!supp) return twiml(); // not suppressed → no cold opt-in, stay silent

    await db.from("sms_suppressions").delete().eq("phone_e164", from);
    for (const s of stMatches) {
      await db.from("storytellers").update({ consent_state: "opted_in" }).eq("id", s.id);
      await db.from("consent_events").insert({
        family_id: s.family_id,
        subject_type: "storyteller",
        subject_id: s.id,
        phone_e164: from,
        event_type: "re_opt_in",
        method: "sms_start",
        disclosure_text: body,
        language: lang,
      });
    }
    for (const m of memMatches) {
      await db.from("memberships").update({ consent_state: "opted_in" }).eq("id", m.id);
      await db.from("consent_events").insert({
        family_id: m.family_id,
        subject_type: "member",
        subject_id: m.id,
        phone_e164: from,
        event_type: "re_opt_in",
        method: "sms_start",
        disclosure_text: body,
        language: lang,
      });
    }
    return twiml(t(lang, "sms_start_welcome"));
  }

  // No keyword — conversational content isn't handled here yet. Logged above.
  return twiml();
}
