import Link from "next/link";
import { redirect } from "next/navigation";
import { getFamilies } from "@/lib/auth";
import { Photo } from "@/components/Photo";

// Signed in, but not in any family. Families are never created here any more —
// pay first, account second (TODO 9.0; SPEC § Marketing, signup & billing): a
// family and its owner are provisioned server-side once a subscription is active,
// and everyone else joins through an invitation. So this page just points the
// way: get started, or ask the family for an invite.
export default async function OnboardingPage() {
  // Already in a family? Nothing to do here — go to the dashboard.
  if ((await getFamilies()).length > 0) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center p-6">
      <div className="card overflow-hidden">
        <Photo
          name="porch"
          sizes="(min-width: 768px) 28rem, 100vw"
          className="h-40 w-full object-cover"
        />
        <div className="p-8">
          <h1 className="font-serif text-2xl font-semibold">You&apos;re not part of a family yet</h1>
          <p className="mt-2 text-ink/65">
            If someone in your family uses My Family Porch, ask them to invite you — the
            invitation email brings you straight in.
          </p>
          <p className="mt-3 text-ink/65">Starting your own family&apos;s porch?</p>
          <Link href="/signup" className="btn-primary mt-5 block w-full py-3 text-center">
            Get started
          </Link>
        </div>
      </div>
    </main>
  );
}
