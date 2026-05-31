import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberships } from "@/lib/auth";

// First-run onboarding (TODO 1.2). A newly authenticated member has no family
// yet; here they name one and the create_family RPC makes them its owner
// atomically (security-definer; clients never insert into families directly).
export default async function OnboardingPage() {
  // Already in a family? Nothing to onboard — go to the dashboard.
  if ((await getMemberships()).length > 0) redirect("/dashboard");

  async function createFamily(formData: FormData) {
    "use server";
    const name = (formData.get("name") as string | null)?.trim();
    if (!name) return;
    const sb = await supabaseServer();
    const { error } = await sb.rpc("create_family", { p_name: name });
    if (error) throw error;
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto max-w-md p-10">
      <h1 className="font-semibold text-2xl">Create your family</h1>
      <p className="mt-3 text-ink/70">
        This is your family&apos;s space on My Family Porch. You can invite others
        and add storytellers next. You&apos;ll be the owner.
      </p>
      <form action={createFamily} className="mt-6 space-y-4">
        <input
          type="text"
          name="name"
          required
          placeholder="e.g. The Trevino Family"
          autoComplete="off"
          className="w-full rounded-lg border px-4 py-3 text-base"
        />
        <button
          type="submit"
          className="w-full rounded-lg bg-ink px-4 py-3 font-medium text-white"
        >
          Create family
        </button>
      </form>
    </main>
  );
}
