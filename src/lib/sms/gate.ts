// Universal A2P pre-send gate (consent-flow.md "Pre-send gate"). Run before
// EVERY program message (nudges, family "ready"). The two hard gates: the party
// must be opted_in, and the number must not be globally suppressed. Quiet hours
// stay enforced by isScheduleDue for the scheduled nudge path (the cron); ask-now
// and the step-10 "ready" note are treated as permitted/direct. SERVER-ONLY.
import type { supabaseService } from "@/lib/supabase/service";
import { isSuppressed } from "./suppression";

export type GateResult = { ok: true } | { ok: false; reason: "not-opted-in" | "suppressed" };

export async function preSendGate(
  db: ReturnType<typeof supabaseService>,
  params: { consentState: string; phone: string },
): Promise<GateResult> {
  if (params.consentState !== "opted_in") return { ok: false, reason: "not-opted-in" };
  if (await isSuppressed(db, params.phone)) return { ok: false, reason: "suppressed" };
  return { ok: true };
}
