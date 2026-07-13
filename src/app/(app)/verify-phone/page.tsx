import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { startVerification } from "./actions";

// Member phone verification (consent-flow.md steps 1-2). The signed-in family
// member enters their OWN mobile number and opts in; we text a possession link
// to that number. Session-gated by the (app) layout. The confirm half lives at
// /verify/[token] (token-gated, tappable on the phone with no session).
export default async function VerifyPhonePage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const active = await getActiveMembership();
  if (!active) redirect("/onboarding");
  const sp = await searchParams;

  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const { data: mem } = await sb
    .from("memberships")
    .select("sms_phone, consent_state, language")
    .eq("family_id", active.family_id)
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  const optedIn = mem?.consent_state === "opted_in";

  // "Check your phone" state after a link was sent.
  if (sp.sent === "1") {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center p-6">
        <div className="card p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-3xl">
            📲
          </div>
          <h1 className="mt-4 font-serif text-2xl font-semibold">Check your phone</h1>
          <p className="mt-3 text-ink/65">
            We texted a verification link to{" "}
            <strong className="text-ink">{mem?.sms_phone ?? "your number"}</strong>. Tap it to
            finish turning on text reminders.
          </p>
          <p className="mt-4 text-sm text-ink/55">
            Didn&apos;t get it?{" "}
            <Link href="/verify-phone" className="text-accent underline">
              Try a different number
            </Link>
            .
          </p>
          <Link href="/dashboard" className="btn-ghost mt-6 inline-block">
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center p-6">
      <div className="card p-8">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-3xl">
          📱
        </div>
        <h1 className="mt-4 font-serif text-2xl font-semibold">
          {optedIn ? "Update your number" : "Turn on text reminders"}
        </h1>
        <p className="mt-2 text-ink/65">
          {optedIn
            ? "Your number is verified. You can update it below — we'll text a new verification link."
            : "We'll text you a link to verify your number, then use it to help you set up your storyteller and let you know when their stories come in."}
        </p>

        {sp.error === "phone" && (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            That doesn&apos;t look like a mobile number. Please enter all the digits, e.g.
            +1 602 555 4471.
          </p>
        )}
        {sp.error === "consent" && (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Please check the box to agree to receive texts before we can send the link.
          </p>
        )}
        {sp.error === "no-secret" && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            Something went wrong on our end. Please try again shortly.
          </p>
        )}

        <form action={startVerification} className="mt-6 space-y-4">
          <label className="flex flex-col text-sm">
            <span className="text-ink/60">Your mobile number</span>
            <input
              type="tel"
              name="phone"
              inputMode="tel"
              autoComplete="tel"
              required
              defaultValue={mem?.sms_phone ?? ""}
              placeholder="+1 602 555 4471"
              className="input mt-1"
            />
          </label>

          <label className="flex flex-col text-sm">
            <span className="text-ink/60">Language for your texts</span>
            <select
              name="language"
              defaultValue={mem?.language === "es" ? "es" : "en"}
              className="input mt-1"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-line bg-surface2/40 p-4 text-sm">
            <input type="checkbox" name="consent" className="mt-1 h-4 w-4 shrink-0" />
            <span className="text-ink/80">{t("en", "member_optin_disclosure")}</span>
          </label>

          <button type="submit" className="btn-primary w-full py-3">
            Text me the link
          </button>
        </form>

        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm text-ink/55 hover:text-ink"
        >
          Skip for now
        </Link>
      </div>
    </main>
  );
}
