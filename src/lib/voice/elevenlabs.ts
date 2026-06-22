// ElevenLabs voice cloning + multilingual TTS (TODO 4.1). SERVER-ONLY.
// One cloned voice per interviewer; the SAME voice speaks both en and es via the
// multilingual model, so language is chosen at synthesis time, not at clone time
// (SPEC § Voice / § Localization). The ELEVENLABS_API_KEY lives only on the
// server; on Cloudflare Workers every call is plain `fetch` (FormData for the
// multipart clone upload), so no Node APIs are needed.
//
// We send the interviewer's recorded samples straight to ElevenLabs and persist
// ONLY the returned voice_id (in voice_profiles.provider_voice) — no biometric
// audio is stored on our servers.

const API = "https://api.elevenlabs.io/v1";

// The multilingual model that lets one cloned voice speak en + es.
export const ELEVENLABS_MODEL = "eleven_multilingual_v2";

// Neutral stock voice used when an interviewer hasn't linked a cloned voice yet,
// so the storyteller surface ALWAYS has a voice to read instructions/questions
// aloud (TODO 4.2 read-aloud). The multilingual model speaks en + es with this
// one voice. Default is the premade "Rachel"; override per-deploy with
// ELEVENLABS_DEFAULT_VOICE_ID.
export const ELEVENLABS_DEFAULT_VOICE =
  process.env.ELEVENLABS_DEFAULT_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

function apiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set");
  return key;
}

export type VoiceSample = {
  data: ArrayBuffer;
  contentType: string;
  filename: string;
};

// Instant Voice Cloning: create a voice from one or more short samples and return
// the new voice_id. Throws on missing key / API error so callers can surface a
// clear failure rather than store a dangling profile.
export async function cloneVoice(args: {
  name: string;
  samples: VoiceSample[];
  description?: string;
}): Promise<{ voiceId: string }> {
  if (!args.samples.length) throw new Error("at least one voice sample is required");

  const form = new FormData();
  form.set("name", args.name);
  if (args.description) form.set("description", args.description);
  // Let ElevenLabs clean up background noise from home recordings.
  form.set("remove_background_noise", "true");
  for (const s of args.samples) {
    form.append("files", new Blob([s.data], { type: s.contentType }), s.filename);
  }

  const res = await fetch(`${API}/voices/add`, {
    method: "POST",
    headers: { "xi-api-key": apiKey() }, // no Content-Type — fetch sets the multipart boundary
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs clone ${res.status}: ${detail.slice(0, 400)}`);
  }
  const json = (await res.json()) as { voice_id?: string };
  if (!json.voice_id) throw new Error("ElevenLabs clone returned no voice_id");
  return { voiceId: json.voice_id };
}

// Synthesize speech in the interviewer's cloned voice. Multilingual: the same
// voiceId speaks whichever language `text` is in (lang is carried for clarity /
// future per-language tuning). Returns mp3 bytes. This is the TTS primitive that
// TODO 4.2 plays on the storyteller question screen.
export async function synthesize(args: {
  voiceId: string;
  text: string;
  lang?: "en" | "es";
}): Promise<ArrayBuffer> {
  const res = await fetch(
    `${API}/text-to-speech/${args.voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey(),
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: args.text,
        model_id: ELEVENLABS_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs TTS ${res.status}: ${detail.slice(0, 400)}`);
  }
  return res.arrayBuffer();
}

// Delete a cloned voice (on re-clone or profile removal) so we don't leave
// orphaned voices in the ElevenLabs account. Best-effort: never throws, so a
// cleanup miss can't block the DB unlink.
export async function deleteVoice(voiceId: string): Promise<void> {
  try {
    await fetch(`${API}/voices/${voiceId}`, {
      method: "DELETE",
      headers: { "xi-api-key": apiKey() },
    });
  } catch (e) {
    console.error("[elevenlabs] deleteVoice failed (ignored)", e);
  }
}
