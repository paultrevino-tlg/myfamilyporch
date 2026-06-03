import { redirect } from "next/navigation";
import Link from "next/link";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";
import { createStoryteller } from "../actions";

// Add a storyteller (TODO 2.1). The creation-time configuration: the shared
// facts (name, pronouns, birth year, language) plus the creating member's own
// relationship (address term, kind, asker relation, interviewer). Voice, phone,
// recording link, schedule, and topics are set afterward on the storyteller hub
// (they need the new storyteller's id). Admin-only; RLS (st_write / rel_write)
// is the real boundary. createStoryteller redirects to the new hub on success.

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
const inputCls = "mt-1 input";

export default async function NewStorytellerPage() {
  const active = await getActiveMembership();
  if (!active) redirect("/onboarding");

  const canManage = roleAtLeast(active.role, "admin");

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-7">
      <Link href="/dashboard" className="text-sm font-semibold text-ink/50 hover:text-ink">
        ← Dashboard
      </Link>
      <div className="mt-3">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Add a storyteller</h1>
        <p className="mt-1.5 text-sm text-ink/55">
          A new person in {active.name} whose stories we&apos;ll capture.
        </p>
      </div>

      {canManage ? (
        <form action={createStoryteller} className="card mt-7 grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
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
            <button type="submit" className="btn-primary">
              Add storyteller
            </button>
            <p className="mt-2 text-xs text-ink/50">
              Next you&apos;ll set up their voice, phone, recording link, schedule, and topics.
            </p>
          </div>
        </form>
      ) : (
        <p className="mt-8 text-sm text-ink/50">Only owners and admins can add storytellers.</p>
      )}
    </main>
  );
}
