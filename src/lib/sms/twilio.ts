// Twilio SMS transport: storyteller nudges (localized) + admin alert texts.
// SERVER-ONLY. Per the master-architecture "multi-channel messaging" pattern,
// SMS is a channel that self-gates: FAILS SOFT when the TWILIO_* env vars are
// unset (warn + return, never throw) so a misconfigured environment never
// crashes a request flow — mirroring lib/email/send.ts. A real API failure
// (creds present, Twilio rejects) throws so the caller can log it.
//
// Worker-compatible: plain fetch + Basic auth (btoa), no Node-only SDK.
import { isE164 } from "@/lib/phone";

// Post one SMS. `to` and the From number must be E.164 (e.g. +15551234567);
// a non-E.164 destination is refused here rather than sent. Returns Twilio's
// message SID (null when the send was skipped). `statusCallback` asks Twilio to
// report delivery to that URL (api/sms/status) — used for sends we track.
export async function sendSms(
  to: string,
  body: string,
  opts: { statusCallback?: string } = {},
): Promise<string | null> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !from) {
    console.warn(`[sms] Twilio env not configured — skipping send to ${to}`);
    return null;
  }
  if (!to) {
    console.warn("[sms] no destination number — skipping send");
    return null;
  }
  // Twilio requires E.164. Callers normalize on the way in (lib/phone), so a
  // non-E.164 number here means a bad row or a missed code path — skip rather
  // than burn a request on a send Twilio will reject (21211).
  if (!isE164(to)) {
    console.warn("[sms] destination is not E.164 — skipping send");
    return null;
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: from, Body: body });
  // Only a public https URL — a relative/local one (APP_BASE_URL unset, local
  // dev) could make Twilio reject the whole send just to lose a callback.
  if (opts.statusCallback?.startsWith("https://")) {
    params.set("StatusCallback", opts.statusCallback);
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  // Missing config fails soft (above); an actual send failure with creds present
  // is a real error — surface it so the caller can decide whether to swallow it.
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Twilio send failed (${res.status}): ${detail}`);
  }
  const data = (await res.json().catch(() => null)) as { sid?: string } | null;
  return data?.sid ?? null;
}
