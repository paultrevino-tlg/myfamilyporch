// Daily cap on MANUAL story nudges. SERVER-ONLY (service role).
//
// The weekly cron is already cost-bounded — it sends only on the family's chosen
// days_of_week — but the two manual buttons ("Ask now" on Schedule, "Send a
// nudge" on the storyteller hub) were unbounded, making them the only unbounded
// outbound path in the system (docs/PRICING.md §6.3). Repeated clicks cost real
// Twilio spend and, worse, text an elder over and over.
//
// The counter lives in manual_nudge_quota, which is service-role only (RLS on,
// zero policies — migration 0018). It deliberately is NOT a column on
// storytellers/schedules, because RLS grants family admins UPDATE on those, so
// the person being limited could reset their own counter via PostgREST.
import { supabaseService } from "@/lib/supabase/service";
import {
  DEFAULT_TIMEZONE,
  MANUAL_NUDGE_DAILY_CAP,
  localDayIn,
} from "@/lib/schedule";

/** The storyteller's local calendar day, per their schedule's timezone. */
async function localDay(
  db: ReturnType<typeof supabaseService>,
  storytellerId: string,
): Promise<string> {
  const { data } = await db
    .from("schedules")
    .select("timezone")
    .eq("storyteller_id", storytellerId)
    .maybeSingle();
  return localDayIn(data?.timezone || DEFAULT_TIMEZONE);
}

export type QuotaClaim =
  | { ok: true; day: string; count: number }
  | { ok: false };

/**
 * Atomically claim one manual send against today's cap. The RPC does it in a
 * single statement, so two simultaneous clicks cannot both pass.
 *
 * Fails CLOSED: an RPC error refuses the send rather than letting an unbounded
 * path through on a database hiccup.
 */
export async function claimManualNudge(
  storytellerId: string,
): Promise<QuotaClaim> {
  const db = supabaseService();
  const day = await localDay(db, storytellerId);

  const { data, error } = await db.rpc("claim_manual_nudge", {
    p_storyteller: storytellerId,
    p_day: day,
    p_cap: MANUAL_NUDGE_DAILY_CAP,
  });
  if (error) {
    console.error("[nudge-quota] claim failed", error);
    return { ok: false };
  }
  // NULL from the RPC means the cap is already reached for this local day.
  if (data == null) return { ok: false };
  return { ok: true, day, count: data };
}

/**
 * Give a claim back when the send did not actually go out — the pre-send gate
 * skipped it, or it threw. Best-effort: a failed refund costs the admin one slot
 * for the day, which is the safe direction to fail.
 */
export async function releaseManualNudge(
  storytellerId: string,
  day: string,
): Promise<void> {
  try {
    const db = supabaseService();
    const { error } = await db.rpc("release_manual_nudge", {
      p_storyteller: storytellerId,
      p_day: day,
    });
    if (error) console.error("[nudge-quota] release failed", error);
  } catch (e) {
    console.error("[nudge-quota] release threw (ignored)", e);
  }
}
