// Server-side interview brain. Resolves prompt tokens and asks Anthropic for a
// natural follow-up that chases the storyteller's thread while respecting the
// coverage backbone and the "avoid" topics. See TODO Phase 3.

export type RelationshipContext = {
  address: string;          // "Dad", "Grandma", "Uncle Joe"
  name: string;
  pronouns: "he_him" | "she_her" | "they_them";
  askerRelation?: string;   // "your son", "your niece"
  partner?: string;
  askerParent?: string;
  kind: "any" | "parent" | "grandparent" | "aunt_uncle" | "sibling" | "spouse" | "other";
  birthYear?: number;
  lang: "en" | "es";
};

export function resolveTokens(text: string, ctx: RelationshipContext): string {
  const pr = {
    he_him: { they: "he", them: "him", their: "his" },
    she_her: { they: "she", them: "her", their: "her" },
    they_them: { they: "they", them: "them", their: "their" },
  }[ctx.pronouns];
  return text
    .replaceAll("{address}", ctx.address)
    .replaceAll("{name}", ctx.name)
    .replaceAll("{partner}", ctx.partner ?? "")
    .replaceAll("{asker_relation}", ctx.askerRelation ?? "")
    .replaceAll("{asker_parent}", ctx.askerParent ?? "")
    .replaceAll("{they}", pr.they).replaceAll("{them}", pr.them).replaceAll("{their}", pr.their);
}

// --- Follow-up generation (TODO 3.2) -----------------------------------------
// SERVER-ONLY. One Anthropic call that chases the thread the elder just opened
// and returns a single natural follow-up in their language. ANTHROPIC_API_KEY
// lives only on the server (this runs behind api/ai/interview). On Cloudflare
// Workers the SDK uses fetch, so no Node APIs are needed.
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

// The interview philosophy from SPEC § The AI interview loop, kept static so it
// can be prompt-cached across calls. We hand the model the resolved context as a
// separate (uncached) block.
const SYSTEM_PROMPT = `You are a warm, patient interviewer helping a family capture an elder's life stories as a spoken conversation. You hear one answer the elder just gave, and you ask the next question.

Rules — follow every one:
- Ask EXACTLY ONE question. Never two. No preamble, no commentary, no "That's wonderful." Output only the question itself.
- Follow the thread the elder just opened. Pick up a specific detail, name, place, or feeling they mentioned and gently go deeper. You are not working through a script.
- Keep it short and plain — it will be spoken aloud and heard by an older person. One sentence is ideal. Use simple, natural words.
- Be warm and unhurried. Curiosity, never interrogation.
- If the elder gave a very short, closed, or reluctant answer, or signaled they'd rather not go there, do NOT push. Offer an easy, low-pressure question or gently shift to a lighter direction.
- Never stack a heavy or painful topic right after an emotional answer. Let warmth lead.
- Write in the elder's language exactly. If they code-switch (mixing English and Spanish), follow their lead naturally and never correct their language.
- Refer to people the way this family does (you'll be given the names/terms). Don't invent facts you weren't given.
- If the answer is empty or unintelligible, ask a kind, simple question that invites them to start again — never scold.`;

const LANG_LABEL: Record<RelationshipContext["lang"], string> = {
  en: "English",
  es: "Spanish (warm, conversational, Mexican-leaning)",
};

// Build the per-call context block: who the elder is, how they're addressed, the
// question we just asked, what they said, and which areas remain to explore.
function contextBlock(args: {
  ctx: RelationshipContext;
  questionAsked: string;
  answerTranscript: string;
  coverageRemaining: string[];
}): string {
  const { ctx } = args;
  const era = ctx.birthYear ? `, born ${ctx.birthYear}` : "";
  const asker = ctx.askerRelation ? ` The questions come from ${ctx.askerRelation}.` : "";
  const coverage = args.coverageRemaining.length
    ? `Areas not yet explored (only steer here if their thread runs dry): ${args.coverageRemaining.join(", ")}.`
    : "";
  return [
    `Write your question in ${LANG_LABEL[ctx.lang]}.`,
    `The elder is ${ctx.name}${era}, addressed as "${ctx.address}".${asker}`,
    `You just asked: "${args.questionAsked}"`,
    `They answered: "${args.answerTranscript}"`,
    coverage,
    `Now ask your one follow-up question.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

// Generate one follow-up. Throws on API/auth failure so the route can fall back
// to a pre-authored follow-up rather than stranding the elder.
export async function generateFollowUp(args: {
  ctx: RelationshipContext;
  questionAsked: string;
  answerTranscript: string;
  coverageRemaining: string[];
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    temperature: 0.8,
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: contextBlock(args) }],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!text) throw new Error("empty follow-up from model");
  // Models occasionally wrap a single line in quotes — strip a symmetric pair.
  return text.replace(/^["'“”]+|["'“”]+$/g, "").trim();
}
