import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";
import {
  createStoryteller,
  updateStoryteller,
  updateMyRelationship,
  deleteStoryteller,
  createRecordingLink,
  revokeRecordingLinks,
} from "./actions";

// Storyteller + relationship management (TODO 2.1). RLS scopes every read to the
// member's families; the active-family cookie picks which one this page shows.
// A storyteller carries shared facts; the relationship rows below each belong to
// the signed-in member (their own address term for this elder).

const PRONOUN_LABEL: Record<string, string> = {
  he_him: "he/him",
  she_her: "she/her",
  they_them: "they/them",
};
const KIND_LABEL: Record<string, string> = {
  any: "Any",
  parent: "Parent",
  grandparent: "Grandparent",
  aunt_uncle: "Aunt / Uncle",
  sibling: "Sibling",
  spouse: "Spouse",
  other: "Other",
};
const KINDS = Object.keys(KIND_LABEL);
const inputCls = "mt-1 rounded-lg border px-3 py-2 text-base";

export default async function StorytellersPage({
  searchParams,
}: {
  searchParams: Promise<{ link?: string; for?: string; error?: string }>;
}) {
  const active = await getActiveMembership();
  if (!active) redirect("/onboarding");

  const canManage = roleAtLeast(active.role, "admin");
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const sp = await searchParams;

  // Each storyteller with the current member's own relationship (if any).
  // Filtering the embedded resource by user_id keeps other members' edges out.
  const { data: storytellers } = await sb
    .from("storytellers")
    .select(
      "id,name,pronouns,birth_year,language,storyteller_relationships(address_term,kind,asker_relation,is_interviewer)",
    )
    .eq("family_id", active.family_id)
    .eq("storyteller_relationships.user_id", user.id)
    .order("created_at", { ascending: true });

  // Active (un-revoked) recording links per storyteller — readable via tok_select
  // RLS. We only store hashes, so we can show status/usage, never the raw URL.
  const { data: tokenRows } = await sb
    .from("storyteller_tokens")
    .select("storyteller_id,last_used_at")
    .eq("family_id", active.family_id)
    .is("revoked_at", null);
  const linkStatus = new Map<string, { count: number; lastUsed: string | null }>();
  for (const t of tokenRows ?? []) {
    const cur = linkStatus.get(t.storyteller_id) ?? { count: 0, lastUsed: null };
    cur.count += 1;
    if (t.last_used_at && (!cur.lastUsed || t.last_used_at > cur.lastUsed)) {
      cur.lastUsed = t.last_used_at;
    }
    linkStatus.set(t.storyteller_id, cur);
  }

  // Build the full /s/<token> URL once, only for the storyteller just minted.
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const mintedUrl = sp.link ? `${origin}/s/${sp.link}` : null;

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl">Storytellers</h1>
          <p className="mt-1 text-sm text-ink/60">
            The people in {active.name} whose stories we capture.
          </p>
        </div>
        <Link href="/dashboard" className="text-sm text-ink/60 underline">
          ← Dashboard
        </Link>
      </div>

      {sp.error === "link" && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Couldn&apos;t create the recording link. The storyteller-token secret may not be
          configured.
        </p>
      )}

      {/* Existing storytellers ------------------------------------------------ */}
      <section className="mt-8 space-y-4">
        {(storytellers ?? []).length === 0 && (
          <p className="text-sm text-ink/50">No storytellers yet.</p>
        )}

        {(storytellers ?? []).map((s) => {
          const rel = Array.isArray(s.storyteller_relationships)
            ? s.storyteller_relationships[0]
            : s.storyteller_relationships;
          return (
            <div key={s.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-lg">
                    {s.name}
                    {rel?.address_term && (
                      <span className="text-ink/50"> · you call {rel.address_term}</span>
                    )}
                  </p>
                  <p className="text-sm text-ink/60">
                    {PRONOUN_LABEL[s.pronouns] ?? s.pronouns}
                    {s.birth_year ? ` · b. ${s.birth_year}` : ""}
                    {` · ${s.language === "es" ? "Español" : "English"}`}
                    {rel?.is_interviewer ? " · interviewer" : ""}
                  </p>
                </div>
                {canManage && (
                  <form action={deleteStoryteller}>
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" className="text-sm text-red-600 underline">
                      Remove
                    </button>
                  </form>
                )}
              </div>

              {canManage && (
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  {/* Edit shared facts */}
                  <details className="w-full">
                    <summary className="cursor-pointer text-ink/70">Edit details</summary>
                    <form action={updateStoryteller} className="mt-3 flex flex-wrap items-end gap-3">
                      <input type="hidden" name="id" value={s.id} />
                      <label className="flex flex-col">
                        <span className="text-ink/60">Name</span>
                        <input name="name" required defaultValue={s.name} className={inputCls} />
                      </label>
                      <label className="flex flex-col">
                        <span className="text-ink/60">Pronouns</span>
                        <select name="pronouns" defaultValue={s.pronouns} className={inputCls}>
                          <option value="she_her">she/her</option>
                          <option value="he_him">he/him</option>
                          <option value="they_them">they/them</option>
                        </select>
                      </label>
                      <label className="flex flex-col">
                        <span className="text-ink/60">Birth year</span>
                        <input
                          name="birth_year"
                          inputMode="numeric"
                          placeholder="1948"
                          defaultValue={s.birth_year ?? ""}
                          className={`${inputCls} w-24`}
                        />
                      </label>
                      <label className="flex flex-col">
                        <span className="text-ink/60">Language</span>
                        <select name="language" defaultValue={s.language} className={inputCls}>
                          <option value="en">English</option>
                          <option value="es">Español</option>
                        </select>
                      </label>
                      <button
                        type="submit"
                        className="rounded-lg bg-ink px-4 py-2 font-medium text-white"
                      >
                        Save
                      </button>
                    </form>
                  </details>

                  {/* Edit the current member's relationship */}
                  <details className="w-full">
                    <summary className="cursor-pointer text-ink/70">
                      Your relationship to {s.name}
                    </summary>
                    <form
                      action={updateMyRelationship}
                      className="mt-3 flex flex-wrap items-end gap-3"
                    >
                      <input type="hidden" name="storyteller_id" value={s.id} />
                      <label className="flex flex-col">
                        <span className="text-ink/60">You call them</span>
                        <input
                          name="address_term"
                          required
                          placeholder="Dad, Grandma, Uncle Joe"
                          defaultValue={rel?.address_term ?? ""}
                          className={inputCls}
                        />
                      </label>
                      <label className="flex flex-col">
                        <span className="text-ink/60">Relationship</span>
                        <select name="kind" defaultValue={rel?.kind ?? "other"} className={inputCls}>
                          {KINDS.map((k) => (
                            <option key={k} value={k}>
                              {KIND_LABEL[k]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col">
                        <span className="text-ink/60">They are your…</span>
                        <input
                          name="asker_relation"
                          placeholder="son, niece"
                          defaultValue={rel?.asker_relation ?? ""}
                          className={inputCls}
                        />
                      </label>
                      <label className="flex items-center gap-2 pb-2">
                        <input
                          type="checkbox"
                          name="is_interviewer"
                          defaultChecked={rel?.is_interviewer ?? false}
                        />
                        <span className="text-ink/70">I&apos;m the interviewer</span>
                      </label>
                      <button
                        type="submit"
                        className="rounded-lg bg-ink px-4 py-2 font-medium text-white"
                      >
                        Save
                      </button>
                    </form>
                  </details>
                </div>
              )}

              {/* Recording link (magic-link token). Status visible to all;
                  mint/revoke admin-only. The raw URL shows once, right after mint. */}
              <div className="mt-3 border-t pt-3 text-sm">
                {(() => {
                  const status = linkStatus.get(s.id);
                  return (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-ink/60">
                        {status
                          ? `${status.count} active link${status.count === 1 ? "" : "s"}` +
                            (status.lastUsed
                              ? ` · last opened ${new Date(status.lastUsed).toLocaleDateString()}`
                              : " · not opened yet")
                          : "No recording link yet"}
                      </span>
                      {canManage && (
                        <span className="flex gap-3">
                          <form action={createRecordingLink}>
                            <input type="hidden" name="storyteller_id" value={s.id} />
                            <button type="submit" className="text-ink/70 underline">
                              Create recording link
                            </button>
                          </form>
                          {status && (
                            <form action={revokeRecordingLinks}>
                              <input type="hidden" name="storyteller_id" value={s.id} />
                              <button type="submit" className="text-red-600 underline">
                                Revoke links
                              </button>
                            </form>
                          )}
                        </span>
                      )}
                    </div>
                  );
                })()}

                {mintedUrl && sp.for === s.id && (
                  <div className="mt-2 rounded-lg bg-amber-50 p-3">
                    <p className="text-ink/70">
                      Copy this link now — for {s.name}&apos;s privacy it won&apos;t be shown
                      again:
                    </p>
                    <code className="mt-1 block break-all text-ink">{mintedUrl}</code>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Add a storyteller ---------------------------------------------------- */}
      {canManage ? (
        <section className="mt-10 border-t pt-6">
          <h2 className="font-medium text-lg">Add a storyteller</h2>
          <form action={createStoryteller} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col text-sm">
              <span className="text-ink/60">Name</span>
              <input name="name" required placeholder="Rosa Treviño" className={inputCls} />
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-ink/60">You call them</span>
              <input name="address_term" required placeholder="Grandma" className={inputCls} />
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-ink/60">Pronouns</span>
              <select name="pronouns" defaultValue="they_them" className={inputCls}>
                <option value="she_her">she/her</option>
                <option value="he_him">he/him</option>
                <option value="they_them">they/them</option>
              </select>
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-ink/60">Relationship</span>
              <select name="kind" defaultValue="grandparent" className={inputCls}>
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-ink/60">Birth year</span>
              <input name="birth_year" inputMode="numeric" placeholder="1948" className={inputCls} />
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-ink/60">Language</span>
              <select name="language" defaultValue="en" className={inputCls}>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-ink/60">They are your…</span>
              <input name="asker_relation" placeholder="grandson, niece" className={inputCls} />
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" name="is_interviewer" />
              <span className="text-ink/70">I&apos;m the interviewer</span>
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-ink px-4 py-2 font-medium text-white"
              >
                Add storyteller
              </button>
            </div>
          </form>
        </section>
      ) : (
        <p className="mt-10 border-t pt-6 text-sm text-ink/50">
          Only owners and admins can add or edit storytellers.
        </p>
      )}
    </main>
  );
}
