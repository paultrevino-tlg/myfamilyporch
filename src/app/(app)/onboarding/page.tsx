import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getFamilies } from "@/lib/auth";

// First-run onboarding (TODO 1.2). A newly authenticated member has no family
// yet; here they name one and the create_family RPC makes them its owner
// atomically (security-definer; clients never insert into families directly).
export default async function OnboardingPage() {
  // Already in a family? Nothing to onboard — go to the dashboard.
  if ((await getFamilies()).length > 0) redirect("/dashboard");

  async function createFamily(formData: FormData) {
    "use server";
    const name = (formData.get("name") as string | null)?.trim();
    if (!name) return;
    const sb = await supabaseServer();
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
          <input
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
