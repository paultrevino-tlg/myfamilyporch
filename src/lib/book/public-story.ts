// Public voice-QR story loader (TODO 7.2). Backs the login-free /p/<token> page.
// SERVER-ONLY: the visitor has no Supabase session (they scanned a printed QR),
// so the read goes through the service role — authorization was already proven by
// the play token before this is called. Scoped to ONE top-level answer + its
// follow-up thread; nothing else is exposed.
import { supabaseService } from "@/lib/supabase/service";
import type { Lang } from "@/lib/i18n";

export type PublicFollowUp = {
  id: string;
  transcript: string | null;
  hasAudio: boolean;
};

export type PublicStory = {
  id: string;
  storytellerName: string;
  language: Lang;
  question: string | null;
  transcript: string | null;
  hasAudio: boolean;
  followUps: PublicFollowUp[];
};

// Load the single story a play token authorizes. Returns null if the answer is
// missing or somehow isn't a top-level story (a follow-up id should never resolve
// a token, but we refuse it defensively).
export async function loadPublicStory(answerId: string): Promise<PublicStory | null> {
  const svc = supabaseService();
  const { data: raw } = await svc
    .from("answers")
    .select(
      "id, question_text, transcript, audio_path, is_followup, " +
        "storyteller:storytellers(name, language), " +
        "followups:answers!parent_answer_id(id, transcript, audio_path, created_at)",
    )
    .eq("id", answerId)
    .eq("is_followup", false)
    .maybeSingle();
  if (!raw) return null;

  // The self-referential embed isn't in the generated types — normalize the shape
  // ourselves (same gotcha handled in lib/book.ts loadBook).
  type FollowRow = {
    id: string;
    transcript: string | null;
    audio_path: string | null;
    created_at: string;
  };
  type StoryRow = {
    id: string;
    question_text: string | null;
    transcript: string | null;
    audio_path: string | null;
    storyteller: unknown;
    followups: unknown;
  };
  const data = raw as unknown as StoryRow;

  const stRel = data.storyteller;
  const st = (Array.isArray(stRel) ? stRel[0] : stRel) as
    | { name: string; language: string }
    | null;

  const followUps = ((data.followups as FollowRow[] | null) ?? [])
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((f) => ({
      id: f.id,
      transcript: f.transcript ?? null,
      hasAudio: !!f.audio_path,
    }));

  return {
    id: data.id,
    storytellerName: st?.name ?? "",
    language: st?.language === "es" ? "es" : "en",
    question: data.question_text ?? null,
    transcript: data.transcript ?? null,
    hasAudio: !!data.audio_path,
    followUps,
  };
}
