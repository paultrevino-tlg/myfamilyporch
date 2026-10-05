"use server";

// Magic-link request (TODO 9.0). Login never creates accounts — pay first,
// account second (SPEC § Marketing, signup & billing). The ONE exception is an
// invited family member: if this email has a pending, unexpired invitation, we
// create their account here (service role) so the link can sign them in.
//
// The reply is the same whether or not the account exists, so the page can't be
// used to find out who has signed up.
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { ensureUser, normalizeEmail } from "@/lib/billing/provision";

export type MagicLinkResult = { ok: true } | { ok: false; error: string };

export async function requestMagicLink(
  rawEmail: string,
  rawNext: string | null,
): Promise<MagicLinkResult> {
  const email = normalizeEmail(rawEmail ?? "");
  if (!email) return { ok: false, error: "Please enter a valid email address." };

  // Carry a safe relative ?next through the link (e.g. /invite/<token>).
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const callback = `${proto}://${host}/auth/callback${
    next ? `?next=${encodeURIComponent(next)}` : ""
  }`;

  try {
    const { data: invite } = await supabaseService()
      .from("invitations")
      .select("id")
      // Exact match: createInvitation stores emails lowercased (and ilike would
      // treat "_" / "%" in an address as wildcards).
      .eq("email", email)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();
    if (invite) await ensureUser(email);
  } catch (e) {
    // Fall through: if the account already exists the link still works.
    console.error("[login] invitee account check failed", e);
  }

  // PKCE: the code verifier lands in this browser's cookies via the SSR client,
  // so the emailed link must be opened on the same device (as before).
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: callback },
  });
  if (!error) return { ok: true };

  // No account (sign-ups are closed) → same answer as success. Anything else
  // (rate limit, outage) is worth telling them about.
  const noAccount =
    error.code === "otp_disabled" ||
    error.code === "signup_disabled" ||
    error.code === "user_not_found" ||
    /signups not allowed/i.test(error.message);
  if (noAccount) return { ok: true };

  console.error("[login] signInWithOtp failed", error.code, error.message);
  return {
    ok: false,
    error:
      error.status === 429
        ? "Too many attempts — please wait a minute and try again."
        : "We couldn't send the link just now. Please try again.",
  };
}
