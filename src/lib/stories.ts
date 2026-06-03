// Stories review data for the family/admin dashboard (TODO 5.2).
// Server-only. Reads go through the cookie-bound SSR client, so RLS scopes rows
// to the signed-in member (ans_select = any member of the family — viewer reads
// too). We additionally filter to the active family (the cookie's focus). No
// service role here — audio playback mints signed URLs separately (audio route).
import { supabaseServer } from "@/lib/supabase/server";

// One answer in a follow-up thread (an AI/pre-authored follow-up + its reply).
export type StoryFollowUp = {
  id: string;
  question: string | null;
  transcript: string | null;
  durationSec: number | null;
  hasAudio: boolean;
};

// A top-level story: the opening answer plus the follow-ups threaded under it.
export type Story = {
  id: string;
  question: string | null;
  category: string | null;
  storyteller: string;
  createdAt: string;
  durationSec: number | null;
  transcript: string | null;
  inBook: boolean;
  hasAudio: boolean;
  followUps: StoryFollowUp[];
};

// PostgREST embeds a to-one relation as an object at runtime but the generated
// types widen it to an array — normalize either shape (same gotcha as auth.ts /
// overview.ts).
function one<T>(rel: unknown): T | null {
  if (Array.isArray(rel)) return (rel[0] as T) ?? null;
  return (rel as T) ?? null;
}

export async function loadStories(
  familyId: string,
  storytellerId?: string
): Promise<Story[]> {
  const sb = await supabaseServer();

  // Top-level answers (follow-ups thread under them), newest first, with the
  // category, storyteller, and the full follow-up thread embedded. The
  // self-referential `followups` embed defeats PostgREST's static type
  // inference, so we type the rows explicitly below. An optional storytellerId
  // narrows to one elder's archive (the detail page); RLS stays the boundary.
  let query = sb
    .from("answers")
    .select(
      "id, question_text, transcript, in_book, duration_sec, audio_path, created_at, " +
        "storyteller:storytellers(name), prompt:prompts(category), " +
        "followups:answers!parent_answer_id(id, question_text, transcript, duration_sec, audio_path, created_at)"
    )
    .eq("family_id", familyId)
    .eq("is_followup", false);
  if (storytellerId) query = query.eq("storyteller_id", storytellerId);
  const { data } = await query.order("created_at", { ascending: false });

  type FollowRow = {
    id: string;
    question_text: string | null;
    transcript: string | null;
    duration_sec: number | null;
    audio_path: string | null;
    created_at: string;
  };
  type StoryRow = {
    id: string;
    question_text: string | null;
    transcript: string | null;
    in_book: boolean;
    duration_sec: number | null;
    audio_path: string | null;
    created_at: string;
    storyteller: unknown;
    prompt: unknown;
    followups: unknown;
  };

  return ((data ?? []) as unknown as StoryRow[]).map((a) => ({
    id: a.id,
    question: a.question_text ?? null,
    category: one<{ category: string }>(a.prompt)?.category ?? null,
    storyteller: one<{ name: string }>(a.storyteller)?.name ?? "Storyteller",
    createdAt: a.created_at,
    durationSec: a.duration_sec ?? null,
    transcript: a.transcript ?? null,
    inBook: a.in_book,
    hasAudio: !!a.audio_path,
    // Oldest-first within a thread reads like a conversation.
    followUps: ((a.followups as FollowRow[] | null) ?? [])
      .slice()
      .sort((x, y) => x.created_at.localeCompare(y.created_at))
      .map((f) => ({
        id: f.id,
        question: f.question_text ?? null,
        transcript: f.transcript ?? null,
        durationSec: f.duration_sec ?? null,
        hasAudio: !!f.audio_path,
      })),
  }));
}
