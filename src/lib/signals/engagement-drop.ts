// TODO 6.4 — the engaging-less signal. SERVER-ONLY (service role).
//
// SPEC § three signals: when an elder records *less than their own usual*, surface
// a gentle, non-clinical "might be a nice time to call" + one throttled family SMS.
// Never diagnose; the point is to prompt human contact, not replace it. Plain,
// explainable arithmetic over completed-session times: a recent weekly rate vs the
// elder's OWN earlier baseline. Throttled and pause-aware. Computed by the same
// hourly cron that sends nudges (TODO 6.1); the throttle keeps it effectively
// weekly. Distinct from the "wrong time" suggestion (6.3) — different message,
// same pipeline.
import { supabaseService } from "@/lib/supabase/service";
import { alertFamilyAdmins } from "@/lib/sms/admin-alert";

// Tuning — all in one place, all explainable. (Per-family sensitivity + on/off
// is TODO 6.5; these are the sensible defaults until then.)
const RECENT_DAYS = 28; // "lately": the trailing window we measure the current rate over
const BASELINE_DAYS = 56; // the elder's OWN baseline: the window just before "lately"
const MIN_BASELINE_SESSIONS = 4; // too little history → no baseline → no opinion
const DROP_FRACTION = 0.5; // "sustained drop": recent rate must be ≤ this share of baseline
const THROTTLE_DAYS = 30; // don't re-nudge within this window (no pileup)

const DAY_MS = 86_400_000;

// Decimal sessions/week rate → a calm, non-numeric label. We deliberately avoid
// false precision ("0.9 sessions/week") on a family-facing surface.
//   ~2+/wk → "about two a week", ~1/wk → "about one a week", <~0.6/wk → "less than
//   one a week". 0 → "not at all lately".
function rateLabel(perWeek: number): string {
  if (perWeek <= 0) return "not at all lately";
  const rounded = Math.round(perWeek);
  if (perWeek < 0.6) return "less than one session a week";
  const word = ["zero", "one", "two", "three", "four", "five"][rounded] ?? `${rounded}`;
  return `about ${word} session${rounded === 1 ? "" : "s"} a week`;
}

export type EngagementDrop = {
  recentPerWeek: number; // sessions/week over the trailing RECENT_DAYS
  baselinePerWeek: number; // sessions/week over the prior BASELINE_DAYS (their own norm)
  recentLabel: string; // "about one session a week"
  baselineLabel: string; // "about two sessions a week"
  baselineSessions: number; // completed sessions in the baseline window
  recentSessions: number; // completed sessions in the recent window
};

// PURE decision. Given a storyteller's completed-session timestamps (ISO strings)
// and the current instant, decide whether they're recording meaningfully less
// than their OWN recent baseline. Returns null unless the baseline + drop gates
// both pass. No DB, no clock — fully unit-testable.
export function deriveEngagementDrop(input: {
  completedTimestamps: string[];
  now: Date;
}): EngagementDrop | null {
  const nowMs = input.now.getTime();
  const recentStart = nowMs - RECENT_DAYS * DAY_MS;
  const baselineStart = nowMs - (RECENT_DAYS + BASELINE_DAYS) * DAY_MS;

  let recentSessions = 0;
  let baselineSessions = 0;
  for (const iso of input.completedTimestamps) {
    if (!iso) continue;
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) continue;
    if (t >= recentStart && t <= nowMs) recentSessions++;
    else if (t >= baselineStart && t < recentStart) baselineSessions++;
  }

  // Baseline gate: without an established personal norm we have no opinion. This
  // protects brand-new accounts and naturally-light recorders from being nagged.
  if (baselineSessions < MIN_BASELINE_SESSIONS) return null;

  const recentPerWeek = recentSessions / (RECENT_DAYS / 7);
  const baselinePerWeek = baselineSessions / (BASELINE_DAYS / 7);

  // Drop gate: recent rate must be a meaningful fraction below the baseline. The
  // multi-week recent window is itself the "sustained" measure — a single missed
  // week can't trip it.
  if (recentPerWeek > baselinePerWeek * DROP_FRACTION) return null;

  return {
    recentPerWeek,
    baselinePerWeek,
    recentLabel: rateLabel(recentPerWeek),
    baselineLabel: rateLabel(baselinePerWeek),
    baselineSessions,
    recentSessions,
  };
}

