import { redirect } from "next/navigation";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";
import { loadSettings } from "@/lib/settings";
import { createInvitation } from "../actions";

// Family Access (TODO 5.5). Who can listen: the roster, pending invitations, and
// the invite-by-email form. Admins edit; viewers see a calm read-only view. RLS
// is the boundary (mem_write / inv_write = admin). Moved out of Settings into
// its own top-nav section so families can find it directly.
export default async function FamilyAccessPage() {
  const active = await getActiveMembership();
  if (!active) redirect("/onboarding");

  const canManage = roleAtLeast(active.role, "admin");
  const { roster, invitations } = await loadSettings(active.family_id);

  const inputCls = "mt-1 input";

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-7">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Family access</h1>
        <p className="mt-1.5 text-sm text-ink/55">Who can hear and read {active.name}&apos;s stories.</p>
      </div>

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
              className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-sm"
            >
              <span className="min-w-0">
                <span className="font-medium">{m.email ?? m.name}</span>
                {m.isYou && <span className="font-normal text-ink/50"> · you</span>}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {m.hasVoice && (
                  <span className="chip bg-emerald-100 text-emerald-700" title="Has a cloned voice">
                    🎙 voice
                  </span>
                )}
                <span className="chip bg-brand/10 capitalize text-brand">{m.role}</span>
              </span>
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
