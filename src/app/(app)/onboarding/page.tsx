import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getFamilies } from "@/lib/auth";
import { myName, saveMyName } from "@/lib/profile";

// First-run onboarding (TODO 1.2). A newly authenticated member has no family
// yet; here they name one and the create_family RPC makes them its owner
// atomically (security-definer; clients never insert into families directly).
export default async function OnboardingPage() {
  // Already in a family? Nothing to onboard — go to the dashboard.
  if ((await getFamilies()).length > 0) redirect("/dashboard");

  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const currentName = myName(user);

  async function createFamily(formData: FormData) {
    "use server";
    const name = (formData.get("name") as string | null)?.trim();
    if (!name) return;
    const sb = await supabaseServer();
    // The member's own name signs the storyteller's texts ("it's Paul").
    await saveMyName(sb, formData.get("my_name"));
    const { error } = await sb.rpc("create_family", { p_name: name });
    if (error) throw error;
    // Into the guided setup wizard (consent-flow.md): verify number → add
    // storyteller → send the invite. Every step is skippable.
    redirect("/setup");
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center p-6">
      <div className="card p-8">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-3xl">🏡</div>
        <h1 className="mt-4 font-serif text-2xl font-semibold">Create your family</h1>
        <p className="mt-2 text-ink/65">
          This is your family&apos;s space on My Family Porch. You can invite others
          and add storytellers next. You&apos;ll be the owner.
        </p>
        <form action={createFamily} className="mt-6 space-y-3">
          <label className="block text-sm font-medium">
            Your first name
            <span className="block text-xs font-normal text-ink/50">
              Signs the texts your storyteller gets — &ldquo;Hi Mom, it&apos;s Sam.&rdquo;
            </span>
            <input
              type="text"
              name="my_name"
              required
              maxLength={40}
              defaultValue={currentName}
              placeholder="e.g. Sam"
              autoComplete="given-name"
              className="input mt-1 w-full"
            />
          </label>
          <label className="block text-sm font-medium" htmlFor="family-name">
            Family name
          </label>
          <input
            id="family-name"
            type="text"
            name="name"
            required
            placeholder="e.g. The Trevino Family"
            autoComplete="off"
            className="input w-full"
          />
          <button type="submit" className="btn-primary w-full py-3">
            Create family
          </button>
        </form>
      </div>
    </main>
  );
}
