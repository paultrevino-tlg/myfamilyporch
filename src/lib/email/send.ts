// Shared transactional email sender → Resend. SERVER-ONLY (uses the Resend API
// key). Per the master-architecture "one provider: Resend", ALL email — in-app
// transactional and background/worker — goes through this one helper, and the
// body is rendered in code by `renderEmail` (Resend has no hosted template).
//
// Plain `fetch`, no Resend SDK, so it runs on the Cloudflare Workers runtime.
//
// FAILS SOFT — if the API key is unset it warns and returns instead of
// throwing, so a misconfigured environment never crashes a flow. A real send
// failure with the key present throws, so callers (e.g. the auth hook) can
// return non-2xx.
import { renderEmail, renderEmailText, type EmailParams } from "./render";

export type { EmailParams };

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Must be on the Resend-verified domain (myfamilyporch.net) or the send is
// rejected outright. Overridable from the Cloudflare dashboard without a deploy.
const DEFAULT_FROM = "My Family Porch <info@myfamilyporch.net>";

export async function sendEmail(params: EmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY not configured — skipping send to ${params.to_email}`,
    );
    return;
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
      to: [params.to_email],
      subject: params.subject,
      html: renderEmail(params),
      text: renderEmailText(params),
    }),
  });

  // A 200 means ACCEPTED FOR SENDING, not delivered — deliverability still
  // rests on the domain's SPF/DKIM/DMARC, not on this status code.
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend send failed (${res.status}): ${detail}`);
  }
}
