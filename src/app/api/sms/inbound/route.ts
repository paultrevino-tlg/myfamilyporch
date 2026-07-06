import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";
import { t, type Lang } from "@/lib/i18n";

// Twilio inbound-SMS webhook (A2P 10DLC double opt-in, TODO 4.3). Set as the
// phone number's "A message comes in" URL in the Twilio console. Records the
// storyteller's own consent decision:
//   YES / START / UNSTOP / SÍ → sms_consent = 'confirmed' (reminders may send)
//   STOP / CANCEL / END / QUIT / UNSUBSCRIBE / STOPALL → 'stopped'
//   HELP / AYUDA → program info reply (Twilio only auto-answers HELP on
//   Messaging Services, so we answer it here)
// Twilio itself still enforces the carrier-level STOP block and auto-reply; we
// mirror the state so the nudge path never even tries. SERVER-ONLY (service
// role — the sender has no session; authenticity comes from the
// X-Twilio-Signature check, which fails closed).
export const dynamic = "force-dynamic";

const CONFIRM_WORDS = new Set(["YES", "Y", "START", "UNSTOP", "SI", "SÍ"]);
const STOP_WORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
const HELP_WORDS = new Set(["HELP", "AYUDA", "INFO"]);

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

// Match a stored storyteller phone against Twilio's E.164 From. Stored numbers
// are normalized loosely ("+" optional, country code optional — see
// normalizePhone in settings/actions.ts), so compare digits exactly OR by the
// last 10 digits (US national number).
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
  const body = (params.get("Body") ?? "").trim().toUpperCase();
  if (!from || !body) return twiml();

  const word = body.split(/\s+/)[0];
  const isConfirm = CONFIRM_WORDS.has(word);
  const isStop = STOP_WORDS.has(word);
  const isHelp = HELP_WORDS.has(word);
  if (!isConfirm && !isStop && !isHelp) return twiml(); // not a keyword — ignore

  // One phone can back storytellers in more than one family (the same elder
  // added by two branches of the family) — apply the decision to every match.
  const db = supabaseService();
  const { data: rows } = await db
    .from("storytellers")
    .select("id, language, phone")
    .not("phone", "is", null);
  const matches = (rows ?? []).filter((r) => r.phone && phoneMatches(r.phone, from));
  const lang: Lang = matches[0]?.language === "es" ? "es" : "en";

  if (isHelp) return twiml(t(lang, "sms_help_reply"));
  if (matches.length === 0) return twiml(); // unknown number — nothing to record

  const consent = isStop ? "stopped" : "confirmed";
  await db
    .from("storytellers")
    .update({ sms_consent: consent })
    .in(
      "id",
      matches.map((r) => r.id),
    );

  // STOP: stay silent — Twilio already sends the mandated opt-out auto-reply
  // (and blocks anything we'd send). YES: confirm, as CTIA requires.
  return isStop ? twiml() : twiml(t(lang, "sms_confirmed_reply"));
}
