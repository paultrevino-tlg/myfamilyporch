import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/auth";
import { cloneVoice, deleteVoice, type VoiceSample } from "@/lib/voice/elevenlabs";

// Record MY voice (voice-per-member). A family member records themselves once in
// Settings → My voice; the clone is stored against THEM (voice_profiles
// .owner_user_id), and is reused wherever they're chosen as a storyteller's
// interviewer. There's no storyteller/relationship link anymore.
//
// Auth: any signed-in member of the active family may record their OWN voice
// (owner_user_id is always the caller — you can't write someone else's voice).
// The ElevenLabs key is server-only (this route). Re-recording replaces the
// member's single profile and deletes the old ElevenLabs voice.

const MAX_TOTAL_BYTES = 24 * 1024 * 1024; // ElevenLabs IVC accepts ~25MB total

export async function POST(req: NextRequest) {
  const active = await getActiveMembership();
  if (!active) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "expected multipart form" }, { status: 400 });
  }

  const label = (String(form.get("label") ?? "").trim() || "My voice").slice(0, 80);
  const lang = String(form.get("lang") ?? "en") === "es" ? "es" : "en";

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

  // Any voice this member already has — we replace it (one voice per member).
  const { data: existing } = await sb
    .from("voice_profiles")
    .select("id, provider_voice")
    .eq("family_id", active.family_id)
    .eq("owner_user_id", user.id)
    .maybeSingle();

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

  // Persist the profile (only the voice_id, never the audio), keyed to the member.
  let profileId: string;
  if (existing) {
    // Replace in place: point the member's row at the new voice, then retire the old.
    const { error: updErr } = await sb
      .from("voice_profiles")
      .update({ label, provider: "elevenlabs", provider_voice: voiceId, lang })
      .eq("id", existing.id);
    if (updErr) {
      console.error("[voice/clone] profile update failed", updErr);
      await deleteVoice(voiceId);
      return NextResponse.json({ error: "could not save voice profile" }, { status: 500 });
    }
    profileId = existing.id;
    if (existing.provider_voice && existing.provider_voice !== voiceId) {
      await deleteVoice(existing.provider_voice); // don't leak the old ElevenLabs voice
    }
  } else {
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
    profileId = profile.id;
  }

  return NextResponse.json({ ok: true, voice_profile_id: profileId, label });
}
