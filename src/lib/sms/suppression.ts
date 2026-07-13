// Global SMS suppression check (docs/consent-flow.md). One number, global —
// an opt-out survives across families. This is the minimal pre-send gate used
// by the step-9/10 consent sends (Phase 4C.C); Phase 4C.F generalizes it into
// the universal gate (adds opted_in verification, quiet hours, and carrier
// reconciliation). SERVER-ONLY (service role).
import type { supabaseService } from "@/lib/supabase/service";

// True when the number is on the global suppression list (a prior STOP /
// natural-language opt-out / carrier block). Fail-open is NOT acceptable for
// opt-out, so a lookup error is treated as suppressed (don't send on doubt).
export async function isSuppressed(
  db: ReturnType<typeof supabaseService>,
  phoneE164: string,
): Promise<boolean> {
  const { data, error } = await db
    .from("sms_suppressions")
    .select("phone_e164")
    .eq("phone_e164", phoneE164)
    .maybeSingle();
  if (error) {
    console.error("[suppression] lookup failed — treating as suppressed", error);
    return true;
  }
  return !!data;
}
