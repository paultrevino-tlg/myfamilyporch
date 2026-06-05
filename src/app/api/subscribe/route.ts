import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/email/emailjs";

// Email capture for not-ready visitors (Phase 8.8, brief §7). The marketing
// EmailCapture island POSTs here. We validate server-side (the client's HTML5
// checks are a courtesy, not the boundary), drop honeypot hits silently, log the
// lead so it's captured in Worker logs regardless of email config, and send a
// best-effort notification to the team via the existing EmailJS helper
// (fail-soft: a misconfigured/unset EmailJS env warns and returns, so the
// visitor still sees success). No DB row — a lead is pre-account and carries no
// family_id, so it does not belong in the RLS-scoped schema.
//
// TODO(8.x/marketing): connect to a real mailing-list provider (ConvertKit /
// Mailchimp / Resend Audiences) for list management + unsubscribe. None is
// configured yet; until then leads arrive as a notification email + Worker log.

const LeadSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(100),
  email: z.string().trim().email("Please enter a valid email address."),
  // Honeypot — must be absent/empty for a real human.
  website: z.string().optional(),
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = LeadSchema.safeParse(raw);
  if (!parsed.success) {
    const error =
      parsed.error.issues[0]?.message ?? "Please check your details.";
    return NextResponse.json({ error }, { status: 400 });
  }

  const { name, email, website } = parsed.data;

  // Honeypot tripped: pretend success, do nothing (don't tip off bots).
  if (website && website.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  // Captured in Worker logs regardless of email-provider config.
  console.log(`[subscribe] lead: ${name} <${email}>`);

  // Best-effort team notification. Destination is configurable; falls back to
  // the support address used on /contact so nothing breaks if it's unset.
  const notify = process.env.LEAD_NOTIFY_EMAIL || "support@myfamilyporch.net";
  try {
    await sendEmail({
      to_email: notify,
      subject: "New porch lead",
      headline: "Someone wants to stay in touch",
      message_html: `<p><strong>${escapeHtml(name)}</strong> asked to be kept posted about My Family Porch.</p><p>Email: <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>`,
      footnote: "Sent from the marketing site email-capture form.",
    });
  } catch (err) {
    // A delivery failure must not fail the visitor — they're on the form.
    console.error("[subscribe] notification email failed", err);
  }

  return NextResponse.json({ ok: true });
}
