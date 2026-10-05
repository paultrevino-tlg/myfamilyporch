import { redirect } from "next/navigation";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";
import { loadSettings } from "@/lib/settings";
import {
  cancelInvitation,
  createInvitation,
  removeMember,
  setStorytellerAccess,
} from "../actions";

// Family Access (TODO 5.5). Who can listen: the roster, pending invitations, and
// the invite-by-email form. Admins edit; viewers see a calm read-only view. RLS
// is the boundary (mem_write / inv_write / sa_write = admin). Moved out of
// Settings into its own top-nav section so families can find it directly.
// 5.8: each viewer sees only the storytellers shared with them — picked on the
// invite and changeable per viewer here. Owners/admins always see everyone.
export default async function FamilyAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const active = await getActiveMembership();
  if (!active) redirect("/onboarding");

  const canManage = roleAtLeast(active.role, "admin");
  const { roster, invitations, storytellers } = await loadSettings(active.family_id);
  const { saved } = await searchParams;
  const nameOf = new Map(storytellers.map((s) => [s.id, s.name]));
  const names = (ids: string[]) =>
    ids.map((id) => nameOf.get(id)).filter(Boolean).join(", ");

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
          Viewers can hear and read the storytellers shared with them; admins see
          everyone and can also steer and invite.
        </p>
        {saved === "access" && (
          <p className="mt-3 rounded-xl bg-emerald-50 px-3.5 py-2 text-sm text-emerald-800">
            Saved — their storytellers are updated.
          </p>
        )}

        <ul className="mt-4 space-y-2">
          {roster.map((m) => (
            <li
              key={m.userId}
              className="rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0">
                  <span className="font-medium">{m.email ?? m.name}</span>
                  {m.isYou && <span className="font-normal text-ink/50"> · you</span>}
                  <span className="block text-xs text-ink/55">
                    {m.role !== "viewer"
                      ? "Sees all storytellers"
                      : m.canSee.length
                        ? `Sees ${names(m.canSee)}`
                        : "No storytellers shared yet"}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {m.hasVoice && (
                    <span className="chip bg-emerald-100 text-emerald-700" title="Has a cloned voice">
                      🎙 voice
                    </span>
                  )}
                  <span className="chip bg-brand/10 capitalize text-brand">{m.role}</span>
                  {canManage && m.role !== "owner" && !m.isYou && (
                    <form action={removeMember}>
                      <input type="hidden" name="user_id" value={m.userId} />
                      <button
                        type="submit"
                        className="text-xs font-medium text-red-600 hover:underline"
                        title={`Remove ${m.email ?? m.name}`}
                      >
                        Remove
                      </button>
                    </form>
                  )}
                </span>
              </div>
              {canManage && m.role === "viewer" && storytellers.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-brand">
                    Change who they can see
                  </summary>
                  <form action={setStorytellerAccess} className="mt-2 space-y-2">
                    <input type="hidden" name="user_id" value={m.userId} />
                    <StorytellerChecks
                      storytellers={storytellers}
                      checked={new Set(m.canSee)}
                    />
                    <button type="submit" className="btn-primary">
                      Save
                    </button>
                  </form>
                </details>
              )}
            </li>
          ))}
        </ul>

        {invitations.length > 0 && (
          <>
            <h3 className="mt-5 text-sm font-semibold text-ink/70">Invitations</h3>
            <ul className="mt-2 space-y-2">
              {invitations.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-sm"
                >
                  <span className="min-w-0 font-medium">
                    {inv.email} <span className="font-normal text-ink/50">· {inv.role}</span>
                    {inv.role === "viewer" && (
                      <span className="block text-xs font-normal text-ink/55">
                        {inv.storytellerIds.length
                          ? `Will see ${names(inv.storytellerIds)}`
                          : "No storytellers picked"}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="chip bg-amber-100 text-amber-700">{inv.status}</span>
                    {canManage && (
                      <form action={cancelInvitation}>
                        <input type="hidden" name="id" value={inv.id} />
                        <button
                          type="submit"
                          className="text-xs font-medium text-red-600 hover:underline"
                          title={`Cancel invitation for ${inv.email}`}
                        >
                          Cancel
                        </button>
                      </form>
                    )}
                  </span>
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
            {storytellers.length > 0 && (
              <fieldset className="w-full text-sm">
                <legend className="text-ink/60">
                  Viewers can see <span className="text-ink/45">(admins see everyone)</span>
                </legend>
                <div className="mt-1">
                  <StorytellerChecks
                    storytellers={storytellers}
                    checked={new Set(storytellers.map((s) => s.id))}
                  />
                </div>
              </fieldset>
            )}
            <button type="submit" className="btn-primary">
              Send invite
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

// One checkbox per storyteller, posted as `storyteller_ids`. Server actions
// re-check every id against the family before storing it.
function StorytellerChecks({
  storytellers,
  checked,
}: {
  storytellers: { id: string; name: string }[];
  checked: Set<string>;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {storytellers.map((s) => (
        <label key={s.id} className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="storyteller_ids"
            value={s.id}
            defaultChecked={checked.has(s.id)}
            className="size-4"
          />
          {s.name}
        </label>
      ))}
    </div>
  );
}
