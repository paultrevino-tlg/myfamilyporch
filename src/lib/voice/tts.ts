// ElevenLabs multilingual TTS in the interviewer's cloned voice. Server-only.
export async function synthesize(_args: {
  voiceId: string; text: string; lang: "en" | "es";
}): Promise<ArrayBuffer> {
  // TODO 4.2: call ElevenLabs; return audio for the storyteller app to play.
  throw new Error("Not implemented — TODO 4.2");
}
