import { redirect } from "next/navigation";
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

      {/* Storyteller phone numbers + cloned voice now live on each storyteller's
          page (reach them from the dashboard). */}

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

      {/* Family who can listen. Roster + invitations + invite form. */}
      <section className="card mt-7 p-6">
        <h2 className="text-lg font-semibold">Family who can listen</h2>
        <p className="text-sm text-ink/55">
          Viewers can hear and read stories; admins can also steer and invite.
        </p>

        <ul className="mt-4 space-y-2">
          {roster.map((m) => (
            <li
              key={m.userId}
              className="flex items-center justify-between rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-sm"
            >
              <span className="font-medium">
                {m.email ?? "Family member"}
                {m.isYou && <span className="font-normal text-ink/50"> · you</span>}
              </span>
              <span className="chip bg-brand/10 capitalize text-brand">{m.role}</span>
            </li>
          ))}
        </ul>

        {invitations.length > 0 && (
          <>
            <h3 className="mt-5 text-sm font-semibold text-ink/70">Invitations</h3>
            <ul className="mt-2 space-y-2">
              {invitations.map((inv, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-sm"
                >
                  <span className="font-medium">
                    {inv.email} <span className="font-normal text-ink/50">· {inv.role}</span>
                  </span>
                  <span className="chip bg-amber-100 text-amber-700">{inv.status}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {canManage && (
          <form action={createInvitation} className="mt-5 flex flex-wrap items-end gap-3 border-t border-line pt-5">
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
            <button type="submit" className="btn-primary">
              Send invite
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
