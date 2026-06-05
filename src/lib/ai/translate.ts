// Transcript translation (TODO 7.4). SERVER-ONLY. One Anthropic call that
// renders a Spanish (or code-switched ES/EN) answer transcript into faithful
// English — a *view* of the original, never a replacement. The Spanish stays
// the record; this is the optional English reading for family who don't speak
// Spanish (Stories review + the keepsake book/PDF).
//
// ANTHROPIC_API_KEY is server-only (this is invoked from an admin-gated server
// action, never the client). On Cloudflare Workers the SDK uses fetch, so no
// Node APIs are needed. Failure contract: missing key or empty output -> throw,
// so the caller (translateStory) can swallow and leave the field null.
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

// Kept static so it can be prompt-cached across calls. SPEC § Localization:
// tolerate code-switching and DON'T correct the speaker — translate faithfully,
// don't sanitize, summarize, or "improve" what the elder said.
const SYSTEM_PROMPT = `You translate an elder's spoken life-story transcript into English for family members who don't speak Spanish.

Rules — follow every one:
- Output ONLY the English translation. No preamble, no notes, no quotation marks around the whole thing.
- Translate faithfully and completely. Preserve the meaning, tone, warmth, and the speaker's voice. Do not summarize, shorten, censor, or "clean up" what they said.
- The transcript may code-switch (mix Spanish and English). Render the whole thing in natural English; keep any English that was already there.
- Keep proper names, places, and family terms as the speaker used them. You may keep an affectionate term (e.g. "mija") with a short parenthetical gloss only if it would otherwise be lost — do not over-annotate.
- Keep it natural and readable as spoken English. Don't invent details that aren't in the source.
- If the source is already entirely in English, return it essentially unchanged.`;

// Translate one transcript to English. Throws on missing key / API error /
// empty output so the caller decides whether to swallow it.
export async function translateToEnglish(text: string): Promise<string> {
  const source = text.trim();
  if (!source) throw new Error("nothing to translate");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    temperature: 0.2, // faithful, not creative
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      { role: "user", content: `Translate this transcript to English:\n\n${source}` },
    ],
  });

  const out = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!out) throw new Error("empty translation from model");
  return out;
}
