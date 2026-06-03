import { redirect } from "next/navigation";
import Link from "next/link";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";
import { loadSettings } from "@/lib/settings";
import { setAlertPhone } from "./actions";
import { createInvitation } from "../actions";

// Settings (TODO 5.5). The prototype's four fields: storyteller phone numbers,
// the signed-in admin's own alert number, cloned-voice status, and family
// access. Admins edit; viewers see a calm read-only view. RLS is the boundary
// (st_write / mem_write / inv_write = admin); the alert number is additionally
// scoped to the caller's own membership row in the action.
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const active = await getActiveMembership();
  if (!active) redirect("/onboarding");

  const sp = await searchParams;
  const canManage = roleAtLeast(active.role, "admin");
  const { myAlertPhone, roster, invitations } = await loadSettings(active.family_id);

  const inputCls = "mt-1 rounded-lg border px-3 py-2 text-base";

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl">Settings</h1>
          <p className="mt-1 text-sm text-ink/60">People, contact details, and your voice.</p>
        </div>
        <Link href="/dashboard" className="text-sm text-ink/60 underline">
          Back to overview
        </Link>
      </div>

      {sp.saved === "alert" && (
        <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">Alert number saved. 🔔</p>
      )}
      {sp.error === "alert" && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          That doesn&apos;t look like a phone number. Use the full number, e.g. +1 602 555 4471.
        </p>
      )}

      {/* Storyteller phone numbers + cloned voice now live on each storyteller's
          page (reach them from the dashboard). */}

      {/* Alert me by text. The signed-in admin's OWN number. */}
      <section className="mt-8 rounded-2xl border bg-white/40 p-5">
        <h2 className="font-medium text-lg">Alert me by text</h2>
        <p className="text-sm text-ink/60">
          If a session fails to connect, we&apos;ll text you at this number.
        </p>

        {canManage ? (
          <form action={setAlertPhone} className="mt-4 flex items-end gap-2">
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
            <button type="submit" className="rounded-lg bg-ink px-4 py-2 font-medium text-white">
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

      {/* Family who can listen. Roster + invitations + invite form. */}
      <section className="mt-8 rounded-2xl border bg-white/40 p-5">
        <h2 className="font-medium text-lg">Family who can listen</h2>
        <p className="text-sm text-ink/60">
          Viewers can hear and read stories; admins can also steer and invite.
        </p>

        <ul className="mt-4 space-y-2">
          {roster.map((m) => (
            <li
              key={m.userId}
              className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
            >
              <span>
                {m.email ?? "Family member"}
                {m.isYou && <span className="text-ink/50"> · you</span>}
              </span>
              <span className="text-ink/60 capitalize">{m.role}</span>
            </li>
          ))}
        </ul>

        {invitations.length > 0 && (
          <>
            <h3 className="mt-5 font-medium text-sm text-ink/70">Invitations</h3>
            <ul className="mt-2 space-y-2">
              {invitations.map((inv, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span>
                    {inv.email} <span className="text-ink/50">· {inv.role}</span>
                  </span>
                  <span className="text-ink/60">{inv.status}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {canManage && (
          <form action={createInvitation} className="mt-5 flex flex-wrap items-end gap-3 border-t pt-5">
            <label className="flex flex-col text-sm">
              <span className="text-ink/60">Invite by email</span>
              <input
                type="email"
                name="email"
                required
                placeholder="relative@example.com"
                className={inputCls}
              />
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-ink/60">Role</span>
              <select name="role" defaultValue="viewer" className={inputCls}>
                <option value="viewer">Viewer — can listen &amp; read</option>
                <option value="admin">Admin — can steer &amp; invite</option>
              </select>
            </label>
            <button type="submit" className="rounded-lg bg-ink px-4 py-2 font-medium text-white">
              Send invite
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
