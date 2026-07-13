import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

// Dashboard nudge to finish member phone verification (consent-flow.md). Shows
// when the signed-in member hasn't opted in to texts for the active family, so
// they can turn on the reminder + setup SMS. RLS-scoped read of their own
// membership row; renders nothing once opted in. The setup wizard (Phase 4C.E)
// will sequence this step; this keeps it discoverable in the meantime.
export default async function VerifyPhoneBanner({ familyId }: { familyId: string }) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data: mem } = await sb
    .from("memberships")
    .select("consent_state")
    .eq("family_id", familyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!mem || mem.consent_state === "opted_in") return null;

  return (
    <Link
      href="/setup"
      className="mt-7 flex items-center gap-3 rounded-2xl border border-brand/20 bg-brand/5 px-4 py-3.5 text-sm transition hover:bg-brand/10"
    >
      <span aria-hidden className="text-xl">
        📱
      </span>
      <span className="text-ink/80">
        <strong className="font-semibold text-ink">Finish setting up.</strong> Verify your mobile
        number and send your storyteller their invite.
      </span>
      <span aria-hidden className="ml-auto text-brand">
        →
      </span>
    </Link>
  );
}
