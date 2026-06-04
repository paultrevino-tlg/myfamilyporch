import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";
import { readPlayToken } from "@/lib/book/play-token";

// Public voice-QR audio (TODO 7.2). The login-free sibling of api/stories/audio:
// the SAME private-bucket pattern (sign + 307-redirect), but gated by the play
// token in the printed QR instead of a family membership.
//
//   GET ?t=<playToken>            → the story's own recording.
//   GET ?t=<playToken>&a=<id>     → a FOLLOW-UP recording, but only if that
//                                   answer's parent is the token's story (so one
//                                   token can't fish for arbitrary answers).
//
// The token is a bearer secret (unguessable AES over the answer id). Reading it
// proves authorization; the story-audio bucket has no Storage policies, so the
// service role mints the short-lived signed URL.

const BUCKET = "story-audio";
const SIGNED_URL_TTL_SEC = 300; // 5 minutes — long enough to start playback, no more
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t") ?? "";
  const storyId = await readPlayToken(token);
  if (!storyId) {
    // Missing / forged / edited token, or the secret is unset → fail closed.
    return NextResponse.json({ error: "bad link" }, { status: 401 });
  }

  // Which answer in the story's thread are we serving?
  const followUpId = req.nextUrl.searchParams.get("a");
  const svc = supabaseService();

  let audioPath: string | null = null;
  if (followUpId) {
    if (!UUID_RE.test(followUpId)) {
      return NextResponse.json({ error: "bad answer id" }, { status: 400 });
    }
    // A follow-up is only fair game if it hangs off THIS story.
    const { data: fu } = await svc
      .from("answers")
      .select("audio_path, parent_answer_id")
      .eq("id", followUpId)
      .maybeSingle();
    if (!fu || fu.parent_answer_id !== storyId) {
      return NextResponse.json({ error: "no recording" }, { status: 404 });
    }
    audioPath = fu.audio_path;
  } else {
    const { data: story } = await svc
      .from("answers")
      .select("audio_path")
      .eq("id", storyId)
      .maybeSingle();
    audioPath = story?.audio_path ?? null;
  }

  if (!audioPath) {
    return NextResponse.json({ error: "no recording" }, { status: 404 });
  }

  const { data: signed, error } = await svc.storage
    .from(BUCKET)
    .createSignedUrl(audioPath, SIGNED_URL_TTL_SEC);
  if (error || !signed?.signedUrl) {
    console.error("[p/audio] could not sign url", error);
    return NextResponse.json({ error: "could not load audio" }, { status: 502 });
  }
  return NextResponse.redirect(signed.signedUrl, 307);
}
