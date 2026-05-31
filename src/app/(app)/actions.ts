"use server";

// Server actions for family membership management (TODO 1.3):
// switch the active family, invite a member, and accept an invitation.
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import {
  ACTIVE_FAMILY_COOKIE,
  getActiveMembership,
  getFamilies,
  roleAtLeast,
} from "@/lib/auth";
import { sendEmail } from "@/lib/email/emailjs";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

// Focus the dashboard on a different family. UX only — RLS still gates rows.
export async function switchFamily(formData: FormData) {
  const familyId = String(formData.get("family_id") ?? "");
  const families = await getFamilies();
  if (!families.some((f) => f.family_id === familyId)) return; // not a member → ignore
  (await cookies()).set(ACTIVE_FAMILY_COOKIE, familyId, COOKIE_OPTS);
  redirect("/dashboard");
}

// Invite someone to the active family. Owner/admin only; RLS enforces the same.
export async function createInvitation(formData: FormData) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) return;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "viewer");
  if (!email || (role !== "admin" && role !== "viewer")) return;

  const sb = await supabaseServer();
  const token = crypto.randomUUID();
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await sb
    .from("invitations")
    .insert({ family_id: active.family_id, email, role, token, expires_at });
  if (error) throw error;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const url = `${proto}://${host}/invite/${token}`;

  await sendEmail({
    to_email: email,
    subject: `You're invited to ${active.name} on My Family Porch`,
    headline: `Join ${active.name}`,
    message_html: `You've been invited to help with <strong>${active.name}</strong> on My Family Porch as a ${role}. Open the link below to accept — sign in with this email address (${email}).`,
    button_label: "Accept invitation",
    button_url: url,
    footnote: "This invitation expires in 7 days. If you weren't expecting it, you can ignore this email.",
  });

  redirect("/dashboard");
}

// Friendly text for the exceptions raised by the accept_invitation RPC.
function friendly(raw: string): string {
  if (raw.includes("email_mismatch"))
    return "This invitation is for a different email address. Sign in with the address it was sent to.";
  if (raw.includes("invitation_expired")) return "This invitation has expired.";
  if (raw.includes("invitation_already_used")) return "This invitation has already been used.";
  if (raw.includes("invalid_invitation")) return "This invitation link is not valid.";
  return "We couldn't accept this invitation. Please ask for a new one.";
}

// Redeem an invitation token via the security-definer RPC, then focus the new family.
export async function acceptInvitation(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const sb = await supabaseServer();
  const { data, error } = await sb.rpc("accept_invitation", { p_token: token });
  if (error) redirect(`/invite/${token}?error=${encodeURIComponent(friendly(error.message))}`);
  (await cookies()).set(ACTIVE_FAMILY_COOKIE, String(data), COOKIE_OPTS);
  redirect("/dashboard");
}