export type EngagementDropRunSummary = {
  considered: number; // active (non-paused) schedules examined
  flagged: string[]; // storyteller ids that got a fresh engagement-drop signal
  throttled: number; // would-flag rows skipped by the throttle window
};

// Scan every active schedule, compute the drop, and emit a throttled insight +
// gentle family SMS for each fresh one. Pause-aware (paused rows excluded at the
// source), fail-soft per row.
export async function runEngagementDrop(
  now: Date = new Date(),
): Promise<EngagementDropRunSummary> {
  const db = supabaseService();
  const summary: EngagementDropRunSummary = { considered: 0, flagged: [], throttled: 0 };

  const { data: rows, error } = await db
    .from("schedules")
    .select("family_id, storyteller_id")
    .eq("paused", false);
  if (error || !rows) return summary;

  const throttleSince = new Date(now.getTime() - THROTTLE_DAYS * DAY_MS).toISOString();
  const historySince = new Date(
    now.getTime() - (RECENT_DAYS + BASELINE_DAYS) * DAY_MS,
  ).toISOString();

  for (const row of rows) {
    summary.considered++;

    try {
      // Completed sessions across the full baseline+recent window. Engagement time
      // = when they began the session (started_at), falling back to completion.
      const { data: sessions } = await db
        .from("sessions")
        .select("started_at, completed_at")
        .eq("family_id", row.family_id)
        .eq("storyteller_id", row.storyteller_id)
        .not("completed_at", "is", null)
        .gte("completed_at", historySince);

      const timestamps = (sessions ?? [])
        .map((s) => (s.started_at as string | null) ?? (s.completed_at as string | null))
        .filter((t): t is string => !!t);

      const drop = deriveEngagementDrop({ completedTimestamps: timestamps, now });
      if (!drop) continue;

      // Throttle: any engagement_drop for this storyteller within the window
      // (dismissed or not) suppresses a new one — gentle, never a pileup.
      const { data: recentInsight } = await db
        .from("insights")
        .select("id")
        .eq("storyteller_id", row.storyteller_id)
        .eq("type", "engagement_drop")
        .gte("created_at", throttleSince)
        .limit(1)
        .maybeSingle();
      if (recentInsight) {
        summary.throttled++;
        continue;
      }

      const { error: insErr } = await db.from("insights").insert({
        family_id: row.family_id,
        storyteller_id: row.storyteller_id,
        type: "engagement_drop",
        payload: {
          recent_label: drop.recentLabel,
          baseline_label: drop.baselineLabel,
          recent_per_week: drop.recentPerWeek,
          baseline_per_week: drop.baselinePerWeek,
          at: now.toISOString(),
        },
      });
      if (insErr) {
        console.error("[engagement-drop] insert failed", row.storyteller_id, insErr);
        continue;
      }
      summary.flagged.push(row.storyteller_id);

      // Resolve the storyteller's name for the family SMS (best-effort).
      const { data: st } = await db
        .from("storytellers")
        .select("name")
        .eq("id", row.storyteller_id)
        .eq("family_id", row.family_id)
        .maybeSingle();
      const name = st?.name ?? "Your storyteller";

      await alertFamilyAdmins(
        db,
        row.family_id,
        `My Family Porch: ${name} has been recording a little less than usual lately. ` +
          `Could well be nothing — might be a nice moment to give them a call.`,
      );
    } catch (e) {
      console.error("[engagement-drop] row failed", row.storyteller_id, e);
    }
  }

  return summary;
}
