"use server";

// Member phone-verification action (consent-flow.md steps 1-2). The signed-in
// member enters THEIR OWN number + opts in; we text them a possession link.
// This is first-party consent — the member acting on their own membership row.
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { startMemberVerification } from "@/lib/consent/member";
import type { Lang } from "@/lib/i18n";

export async function startVerification(formData: FormData) {
  const active = await getActiveMembership();
  if (!active) redirect("/onboarding");

  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  // The caller's own membership row in the active family (RLS-scoped read).
  const { data: mem } = await sb
    .from("memberships")
    .select("id")
    .eq("family_id", active.family_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!mem) redirect("/onboarding");

  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!phone.ok || !phone.value) redirect("/verify-phone?error=phone");

  if (formData.get("consent") !== "on") redirect("/verify-phone?error=consent");

  const language: Lang = formData.get("language") === "es" ? "es" : "en";

  const result = await startMemberVerification(
    mem.id,
    active.family_id,
    phone.value,
    language,
  );
  if (result.status === "error") {
    redirect(`/verify-phone?error=${result.reason}`);
  }

  redirect("/verify-phone?sent=1");
}
