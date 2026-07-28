// Global SMS suppression check (docs/consent-flow.md). One number, global —
// an opt-out survives across families. This is the minimal pre-send gate used
// by the step-9/10 consent sends (Phase 4C.C); Phase 4C.F generalizes it into
// the universal gate (adds opted_in verification, quiet hours, and carrier
// reconciliation). SERVER-ONLY (service role).
import type { supabaseService } from "@/lib/supabase/service";
import { normalizePhone } from "@/lib/phone";

// True when the number is on the global suppression list (a prior STOP /
// natural-language opt-out / carrier block). Fail-open is NOT acceptable for
// opt-out, so a lookup error is treated as suppressed (don't send on doubt).
//
// The lookup is an exact match, and rows are written from Twilio's inbound
// `From` (always E.164), so the caller's number is normalized to E.164 first.
// Without that, a differently-formatted stored number ("4806784044") silently
// missed its own suppression row and the gate waved the send through.
export async function isSuppressed(
  db: ReturnType<typeof supabaseService>,
  phone: string,
): Promise<boolean> {
  const normalized = normalizePhone(phone);
  if (!normalized.ok || !normalized.value) {
    // Unusable number: nothing can be sent to it anyway, and we must not report
    // "not suppressed" for a number we failed to understand.
    console.error("[suppression] unnormalizable number — treating as suppressed");
    return true;
  }

  const { data, error } = await db
    .from("sms_suppressions")
    .select("phone_e164")
    .eq("phone_e164", normalized.value)
    .maybeSingle();
  if (error) {
    console.error("[suppression] lookup failed — treating as suppressed", error);
    return true;
  }
  return !!data;
}
