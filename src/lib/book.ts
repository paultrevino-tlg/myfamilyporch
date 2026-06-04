// Keepsake book assembly (TODO 7.1). Server-only, RLS-scoped via the SSR client
// (ans_select / st_select / sp_select are all is_member_of readable — viewers
// see the book too). Stories marked `in_book` group into chapters by their
// prompt category; chapters order by the admin's saved order (storytellers
// .book_chapter_order) falling back to a canonical life-arc order; stories
// within a chapter order by the manual book_sort, then chronologically. Photo
// bytes are never touched here — only metadata; the bytes stream through the
// signed-URL route (api/book/photo) after the same membership check.
import { supabaseServer } from "@/lib/supabase/server";

// The life-arc a keepsake naturally reads in. Category strings are identical in
// EN and ES (English labels are used as keys in both languages), so one order
// covers both. Unknown/custom categories fall to the end alphabetically.
export const CANONICAL_CHAPTER_ORDER = [
  "Warm-Ups & Icebreakers",
  "Childhood & Early Years",
  "School & Coming of Age",
  "Young Adulthood & Work",
  "Love & Relationships",
  "Family & Roots",
  "Parenthood & the Next Generation",
  "Friendship & Community",
  "Hobbies, Joys & Everyday Life",
  "Hard Times & Resilience",
  "Reflection & Wisdom",
  "Legacy & Things Left to Say",
] as const;

export type BookPhoto = {
  id: string;
  caption: string | null;
};

export type BookFollowUp = {
  id: string;
  question: string | null;
  transcript: string | null;
  durationSec: number | null;
  hasAudio: boolean;
};

export type BookStory = {
  id: string;
  question: string | null;
  transcript: string | null;
  durationSec: number | null;
  hasAudio: boolean;
  bookSort: number | null;
  createdAt: string;
  photos: BookPhoto[];
  followUps: BookFollowUp[];
};

export type BookChapter = {
  category: string;
  stories: BookStory[];
};

export type Book = {
  storytellerId: string;
  storytellerName: string;
  language: "en" | "es"; // drives the voice-QR caption language in the printed book
  chapters: BookChapter[];
  storyCount: number;
};

export type BookStorytellerSummary = {
  id: string;
  name: string;
  storyCount: number;
};

// Pure: order the chapter categories that are actually present. Admin's saved
// order leads; anything not placed falls back to the canonical life-arc; truly
// unknown categories sort to the end alphabetically. Deduped, present-only.
export function sortChapters(present: string[], saved: string[] | null): string[] {
  const presentSet = new Set(present);
  const seen = new Set<string>();
  const result: string[] = [];
  const push = (c: string) => {
    if (presentSet.has(c) && !seen.has(c)) {
      seen.add(c);
      result.push(c);
    }
  };
  for (const c of saved ?? []) push(c);
  for (const c of CANONICAL_CHAPTER_ORDER) push(c);
  for (const c of [...present].sort((a, b) => a.localeCompare(b))) push(c);
  return result;
}

// PostgREST embeds a to-one relation as an object at runtime but the generated
// types widen it to an array — normalize either shape (same gotcha as stories.ts).
function one<T>(rel: unknown): T | null {
  if (Array.isArray(rel)) return (rel[0] as T) ?? null;
  return (rel as T) ?? null;
}

// Every storyteller in the family with how many stories are marked for the book
// — drives the /book picker. RLS scopes both reads to the caller's families.
export async function loadBookStorytellers(
  familyId: string,
): Promise<BookStorytellerSummary[]> {
  const sb = await supabaseServer();
  const [stRes, ansRes] = await Promise.all([
    sb
      .from("storytellers")
      .select("id, name")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true }),
    sb
      .from("answers")
      .select("storyteller_id")
      .eq("family_id", familyId)
      .eq("is_followup", false)
      .eq("in_book", true),
  ]);

  const counts = new Map<string, number>();
  for (const a of ansRes.data ?? []) {
    counts.set(a.storyteller_id, (counts.get(a.storyteller_id) ?? 0) + 1);
  }
  return (stRes.data ?? []).map((st) => ({
    id: st.id,
    name: st.name,
    storyCount: counts.get(st.id) ?? 0,
  }));
}

// One storyteller's keepsake: in-book stories grouped into ordered chapters,
// each story carrying its photos + follow-up thread. null = not in this family
// (a forged/cross-tenant id yields no storyteller row → 404 at the page).
export async function loadBook(
  familyId: string,
  storytellerId: string,
): Promise<Book | null> {
  const sb = await supabaseServer();

  const stRes = await sb
    .from("storytellers")
    .select("id, name, language, book_chapter_order")
    .eq("family_id", familyId)
    .eq("id", storytellerId)
    .maybeSingle();
  const st = stRes.data;
  if (!st) return null;

  // In-book top-level answers with category, photos, and the follow-up thread.
  const { data } = await sb
    .from("answers")
    .select(
      "id, question_text, transcript, duration_sec, audio_path, book_sort, created_at, " +
        "prompt:prompts(category), " +
        "photos:story_photos(id, caption, sort), " +
        "followups:answers!parent_answer_id(id, question_text, transcript, duration_sec, audio_path, created_at)",
    )
    .eq("family_id", familyId)
    .eq("storyteller_id", storytellerId)
    .eq("is_followup", false)
    .eq("in_book", true);

  type PhotoRow = { id: string; caption: string | null; sort: number };
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
    duration_sec: number | null;
    audio_path: string | null;
    book_sort: number | null;
    created_at: string;
    prompt: unknown;
    photos: unknown;
    followups: unknown;
  };

  // Group by category, building each story with its photos + thread.
  const byCategory = new Map<string, BookStory[]>();
  for (const a of (data ?? []) as unknown as StoryRow[]) {
    const category = one<{ category: string }>(a.prompt)?.category ?? "Other";
    const story: BookStory = {
      id: a.id,
      question: a.question_text ?? null,
      transcript: a.transcript ?? null,
      durationSec: a.duration_sec ?? null,
      hasAudio: !!a.audio_path,
      bookSort: a.book_sort ?? null,
      createdAt: a.created_at,
      photos: ((a.photos as PhotoRow[] | null) ?? [])
        .slice()
        .sort((x, y) => x.sort - y.sort || x.id.localeCompare(y.id))
        .map((p) => ({ id: p.id, caption: p.caption ?? null })),
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
    };
    const list = byCategory.get(category) ?? [];
    list.push(story);
    byCategory.set(category, list);
  }

  // Order stories within each chapter: manual book_sort first, then chronological.
  for (const list of byCategory.values()) {
    list.sort((a, b) => {
      if (a.bookSort != null && b.bookSort != null) return a.bookSort - b.bookSort;
      if (a.bookSort != null) return -1;
      if (b.bookSort != null) return 1;
      return a.createdAt.localeCompare(b.createdAt);
    });
  }

  const ordered = sortChapters([...byCategory.keys()], st.book_chapter_order);
  const chapters: BookChapter[] = ordered.map((category) => ({
    category,
    stories: byCategory.get(category) ?? [],
  }));
  const storyCount = [...byCategory.values()].reduce((n, l) => n + l.length, 0);

  return {
    storytellerId: st.id,
    storytellerName: st.name,
    language: st.language === "es" ? "es" : "en",
    chapters,
    storyCount,
  };
}
