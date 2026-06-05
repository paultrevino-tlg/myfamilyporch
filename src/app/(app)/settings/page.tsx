import { redirect } from "next/navigation";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";
import { loadSettings } from "@/lib/settings";
import { setAlertPhone } from "./actions";
import VoiceSetup from "../storytellers/VoiceSetup";

// Settings (TODO 5.5). The signed-in admin's own alert number and their
// cloned-voice status. (Family access — the roster + invitations — moved to its
// own top-nav section, /family-access.) Admins edit; viewers see a calm
// read-only view. RLS is the boundary (st_write = admin); the alert number is
// additionally scoped to the caller's own membership row in the action.
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const active = await getActiveMembership();
  if (!active) redirect("/onboarding");

  const sp = await searchParams;
  const canManage = roleAtLeast(active.role, "admin");
  const { myAlertPhone, myVoice } = await loadSettings(active.family_id);

  const inputCls = "mt-1 input";

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-7">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1.5 text-sm text-ink/55">People, contact details, and your voice.</p>
      </div>

      {sp.saved === "alert" && (
        <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">Alert number saved. 🔔</p>
      )}
      {sp.error === "alert" && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          That doesn&apos;t look like a phone number. Use the full number, e.g. +1 602 555 4471.
        </p>
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

      {/* Alert me by text. The signed-in admin's OWN number. */}
      <section className="card mt-7 p-6">
        <h2 className="text-lg font-semibold">Alert me by text</h2>
        <p className="text-sm text-ink/55">
          If a session fails to connect, we&apos;ll text you at this number.
        </p>

        {canManage ? (
          <form action={setAlertPhone} className="mt-4 flex flex-wrap items-end gap-2">
            <label className="flex flex-col text-sm">
              <span className="text-ink/60">Your phone</span>
              <input
                type="tel"
                name="phone"
                defaultValue={myAlertPhone ?? ""}
                placeholder="+1 480 555 2208"
                className={inputCls}
              />
            </label>
            <button type="submit" className="btn-ink">
              Save
            </button>
            <span className="pb-2 text-xs text-ink/50">Leave blank to turn alerts off.</span>
          </form>
        ) : (
          <p className="mt-3 text-sm text-ink/60">
            Only admins receive failure alerts.
          </p>
        )}
      </section>

    </main>
  );
}
