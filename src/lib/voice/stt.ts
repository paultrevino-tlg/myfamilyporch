// Speech-to-text for the elder's recorded answers (TODO 3.4). SERVER-ONLY.
// Runs behind api/storyteller/* (after the token is validated); the Deepgram key
// lives only on the server. On Cloudflare Workers the call is plain `fetch`, so no
// Node APIs are needed.
//
// Code-switching (SPEC § Localization / § The AI interview loop): elders mix
// English and Spanish mid-sentence. We use Deepgram nova-3 with `language=multi`,
// which is built for exactly this — it returns ONE transcript with the languages
// interleaved as spoken. We never translate and never "correct" the language;
// translation for the keepsake is a separate, later feature (7.4).

const DEEPGRAM_URL = "https://api.deepgram.com/v1/listen";

// Transcribe one answer clip. Throws on missing key / API error / empty result so
// callers can degrade gracefully (leave transcript null) rather than fail the
// elder — same contract as generateFollowUp.
export async function transcribe(args: {
  audio: ArrayBuffer;
  contentType: string;
  // The storyteller's primary language (en/es). nova-3 `multi` auto-detects and
  // handles the switching itself; we carry this for logging/future tuning only.
  lang?: "en" | "es";
}): Promise<string> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY is not set");

  // nova-3 + multi = code-switch-aware multilingual transcription. smart_format +
  // punctuate make the transcript readable for the keepsake and for the AI.
  const url = `${DEEPGRAM_URL}?model=nova-3&language=multi&smart_format=true&punctuate=true`;
  const contentType = args.contentType || "audio/webm";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": contentType,
    },
    body: args.audio,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Deepgram ${res.status}: ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    results?: { channels?: { alternatives?: { transcript?: string }[] }[] };
  };
  const transcript =
    json.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? "";
  if (!transcript) throw new Error("Deepgram returned an empty transcript");
  return transcript;
}
