import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

// Audio playback for Stories review (TODO 5.2). The ONLY place a private
// recording is served to a family member. Flow:
//   1. Read the answer through the cookie-bound SSR client. RLS (ans_select =
//      is_member_of) gates this to the caller's families and ANY role — viewers
//      hear + read too. A member of family B simply gets no row for family A's
//      answer → 404.
//   2. Only AFTER that membership-gated read do we mint a SHORT-LIVED signed URL
//      with the service role (the story-audio bucket has no Storage policies, so
//      signing requires the service role) and 307-redirect to it.
// An <audio src="/api/stories/audio?answer=<id>"> element follows the redirect.

const BUCKET = "story-audio";
const SIGNED_URL_TTL_SEC = 300; // 5 minutes — long enough to start playback, no more

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const answerId = req.nextUrl.searchParams.get("answer") ?? "";
  if (!UUID_RE.test(answerId)) {
    return NextResponse.json({ error: "bad answer id" }, { status: 400 });
  }

  // Membership-gated read: RLS scopes this to the caller's families + any role.
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const { data: answer } = await sb
    .from("answers")
    .select("audio_path")
    .eq("id", answerId)
    .maybeSingle();
  if (!answer || !answer.audio_path) {
    // No row (not the caller's family) or no recording linked — same calm 404.
    return NextResponse.json({ error: "no recording" }, { status: 404 });
  }

  // Access is now established; mint the signed URL with the service role.
  const svc = supabaseService();
  const { data: signed, error } = await svc.storage
    .from(BUCKET)
    .createSignedUrl(answer.audio_path, SIGNED_URL_TTL_SEC);
  if (error || !signed?.signedUrl) {
    console.error("[stories/audio] could not sign url", error);
    return NextResponse.json({ error: "could not load audio" }, { status: 502 });
  }

  return NextResponse.redirect(signed.signedUrl, 307);
}
