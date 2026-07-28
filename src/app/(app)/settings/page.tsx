import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";
import { loadSettings } from "@/lib/settings";
import { loadStorytellerStats } from "@/lib/overview";
import { formatPhone } from "@/lib/phone";
import { setAlertPreference } from "./actions";
import VoiceSetup from "../storytellers/VoiceSetup";
import StorytellerGrid from "../StorytellerGrid";

// Settings (TODO 5.5). The signed-in member's own SMS number + consent state
// and their cloned-voice status. (Family access — the roster + invitations —
// moved to its own top-nav section, /family-access.) Admins edit; viewers see a
// calm read-only view. RLS is the boundary (st_write = admin); the alert
// preference is additionally scoped to the caller's own membership row in the
// action. The number itself is only ever changed at /verify-phone, so consent
// is always recaptured on the registered first-party opt-in surface.
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const active = await getActiveMembership();
  if (!active) redirect("/onboarding");

  const sp = await searchParams;
  const canManage = roleAtLeast(active.role, "admin");
  const { mySms, myVoice } = await loadSettings(active.family_id);
  const storytellerStats = await loadStorytellerStats(active.family_id);

  const smsBadge = !mySms.phone
    ? { label: "Not set up", cls: "bg-surface2 text-ink/60" }
    : mySms.consentState === "opted_in"
      ? { label: "Verified", cls: "bg-emerald-50 text-emerald-700" }
      : mySms.consentState === "opted_out"
        ? { label: "Opted out", cls: "bg-amber-50 text-amber-800" }
        : { label: "Awaiting verification", cls: "bg-amber-50 text-amber-800" };

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-7">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">My Settings</h1>
        <p className="mt-1.5 text-sm text-ink/55">People, contact details, and your voice.</p>
      </div>

      {/* Same per-storyteller summary cards as the dashboard, for a quick jump
          into any elder's hub from here too. */}
      <section className="mt-7">
        <div className="mb-3.5 flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-ink/45">Storytellers</h2>
          <Link href="/storytellers/new" className="text-sm font-semibold text-brand hover:underline">
            Add storyteller →
          </Link>
        </div>
        <StorytellerGrid stats={storytellerStats} />
      </section>

      {sp.saved === "alert" && (
        <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">Alert preference saved. 🔔</p>
      )}

      {/* My voice (voice-per-member). Record yourself once; you can then be chosen
          as any storyteller's interviewer and they'll hear the questions in your
          voice. Each member manages their own here. */}
      <section className="card mt-7 p-6">
        <h2 className="text-lg font-semibold">My voice</h2>
        <p className="text-sm text-ink/55">
          Record yourself once. When you&apos;re set as a storyteller&apos;s interviewer, they hear
          the questions in your voice (English &amp; Spanish).
        </p>
        <VoiceSetup linked={myVoice} />
      </section>

      {/* Storyteller phone numbers now live on each storyteller's page (reach
          them from the dashboard). */}

      {/* Text messages. The member's ONE consented number (migration 0016 merged
          the old separate alert_phone into it). The number and its consent are
          captured at /verify-phone — the first-party opt-in surface registered
          with the A2P campaign — so this panel reads state and links there
          rather than editing the number in place. */}
      <section className="card mt-7 p-6">
        <h2 className="text-lg font-semibold">Text messages</h2>
        <p className="text-sm text-ink/55">
          The number we use for setup steps and story reminders.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-medium">
            {mySms.phone ? formatPhone(mySms.phone) : "No number yet"}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${smsBadge.cls}`}>
            {smsBadge.label}
          </span>
          {mySms.phone && (
            <span className="text-xs text-ink/50">
              Texts in {mySms.language === "es" ? "Spanish" : "English"}
            </span>
          )}
        </div>

        {mySms.consentState === "opted_out" ? (
          // A consumer opt-out has to be reversed by the consumer on the same
          // channel. Offering an in-app "turn texts back on" button would undo a
          // STOP without their consent — exactly what carriers audit for.
          <p className="mt-4 max-w-prose rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You replied STOP, so we&apos;ve stopped texting this number. To turn texts
            back on, text <strong>START</strong> to <strong>+1 623 235 8221</strong> from
            that phone.
          </p>
        ) : (
          <Link href="/verify-phone" className="btn-ink mt-4 inline-block">
            {mySms.phone ? "Change or re-verify number" : "Add my number"}
          </Link>
        )}

        {mySms.consentState === "pending" && mySms.phone && (
          <p className="mt-3 max-w-prose text-sm text-ink/60">
            We texted you a link to confirm this number. Until you tap it, we
            won&apos;t send anything else.
          </p>
        )}

        {/* Failure alerts are now a preference on the consented number, not a
            second number with its own consent. Still gated at send time. */}
        {canManage ? (
          <form action={setAlertPreference} className="mt-5 border-t border-line pt-4">
            <label className="flex max-w-prose items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                name="alert_on_failure"
                defaultChecked={mySms.alertOnFailure}
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <span className="text-ink/80">
                Text me if a recording session fails to connect.
              </span>
            </label>
            <button type="submit" className="btn-ink mt-3">
              Save preference
            </button>
            {mySms.consentState !== "opted_in" && (
              <p className="mt-2 max-w-prose text-xs text-ink/50">
                Alerts start once your number is verified above.
              </p>
            )}
          </form>
        ) : (
          <p className="mt-4 border-t border-line pt-4 text-sm text-ink/60">
            Only admins receive failure alerts.
          </p>
        )}
      </section>

    </main>
  );
}
