// Twilio SMS transport: storyteller nudges (localized) + admin alert texts.
// SERVER-ONLY. Per the master-architecture "multi-channel messaging" pattern,
// SMS is a channel that self-gates: FAILS SOFT when the TWILIO_* env vars are
// unset (warn + return, never throw) so a misconfigured environment never
// crashes a request flow — mirroring lib/email/emailjs.ts. A real API failure
// (creds present, Twilio rejects) throws so the caller can log it.
//
// Worker-compatible: plain fetch + Basic auth (btoa), no Node-only SDK.

// Post one SMS. `to` and the From number must be E.164 (e.g. +15551234567).
export async function sendSms(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !from) {
    console.warn(`[sms] Twilio env not configured — skipping send to ${to}`);
    return;
  }
  if (!to) {
    console.warn("[sms] no destination number — skipping send");
    return;
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: from, Body: body });

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
}
