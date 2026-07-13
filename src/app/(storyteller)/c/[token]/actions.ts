"use server";

// Storyteller authorization submit (consent-flow.md step 8). Token-gated — the
// signed 'consent' token in the form IS the authorization; there is no session.
// Records the storyteller's own first-person opt-in, then fires the step-9/10
// sends (all inside confirmStorytellerConsent).
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { confirmStorytellerConsent } from "@/lib/consent/storyteller";
import type { Lang } from "@/lib/i18n";

export async function submitConsent(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const language: Lang = formData.get("language") === "es" ? "es" : "en";
  const name = String(formData.get("name") ?? "");

  // The opt-in control must be checked — never pre-checked, never assumed.
  if (formData.get("consent") !== "on") {
    redirect(`/c/${token}?error=optin&lang=${language}`);
  }

  const h = await headers();
  const ip =
    h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = h.get("user-agent");

  const res = await confirmStorytellerConsent(token, { name, language, ip, ua });
  if (res.status === "invalid") {
    redirect(`/c/${token}?error=invalid&lang=${language}`);
  }
  redirect(`/c/${token}?done=1&lang=${res.language}`);
}
