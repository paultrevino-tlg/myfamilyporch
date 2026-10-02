// Outbound SMS log (TODO 4.5, migration 0019). SERVER-ONLY (service role).
//
// Records each story nudge we send (Twilio SID, manual vs. scheduled) and applies
// the delivery status Twilio reports back, so the storyteller page can say "Last
// request: Fri 1:57 PM · Delivered" instead of leaving the member guessing.
import { supabaseService } from "@/lib/supabase/service";

export type OutboundSource = "manual" | "schedule";

// Log a sent nudge. Best-effort: the text already went out, so a failed log
// write must never turn a successful send into an error.
export async function recordNudge(row: {
  familyId: string;
  storytellerId: string;
  source: OutboundSource;
  sid: string | null;
}): Promise<void> {
  try {
    const { error } = await supabaseService().from("sms_outbound").insert({
      family_id: row.familyId,
      storyteller_id: row.storytellerId,
      kind: "nudge",
      source: row.source,
      twilio_sid: row.sid,
    });
    if (error) console.error("[sms-outbound] record failed", error);
  } catch (e) {
    console.error("[sms-outbound] record threw (ignored)", e);
  }
}

// Twilio can deliver status callbacks out of order (a late "sent" after
// "delivered"), so only ever move a row forward.
const RANK: Record<string, number> = {
  accepted: 0,
  scheduled: 0,
  queued: 1,
  sending: 2,
  sent: 3,
  delivered: 4,
  undelivered: 4,
  failed: 4,
  canceled: 4,
  read: 5,
};

export function isForward(current: string, next: string): boolean {
  const n = RANK[next];
  if (n === undefined) return false;
  return n >= (RANK[current] ?? -1);
}

// Apply one status callback. Returns true if a row was updated.
export async function applyStatus(
  sid: string,
  status: string,
  errorCode: number | null,
): Promise<boolean> {
  const db = supabaseService();
  const { data: row } = await db
    .from("sms_outbound")
    .select("id, status")
    .eq("twilio_sid", sid)
    .maybeSingle();
  if (!row || !isForward(row.status, status)) return false;
  const { error } = await db
    .from("sms_outbound")
    .update({ status, error_code: errorCode, updated_at: new Date().toISOString() })
    .eq("id", row.id);
  if (error) {
    console.error("[sms-outbound] status update failed", error);
    return false;
  }
  return true;
}
