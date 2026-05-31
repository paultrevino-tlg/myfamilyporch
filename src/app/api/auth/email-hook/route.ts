import { NextRequest, NextResponse } from "next/server";
import { verifyStandardWebhook } from "@/lib/webhooks/standard-webhooks";
import { sendEmail } from "@/lib/email/emailjs";

// Supabase Auth "Send Email" hook. Supabase itself sends NO mail — it POSTs a
// signed Standard Webhooks payload here, and we render + send via EmailJS so
// branding/copy live in one place. We verify the signature first, then build
// the provider's /auth/v1/verify confirmation URL and email it.

type EmailHookPayload = {
  user: { email: string };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
};

// General copy per action type; the EmailJS template stays generic.
const COPY: Record<string, { subject: string; headline: string; button: string }> = {
  magiclink:    { subject: "Sign in to My Family Porch",        headline: "Your sign-in link",        button: "Sign in" },
  signup:       { subject: "Confirm your email",                headline: "Confirm your email",        button: "Confirm email" },
  invite:       { subject: "You're invited to My Family Porch", headline: "You've been invited",       button: "Accept invitation" },
  recovery:     { subject: "Reset your password",               headline: "Reset your password",       button: "Reset password" },
  email_change: { subject: "Confirm your new email",            headline: "Confirm your new email",    button: "Confirm email" },
};

export async function POST(req: NextRequest) {
  const secret = process.env.SUPABASE_AUTH_HOOK_SECRET;
  if (!secret) {
    console.error("[email-hook] SUPABASE_AUTH_HOOK_SECRET is not set");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const body = await req.text();
  const verified = await verifyStandardWebhook(
    body,
    {
      id: req.headers.get("webhook-id"),
      timestamp: req.headers.get("webhook-timestamp"),
      signature: req.headers.get("webhook-signature"),
    },
    secret,
  );
  if (!verified) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body) as EmailHookPayload;
  const { token_hash, redirect_to, email_action_type } = payload.email_data;
  const email = payload.user.email;

  // Supabase verifies the token at its own endpoint, then redirects to our app.
  const verifyUrl =
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify` +
    `?token=${encodeURIComponent(token_hash)}` +
    `&type=${encodeURIComponent(email_action_type)}` +
    `&redirect_to=${encodeURIComponent(redirect_to)}`;

  const copy =
    COPY[email_action_type] ??
    { subject: "My Family Porch", headline: "Confirm your request", button: "Continue" };

  try {
    await sendEmail({
      to_email: email,
      subject: copy.subject,
      headline: copy.headline,
      message_html:
        "Tap the button below to continue. This link expires shortly and can only be used once.",
      button_label: copy.button,
      button_url: verifyUrl,
      footnote: "If you didn't request this, you can safely ignore this email.",
    });
  } catch (err) {
    console.error("[email-hook] send failed", err);
    return NextResponse.json({ error: "send failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
