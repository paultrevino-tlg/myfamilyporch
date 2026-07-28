import { NextRequest, NextResponse } from "next/server";
import { verifyConsentToken } from "@/lib/consent/token";
import { supabaseService } from "@/lib/supabase/service";
import { synthesize, ELEVENLABS_DEFAULT_VOICE } from "@/lib/voice/elevenlabs";
import { spokenText, type SpokenVariant } from "@/lib/consent/spoken";
import type { Lang } from "@/lib/i18n";

// Read-aloud for the storyteller authorization page, in the interviewer's cloned
// voice (the same voice that will ask the questions later, so the elder hears a
// familiar person at the moment they're deciding).
//
// Auth surface: the signed CONSENT token (purpose 'consent') — not the recording
// token that api/storyteller/voice validates. Reads via the service role once the
// token verifies, matching the rest of the token-gated storyteller surface.
//
// This route accepts NO text from the client. What the page says is fully
// determined by the token's language, so the text is assembled here from the same
// i18n keys the page renders. That keeps it from being a general-purpose TTS
// proxy for anyone holding a consent link.
//
// Fail-soft, never dead-end the elder:
//   - interviewer has no cloned voice yet -> neutral default voice (very likely
//     at consent time, before voice setup)
//   - synthesis / config failure          -> 502 (client falls back to the
//                                            browser's own speech synthesis)
//   - bad or expired token                -> 401

export async function POST(req: NextRequest) {
  let token = "";
  let langRaw = "";
  let variantRaw = "";
  try {
    const body = await req.json();
    token = String(body?.token ?? "");
    langRaw = String(body?.lang ?? "");
    variantRaw = String(body?.variant ?? "");
  } catch {
    // malformed body — token validation fails closed below
  }

  const payload = await verifyConsentToken(token, "consent", Date.now());
  if (!payload?.storytellerId) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  // The storyteller may switch the page language before opting in, so honor the
  // requested language, falling back to the one baked into the token.
  const lang: Lang = (langRaw || payload.language) === "es" ? "es" : "en";
  // Which script to read — the page before they decide, or the confirmation
  // after. Constrained to the two known variants; the client still supplies no
  // text of its own.
  const variant: SpokenVariant = variantRaw === "success" ? "success" : "consent";
  const text = spokenText(lang, variant);

  const db = supabaseService();

  // Voice attaches to the family member (voice_profiles.owner_user_id), not to
  // the relationship — whoever is flagged as interviewer lends their voice.
  let voiceId = ELEVENLABS_DEFAULT_VOICE;
  const { data: rel } = await db
    .from("storyteller_relationships")
    .select("user_id")
    .eq("storyteller_id", payload.storytellerId)
    .eq("family_id", payload.familyId)
    .eq("is_interviewer", true)
    .maybeSingle();
  if (rel?.user_id) {
    const { data: profile } = await db
      .from("voice_profiles")
      .select("provider_voice")
      .eq("family_id", payload.familyId)
      .eq("owner_user_id", rel.user_id)
      .maybeSingle();
    if (profile?.provider_voice) voiceId = profile.provider_voice;
  }

  try {
    const audio = await synthesize({ voiceId, text, lang });
    return new NextResponse(audio, {
      status: 200,
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[consent/voice] synthesize failed", e);
    return NextResponse.json({ error: "synthesis failed" }, { status: 502 });
  }
}
