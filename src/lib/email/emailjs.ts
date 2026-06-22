// Shared transactional email sender → EmailJS. ONE reusable template, kept as
// general as possible and parameterized by template_params. SERVER-ONLY (uses
// the EmailJS private key). Per the master-architecture "two-provider split":
// EmailJS for in-app transactional mail; Resend stays reserved for bulk/worker
// jobs (Phase 8). FAILS SOFT — if env vars are unset it warns and returns
// instead of throwing, so a misconfigured environment never crashes a flow.
const EMAILJS_ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";

export type EmailParams = {
  to_email: string;
  subject: string;
  headline: string;
  message_html: string;
  button_label?: string;
  button_url?: string;
  footnote?: string;
};

export async function sendEmail(params: EmailParams): Promise<void> {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    console.warn(
      `[email] EmailJS env not configured — skipping send to ${params.to_email}`,
    );
    return;
  }

  const res = await fetch(EMAILJS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      accessToken: privateKey,
      template_params: {
        to_email: params.to_email,
        subject: params.subject,
        headline: params.headline,
        message_html: params.message_html,
        button_label: params.button_label ?? "",
        button_url: params.button_url ?? "",
        footnote: params.footnote ?? "",
        // EmailJS's Mustache only treats booleans/arrays as truthy for sections
        // ({{#has_button}}); a non-empty string is NOT enough to render one. So
        // gate the optional button/footnote blocks on explicit booleans.
        has_button: Boolean(params.button_url),
        has_footnote: Boolean(params.footnote),
      },
    }),
  });

  // Missing config fails soft (above); an actual send failure is a real error —
  // surface it so the caller (e.g. the auth hook) can return non-2xx.
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`EmailJS send failed (${res.status}): ${detail}`);
  }
}
