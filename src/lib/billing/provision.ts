// Account provisioning (TODO 9.0). SERVER-ONLY — service role.
//
// Pay first, account second (SPEC § Marketing, signup & billing): nobody creates
// their own account or family. This module is the one place that does, so the
// operator script (today) and the Stripe webhook (9.3) create families the same
// way. Both entry points are idempotent: re-running for the same email returns
// the existing user and the family they already own.
import { supabaseService } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/email/send";
import { escapeHtml } from "@/lib/email/render";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  return EMAIL_RE.test(email) ? email : null;
}

// The auth user for this email, created (already confirmed — the magic link is
// their proof of inbox from here on) if it doesn't exist yet.
export async function ensureUser(
  email: string,
  ownerName?: string,
): Promise<{ userId: string; created: boolean }> {
  const svc = supabaseService();
  const { data: existing, error: lookupErr } = await svc.rpc("user_id_by_email", {
    p_email: email,
  });
  if (lookupErr) throw lookupErr;
  if (existing) return { userId: existing, created: false };

  const name = ownerName?.trim();
  const { data, error } = await svc.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: name ? { full_name: name } : undefined,
  });
  if (error || !data.user) throw error ?? new Error("createUser returned no user");
  return { userId: data.user.id, created: true };
}

// Create (or find) the owner's account and their family. Returns the family id.
export async function provisionFamily(args: {
  email: string;
  familyName: string;
  ownerName?: string;
}): Promise<{ familyId: string; userId: string; userCreated: boolean }> {
  const email = normalizeEmail(args.email);
  if (!email) throw new Error(`provisionFamily: invalid email "${args.email}"`);
  const familyName = args.familyName.trim();
  if (!familyName) throw new Error("provisionFamily: family name is required");

  const { userId, created } = await ensureUser(email, args.ownerName);
  const { data: familyId, error } = await supabaseService().rpc("provision_family", {
    p_user: userId,
    p_name: familyName,
  });
  if (error || !familyId) throw error ?? new Error("provision_family returned no id");
  return { familyId, userId, userCreated: created };
}

// Welcome email: their family is ready; sign in with this email (magic link).
// A link to /login rather than a pre-minted magic link — PKCE needs the code
// verifier in the browser that asked, so the sign-in must start there.
export async function sendWelcomeEmail(args: {
  email: string;
  familyName: string;
  baseUrl: string;
}): Promise<void> {
  const login = new URL("/login", args.baseUrl);
  login.searchParams.set("email", args.email);
  await sendEmail({
    to_email: args.email,
    subject: "Your family's porch is ready",
    headline: `Welcome to ${args.familyName}`,
    message_html: `Your family space on My Family Porch is ready, and you're its owner. Sign in with this email address (${escapeHtml(args.email)}) — we'll send you a one-tap sign-in link, no password needed.`,
    button_label: "Sign in",
    button_url: login.toString(),
    footnote: "If you weren't expecting this, you can ignore this email.",
  });
}
