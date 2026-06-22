import { NextRequest, NextResponse } from "next/server";
import { validateStorytellerToken } from "@/lib/storyteller/token";
import { supabaseService } from "@/lib/supabase/service";
import { synthesize, ELEVENLABS_DEFAULT_VOICE } from "@/lib/voice/elevenlabs";

// Cloned-voice question playback for the storyteller surface (TODO 4.2). The
// storyteller is token-scoped (no Supabase Auth), so this validates the magic-link
// token and reads via the SERVICE ROLE — same auth surface as api/storyteller/*.
// It synthesizes the on-screen question in the interviewer's cloned voice; the
// large text on the screen is the always-present backup channel (SPEC § Voice).
//
// Fail-soft, never dead-end the elder:
//   - no cloned voice linked yet        -> synthesize with a neutral default
//                                          voice, so every screen still speaks
//   - synthesis / config failure        -> 502 (client shows text only)
//   - bad token                         -> 401
//
// The text is the question the client is displaying (opening from server assembly
// 3.1, follow-up from api/ai/interview 3.2). We bound its length; tightening this
// to resolve text server-side from prompt_id/answer_id is a possible later step.

const MAX_TEXT = 800;

export async function POST(req: NextRequest) {
  let token = "";
  let text = "";
  let langRaw = "";
  try {
    const body = await req.json();
    token = String(body?.token ?? "");
    text = String(body?.text ?? "").trim();
    langRaw = String(body?.lang ?? "");
  } catch {
    // malformed body — token validation fails closed below
  }

  const session = await validateStorytellerToken(token);
  if (!session) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }
  if (!text) {
    return NextResponse.json({ error: "missing text" }, { status: 400 });
  }
  const clipped = text.slice(0, MAX_TEXT);
  const lang: "en" | "es" =
    (langRaw || session.language) === "es" ? "es" : "en";

  const db = supabaseService();

  // Resolve the interviewer for this storyteller, then THAT member's voice.
  // Voice attaches to the family member (voice_profiles.owner_user_id), not to
  // the relationship — so whoever is flagged as interviewer lends their voice.
  // When no interviewer is chosen yet, or the chosen one hasn't recorded a voice,
  // fall back to the neutral default voice so the surface always speaks aloud.
  let voiceId = ELEVENLABS_DEFAULT_VOICE;
  const { data: rel } = await db
    .from("storyteller_relationships")
    .select("user_id")
    .eq("storyteller_id", session.storyteller_id)
    .eq("family_id", session.family_id)
    .eq("is_interviewer", true)
    .maybeSingle();
  if (rel?.user_id) {
    const { data: profile } = await db
      .from("voice_profiles")
      .select("provider_voice")
      .eq("family_id", session.family_id)
      .eq("owner_user_id", rel.user_id)
      .maybeSingle();
    if (profile?.provider_voice) voiceId = profile.provider_voice;
  }

  try {
    const audio = await synthesize({ voiceId, text: clipped, lang });
    return new NextResponse(audio, {
      status: 200,
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[storyteller/voice] synthesize failed", e);
    return NextResponse.json({ error: "synthesis failed" }, { status: 502 });
  }
}
