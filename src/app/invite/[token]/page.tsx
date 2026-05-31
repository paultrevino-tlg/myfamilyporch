import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { acceptInvitation } from "@/app/(app)/actions";

// Invitation accept surface (TODO 1.3). Lives OUTSIDE the (app) group so we can
// route an unauthenticated invitee through login with a `next` back to here,
// instead of dropping them on a generic dashboard. The actual join goes through
// the accept_invitation security-definer RPC (the invitee isn't a member yet).
export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);

  // The invitee can't read the invitations row under RLS yet, so fetch the
  // display details with the service role (server-only) for a friendly screen.
  const svc = supabaseService();
  const { data: inv } = await svc
    .from("invitations")
    .select("email, role, accepted_at, expires_at, families(name)")
    .eq("token", token)
    .maybeSingle();

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <main className="mx-auto max-w-md p-10">{children}</main>
  );

  if (!inv) {
    return (
      <Shell>
        <h1 className="font-semibold text-2xl">Invitation not found</h1>
        <p className="mt-3 text-ink/70">This invitation link isn&apos;t valid. Ask the family to send a new one.</p>
      </Shell>
    );
  }

  const famRel = inv.families as unknown;
  const familyName =
    (Array.isArray(famRel) ? famRel[0]?.name : (famRel as { name?: string } | null)?.name) ??
    "the family";
  const expired = new Date(inv.expires_at) < new Date();
  const emailMatch = (user.email ?? "").toLowerCase() === inv.email.toLowerCase();

  if (inv.accepted_at) {
    return (
      <Shell>
        <h1 className="font-semibold text-2xl">Already accepted</h1>
        <p className="mt-3 text-ink/70">This invitation has already been used.</p>
        <Link href="/dashboard" className="mt-4 inline-block underline">Go to your dashboard</Link>
      </Shell>
    );
  }

  if (expired) {
    return (
      <Shell>
        <h1 className="font-semibold text-2xl">Invitation expired</h1>
        <p className="mt-3 text-ink/70">This invitation to {familyName} has expired. Ask for a new one.</p>
      </Shell>
    );
  }

  if (!emailMatch) {
    return (
      <Shell>
        <h1 className="font-semibold text-2xl">Wrong email</h1>
        <p className="mt-3 text-ink/70">
          This invitation was sent to <strong>{inv.email}</strong>, but you&apos;re signed in as{" "}
          <strong>{user.email}</strong>. Sign out and sign back in with the invited address.
        </p>
        <form action="/auth/signout" method="post" className="mt-4">
          <button type="submit" className="underline">Sign out</button>
        </form>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="font-semibold text-2xl">Join {familyName}</h1>
      <p className="mt-3 text-ink/70">
        You&apos;ve been invited as a <strong>{inv.role}</strong>. Accept to start{" "}
        {inv.role === "viewer" ? "listening to and reading" : "helping with"} {familyName}&apos;s stories.
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <form action={acceptInvitation} className="mt-6">
        <input type="hidden" name="token" value={token} />
        <button type="submit" className="w-full rounded-lg bg-ink px-4 py-3 font-medium text-white">
          Accept &amp; join {familyName}
        </button>
      </form>
    </Shell>
  );
}
