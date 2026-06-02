import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";
import { synthesize } from "@/lib/voice/elevenlabs";

// Voice preview (TODO 4.1). Synthesizes a short line in the cloned voice so an
// admin can hear it — and confirm the SAME voice speaks both en and es (the
// multilingual model). TODO 4.2 reuses synthesize() for the real question on the
// storyteller screen. Returns mp3 bytes; the SSR (RLS) read keeps the voice
// scoped to the caller's family.

const PREVIEW: Record<"en" | "es", string> = {
  en: "Hi, it's me. I'd love to hear one of your stories today.",
  es: "Hola, soy yo. Me encantaría escuchar una de tus historias hoy.",
};

export async function POST(req: NextRequest) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) {
    return NextResponse.json({ error: "admin required" }, { status: 403 });
  }

  let body: { voice_profile_id?: string; lang?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "expected json" }, { status: 400 });
  }
  const voiceProfileId = String(body.voice_profile_id ?? "");
  const lang: "en" | "es" = body.lang === "es" ? "es" : "en";
  if (!voiceProfileId) {
    return NextResponse.json({ error: "missing voice_profile_id" }, { status: 400 });
  }

  const sb = await supabaseServer();
  // RLS (vp_select) scopes this to the caller's families, so a stray id from
  // another tenant resolves to nothing.
  const { data: profile } = await sb
    .from("voice_profiles")
    .select("provider_voice")
    .eq("id", voiceProfileId)
    .eq("family_id", active.family_id)
    .maybeSingle();
  if (!profile?.provider_voice) {
    return NextResponse.json({ error: "voice not found" }, { status: 404 });
  }

  try {
    const audio = await synthesize({ voiceId: profile.provider_voice, text: PREVIEW[lang], lang });
    return new NextResponse(audio, {
      status: 200,
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[voice/preview] synthesize failed", e);
    return NextResponse.json({ error: "preview failed" }, { status: 502 });
  }
}
