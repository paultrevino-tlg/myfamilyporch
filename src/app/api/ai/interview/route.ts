import { NextRequest, NextResponse } from "next/server";
import { validateStorytellerToken } from "@/lib/storyteller/token";
import { supabaseService } from "@/lib/supabase/service";
import { buildRelationshipContext } from "@/lib/ai/assembly";
import { generateFollowUp, resolveTokens } from "@/lib/ai/interviewer";

// The interview brain (TODO 3.2). All Anthropic calls happen here, server-side —
// never in the client. The storyteller surface (token-scoped, the second auth
// surface) calls this after the elder's opening answer is saved, to get one
// natural follow-up that chases the thread they just opened.
//
// Input: { token, answer_id }. We re-derive the relationship context SERVER-SIDE
// from the token's storyteller (never trust client-provided names/pronouns) and
// read the asked question + transcript from the saved answer row.
//
// Graceful degradation (never strand the elder):
//   - transcript present  -> AI follow-up (generateFollowUp).
//   - no transcript yet (STT is TODO 3.4) or AI fails -> first unused pre-authored
//     follow-up from the opening prompt's `follow_ups`, token-resolved.
//   - nothing available    -> { question: null }; the surface keeps a gentle generic.

export async function POST(req: NextRequest) {
  let token = "";
  let answerId = "";
  try {
    const body = await req.json();
    token = String(body?.token ?? "");
    answerId = String(body?.answer_id ?? "");
  } catch {
    // Malformed body — fall through; token validation fails closed below.
  }

  const session = await validateStorytellerToken(token);
  if (!session) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  const db = supabaseService();

  // Load the answer we're following up on, scoped to the token's storyteller so a
  // stray id can't read another tenant's row.
  const { data: answer } = await db
    .from("answers")
    .select("id, session_id, prompt_id, question_text, transcript")
    .eq("id", answerId)
    .eq("storyteller_id", session.storyteller_id)
    .maybeSingle();
  if (!answer) {
    return NextResponse.json({ error: "answer not found" }, { status: 404 });
  }

  // Resolve the relationship context (names, pronouns, era) server-side.
  const ctx = await buildRelationshipContext(session.storyteller_id);
  if (!ctx) {
    return NextResponse.json({ question: null });
  }

  const transcript = (answer.transcript ?? "").trim();

  // --- AI path: we have something the elder actually said -> chase the thread.
  if (transcript) {
    try {
      const coverageRemaining = await coverageGaps(db, session.storyteller_id, ctx.lang);
      const question = await generateFollowUp({
        ctx,
        questionAsked: answer.question_text ?? "",
        answerTranscript: transcript,
        coverageRemaining,
      });
      return NextResponse.json({ question, source: "ai" });
    } catch (e) {
      // Fall through to the pre-authored follow-up rather than failing the elder.
      console.error("[ai/interview] generateFollowUp failed; using fallback", e);
    }
  }

  // --- Fallback path: a pre-authored follow-up from the opening prompt (TODO 3.4
  // replaces this with the AI path once transcripts exist).
  const fallback = await preauthoredFollowUp(db, answer.prompt_id, answer.session_id, ctx);
  return NextResponse.json({ question: fallback, source: fallback ? "preauthored" : "none" });
}

// Light coverage signal for the AI: library categories in the storyteller's
// language minus the ones already answered. The opening-question selector
// (lib/ai/assembly) carries the full 3.3 gating/pacing/weighting; the follow-up
// only needs a hint of where there's still ground to cover.
async function coverageGaps(
  db: ReturnType<typeof supabaseService>,
  storytellerId: string,
  lang: string,
): Promise<string[]> {
  const { data: lib } = await db.from("prompts").select("category").eq("lang", lang);
  const all = new Set((lib ?? []).map((r) => r.category as string));

  const { data: answered } = await db
    .from("answers")
    .select("prompts(category)")
    .eq("storyteller_id", storytellerId)
    .not("prompt_id", "is", null);
  for (const row of answered ?? []) {
    const p = (row as { prompts: { category: string } | { category: string }[] | null }).prompts;
    const cat = Array.isArray(p) ? p[0]?.category : p?.category;
    if (cat) all.delete(cat);
  }
  return [...all];
}

// First pre-authored follow-up for the opening prompt that hasn't already been
// asked in this session, with tokens resolved against the relationship context.
async function preauthoredFollowUp(
  db: ReturnType<typeof supabaseService>,
  promptId: string | null,
  sessionId: string | null,
  ctx: Parameters<typeof generateFollowUp>[0]["ctx"],
): Promise<string | null> {
  if (!promptId) return null;
  const { data: prompt } = await db
    .from("prompts")
    .select("follow_ups")
    .eq("id", promptId)
    .maybeSingle();
  const followUps = (prompt?.follow_ups ?? []) as string[];
  if (!followUps.length) return null;

  // Don't repeat a follow-up already asked in this session.
  let asked = new Set<string>();
  if (sessionId) {
    const { data: prior } = await db
      .from("answers")
      .select("question_text")
      .eq("session_id", sessionId);
    asked = new Set((prior ?? []).map((a) => (a.question_text ?? "").trim()).filter(Boolean));
  }

  const pick =
    followUps.find((f) => !asked.has(resolveTokens(f, ctx).trim())) ?? followUps[0];
  return resolveTokens(pick, ctx);
}
