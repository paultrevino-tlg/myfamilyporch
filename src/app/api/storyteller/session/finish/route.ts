import { NextRequest, NextResponse } from "next/server";
import { validateStorytellerToken } from "@/lib/storyteller/token";
import { supabaseService } from "@/lib/supabase/service";

// Close out a session the storyteller stepped away from after the opening answer
// (TODO 2.9: "Maybe later" on the follow-up). The opener was saved with
// final=false, so without this the session would sit in_progress forever. One
// answer is a complete session — "that's plenty".
//
// Token-gated like every storyteller write: the session must belong to the
// token's storyteller, so a stray id can't close another tenant's session.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  let token = "";
  let sessionId = "";
  try {
    const body = await req.json();
    token = String(body?.token ?? "");
    sessionId = String(body?.session_id ?? "");
  } catch {
    // Malformed body — token validation below fails closed.
  }

  const session = await validateStorytellerToken(token);
  if (!session) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }
  if (!UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: "invalid session" }, { status: 400 });
  }

  const { data, error } = await supabaseService()
    .from("sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("storyteller_id", session.storyteller_id)
    .eq("status", "in_progress")
    .select("id");
  if (error) {
    console.error("[storyteller/session/finish] update failed", error);
    return NextResponse.json({ error: "could not finish session" }, { status: 500 });
  }

  // Zero rows = not theirs, or already closed. Either way nothing to do.
  return NextResponse.json({ ok: true, closed: (data ?? []).length > 0 });
}
