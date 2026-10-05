import { NextRequest, NextResponse } from "next/server";
import { validateStorytellerToken } from "@/lib/storyteller/token";
import { supabaseService } from "@/lib/supabase/service";
import { assembleOpeningQuestion, buildRelationshipContext } from "@/lib/ai/assembly";
import {
  OPEN_FLOOR_QUESTION,
  generateFollowUp,
  isOpenFloorQuestion,
  shouldAskOpenFloor,
} from "@/lib/ai/interviewer";

// The interview brain (TODO 3.2). All Anthropic calls happen here, server-side —
// never in the client. The storyteller surface (token-scoped, the second auth
// surface) calls this after the elder's opening answer, to get the session's
// second question.
//
// Input: { token, answer_id?, opener_prompt_id? }. We re-derive the relationship
// context SERVER-SIDE from the token's storyteller (never trust client-provided
// names/pronouns) and read the asked question + transcript from the saved answer.
//
// What comes back (never strand the elder):
//   - occasionally (3.5)        -> the open-floor question.
//   - transcript + AI answers   -> an AI follow-up that chases what they said.
//   - anything else (no saved answer, no transcript, AI down) -> NO follow-up:
//     the next standard library question instead (3.6), as its own story. A
//     canned follow-up can't know what they said, so it isn't asked.
//   - nothing eligible          -> { question: null }; the surface ends warmly.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  let token = "";
  let answerId = "";
  let openerPromptId = "";
  try {
    const body = await req.json();
    token = String(body?.token ?? "");
    answerId = String(body?.answer_id ?? "");
    openerPromptId = String(body?.opener_prompt_id ?? "");
  } catch {
    // Malformed body — fall through; token validation fails closed below.
  }

  const session = await validateStorytellerToken(token);
  if (!session) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  const db = supabaseService();

  // The answer we'd follow up on, scoped to the token's storyteller so a stray id
  // can't read another tenant's row. Missing (upload failed) → library question.
  const { data: answer } = UUID_RE.test(answerId)
    ? await db
        .from("answers")
        .select("id, prompt_id, question_text, transcript")
        .eq("id", answerId)
        .eq("storyteller_id", session.storyteller_id)
        .maybeSingle()
    : { data: null };

  if (answer) {
    const ctx = await buildRelationshipContext(session.storyteller_id);
    if (!ctx) return NextResponse.json({ question: null, source: "none" });

    // --- Open-floor path (3.5): now and then, hand the floor back to the elder.
    // If we can't read the last follow-up, skip it rather than risk a repeat.
    const { data: lastFollowUp, error: lastErr } = await db
      .from("answers")
      .select("question_text")
      .eq("storyteller_id", session.storyteller_id)
      .eq("is_followup", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (
      !lastErr &&
      shouldAskOpenFloor({
        lastFollowUpWasOpenFloor: isOpenFloorQuestion(lastFollowUp?.question_text),
      })
    ) {
      return NextResponse.json({ question: OPEN_FLOOR_QUESTION[ctx.lang], source: "open_floor" });
    }

    // --- AI path: we have something the elder actually said -> chase the thread.
    const transcript = (answer.transcript ?? "").trim();
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
        console.error("[ai/interview] generateFollowUp failed; next library question", e);
      }
    }
  }

  // --- Library path: no follow-up — the next standard question, chosen by the
  // same selector as the opener. The opener is excluded explicitly: its answer
  // may never have saved, so the answered set can't be relied on to skip it.
  const exclude = [answer?.prompt_id, openerPromptId].filter(
    (id): id is string => !!id && UUID_RE.test(id),
  );
  const next = await assembleOpeningQuestion({
    storytellerId: session.storyteller_id,
    familyId: session.family_id,
    excludePromptIds: exclude,
  });
  if (!next) return NextResponse.json({ question: null, source: "none" });
  return NextResponse.json({
    question: next.questionText,
    prompt_id: next.promptId,
    source: "library",
  });
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
