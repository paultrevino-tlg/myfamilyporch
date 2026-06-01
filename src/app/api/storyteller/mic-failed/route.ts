import { NextRequest, NextResponse } from "next/server";
import { validateStorytellerToken } from "@/lib/storyteller/token";
import { supabaseService } from "@/lib/supabase/service";
import { sendSms } from "@/lib/sms/twilio";

// Mic-failed signal (TODO 2.4). The storyteller surface beacons here when the
// microphone permission is denied or unavailable. We persist a `mic_failed`
// insight (service role, scoped to the token's family/storyteller) and make a
// best-effort attempt to text the admin. This is fail-soft by design: the
// elder's UI never waits on it and never sees an error from it.
//
// Throttled: we don't pile up insights or re-text on repeated denials within a
// short window (SPEC § three signals — mic_failed is acute but throttled).
const THROTTLE_HOURS = 6;

export async function POST(req: NextRequest) {
  let token = "";
  let userAgent = "";
  try {
    const body = await req.json();
    token = String(body?.token ?? "");
    userAgent = String(body?.user_agent ?? req.headers.get("user-agent") ?? "");
  } catch {
    // Malformed body — fall through; validation below fails closed.
  }

  const session = await validateStorytellerToken(token);
  if (!session) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  const db = supabaseService();

  // Throttle: if an undismissed mic_failed insight already exists for this
  // storyteller in the window, do nothing further.
  const since = new Date(Date.now() - THROTTLE_HOURS * 3600_000).toISOString();
  const { data: recent } = await db
    .from("insights")
    .select("id")
    .eq("storyteller_id", session.storyteller_id)
    .eq("type", "mic_failed")
    .is("dismissed_at", null)
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();

  if (recent) {
    return NextResponse.json({ ok: true, throttled: true });
  }

  const { error } = await db.from("insights").insert({
    family_id: session.family_id,
    storyteller_id: session.storyteller_id,
    type: "mic_failed",
    payload: { user_agent: userAgent, at: new Date().toISOString() },
  });
  if (error) {
    console.error("[storyteller/mic-failed] insert failed", error);
    // Still respond ok — the elder's experience must not depend on this.
    return NextResponse.json({ ok: true });
  }

  // Best-effort admin alert. Twilio transport is wired in TODO 4.3 and the
  // admin alert number is configured in Settings (TODO 5.5); until both land,
  // sendSms is a stub. Swallow any failure so the signal still records.
  try {
    // TODO 5.5: resolve the family's admin alert number; TODO 4.3: real send.
    const adminNumber = process.env.ADMIN_ALERT_TEST_NUMBER;
    if (adminNumber) {
      await sendSms(
        adminNumber,
        `My Family Porch: ${session.name} had a microphone problem starting a story. They may need a hand.`,
      );
    }
  } catch (e) {
    console.error("[storyteller/mic-failed] admin SMS failed (expected until 4.3/5.5)", e);
  }

  return NextResponse.json({ ok: true });
}
