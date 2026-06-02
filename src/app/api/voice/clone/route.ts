import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";
import { cloneVoice, deleteVoice, type VoiceSample } from "@/lib/voice/elevenlabs";

// Voice profile setup (TODO 4.1). An admin records the interviewer's voice in the
// browser; those samples are POSTed here, sent straight to ElevenLabs for an
// Instant Voice Clone, and we persist ONLY the returned voice_id in a
// voice_profiles row, then link it to the interviewer's relationship.
//
// Auth: the cookie-bound SSR client means RLS scopes every read/write to the
// signed-in member; we additionally require admin of the active family and that
// the caller owns a relationship to the target storyteller. The ElevenLabs key is
// server-only (this route).

const MAX_TOTAL_BYTES = 24 * 1024 * 1024; // ElevenLabs IVC accepts ~25MB total

export async function POST(req: NextRequest) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) {
    return NextResponse.json({ error: "admin required" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "expected multipart form" }, { status: 400 });
  }

  const storytellerId = String(form.get("storyteller_id") ?? "");
  const label = (String(form.get("label") ?? "").trim() || "Interviewer voice").slice(0, 80);
  const lang = String(form.get("lang") ?? "en") === "es" ? "es" : "en";
  if (!storytellerId) {
    return NextResponse.json({ error: "missing storyteller_id" }, { status: 400 });
  }

  const files = form.getAll("samples").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) {
    return NextResponse.json({ error: "no voice samples" }, { status: 400 });
  }
  const total = files.reduce((n, f) => n + f.size, 0);
  if (total > MAX_TOTAL_BYTES) {
    return NextResponse.json({ error: "samples too large" }, { status: 413 });
  }

  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  // The caller must own a relationship to this storyteller in the active family.
  // RLS already constrains this read to the member's families; the explicit
  // checks refuse a stray id and capture any voice we're replacing.
  const { data: rel } = await sb
    .from("storyteller_relationships")
    .select("id, voice_profile_id")
    .eq("user_id", user.id)
    .eq("storyteller_id", storytellerId)
    .eq("family_id", active.family_id)
    .maybeSingle();
  if (!rel) {
    return NextResponse.json({ error: "no relationship to this storyteller" }, { status: 404 });
  }

  // Read the recorded samples into memory for the multipart upload to ElevenLabs.
  const samples: VoiceSample[] = await Promise.all(
    files.map(async (f, i) => ({
      data: await f.arrayBuffer(),
      contentType: f.type || "audio/webm",
      filename: f.name || `sample-${i + 1}.webm`,
    })),
  );

  // Clone. A failure here returns a clear error and writes nothing.
  let voiceId: string;
  try {
    ({ voiceId } = await cloneVoice({ name: `${label} (${active.name})`, samples }));
  } catch (e) {
    console.error("[voice/clone] ElevenLabs clone failed", e);
    return NextResponse.json({ error: "voice clone failed" }, { status: 502 });
  }

  // Persist the profile (only the voice_id, never the audio) and link it.
  const { data: profile, error: insErr } = await sb
    .from("voice_profiles")
    .insert({
      family_id: active.family_id,
      owner_user_id: user.id,
      label,
      provider: "elevenlabs",
      provider_voice: voiceId,
      lang,
    })
    .select("id")
    .single();
  if (insErr || !profile) {
    console.error("[voice/clone] profile insert failed", insErr);
    await deleteVoice(voiceId); // don't leak an orphaned ElevenLabs voice
    return NextResponse.json({ error: "could not save voice profile" }, { status: 500 });
  }

  const { error: linkErr } = await sb
    .from("storyteller_relationships")
    .update({ voice_profile_id: profile.id })
    .eq("id", rel.id);
  if (linkErr) {
    console.error("[voice/clone] link failed", linkErr);
    await sb.from("voice_profiles").delete().eq("id", profile.id);
    await deleteVoice(voiceId);
    return NextResponse.json({ error: "could not link voice profile" }, { status: 500 });
  }

  // Replace any previous voice this relationship pointed at (re-clone): unlink is
  // done; now drop the old ElevenLabs voice + row so nothing is orphaned.
  if (rel.voice_profile_id && rel.voice_profile_id !== profile.id) {
    const { data: old } = await sb
      .from("voice_profiles")
      .select("provider_voice")
      .eq("id", rel.voice_profile_id)
      .maybeSingle();
    if (old?.provider_voice) await deleteVoice(old.provider_voice);
    await sb.from("voice_profiles").delete().eq("id", rel.voice_profile_id);
  }

  return NextResponse.json({ ok: true, voice_profile_id: profile.id, label });
}
