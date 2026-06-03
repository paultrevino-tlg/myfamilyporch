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

  // Best-effort admin alert (TODO 5.5). Text every owner/admin in this family
  // who set an alert number in Settings (memberships.alert_phone). Fail-soft:
  // any send error is swallowed so the signal still records and the elder's
  // experience never depends on it.
  try {
    const { data: admins } = await db
      .from("memberships")
      .select("alert_phone, role")
      .eq("family_id", session.family_id)
      .in("role", ["owner", "admin"])
      .not("alert_phone", "is", null);

    const numbers = Array.from(
      new Set(
        (admins ?? [])
          .map((m) => m.alert_phone?.trim())
          .filter((p): p is string => !!p),
      ),
    );

    await Promise.all(
      numbers.map((to) =>
        sendSms(
          to,
          `My Family Porch: ${session.name} had a microphone problem starting a story. They may need a hand.`,
        ).catch((e) => console.error("[storyteller/mic-failed] admin SMS failed", e)),
      ),
    );
  } catch (e) {
    console.error("[storyteller/mic-failed] admin alert lookup failed", e);
  }

  return NextResponse.json({ ok: true });
}
