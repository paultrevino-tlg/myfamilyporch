import { redirect, notFound } from "next/navigation";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";
import { loadBook } from "@/lib/book";
import { buildVoiceQrs, type VoiceQr } from "@/lib/book/voice-qr";
import PlayAudioButton from "../../PlayAudioButton";
import BookEditor from "../BookEditor";
import VoiceQrTag from "../VoiceQrTag";

// One storyteller's keepsake (TODO 7.1). Admins get the drag-and-drop editor
// (arrange chapters/stories, attach photos); viewers get a calm read-only
// rendering. RLS scopes the load to the active family; a cross-family id → 404.
export default async function BookForStorytellerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const active = await getActiveMembership();
  if (!active) redirect("/onboarding");
  const { id } = await params;

  const book = await loadBook(active.family_id, id);
  if (!book) notFound();

  const canManage = roleAtLeast(active.role, "admin");

  // Voice QRs for every in-book story (TODO 7.2) — built server-side so the
  // inline SVGs print sharp and the play token never reaches the client unminted.
  const storyIds = book.chapters.flatMap((c) => c.stories.map((s) => s.id));
  const qrs = await buildVoiceQrs(storyIds);

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">The keepsake</h1>
          <p className="mt-1.5 text-sm text-ink/55">
            Everything marked &ldquo;in the book,&rdquo; arranged into chapters
            {canManage ? ". Drag to reorder, and attach photos." : "."}
          </p>
        </div>
        <a href="/book" className="text-sm font-semibold text-accent hover:underline">
          ← All books
        </a>
      </div>

      {/* Book cover — derived, no schema. */}
      <div className="mt-6 rounded-2xl bg-gradient-to-br from-[#3a2c1c] to-[#5a4327] px-6 py-7 text-[#f3e7d2] shadow-sm">
        <div className="text-xs uppercase tracking-[0.18em] text-[#cdbb9c]">
          The life &amp; stories of
        </div>
        <div className="mt-1 font-serif text-3xl font-semibold leading-tight">
          {book.storytellerName}
        </div>
        <div className="mt-3 text-sm text-[#cdbb9c]">
          {book.storyCount} {book.storyCount === 1 ? "story" : "stories"} · in their own voice
        </div>
      </div>

      <div className="mt-7">
        {canManage ? (
          <BookEditor book={book} qrs={qrs} />
        ) : (
          <ReadOnlyBook book={book} qrs={qrs} />
        )}
      </div>
    </main>
  );
}

// Viewer rendering: chapters + stories + photos, no controls. Server component.
function ReadOnlyBook({
  book,
  qrs,
}: {
  book: Awaited<ReturnType<typeof loadBook>>;
  qrs: Record<string, VoiceQr>;
}) {
  if (!book || book.chapters.length === 0) {
    return (
      <div className="card px-4 py-10 text-center text-sm text-ink/50">
        Nothing is in the book yet.
      </div>
    );
  }
  return (
    <div className="space-y-7">
      {book.chapters.map((chapter) => (
        <section key={chapter.category} className="card overflow-hidden">
          <div className="border-b border-line bg-ink/[0.02] px-4 py-3">
            <h3 className="font-serif text-lg font-semibold text-accent">{chapter.category}</h3>
          </div>
          <ul className="divide-y divide-line">
            {chapter.stories.map((story) => (
              <li key={story.id} className="px-4 py-4">
                <div className="flex items-start gap-2">
                  <PlayAudioButton answerId={story.id} hasAudio={story.hasAudio} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-serif text-base leading-snug">
                      {story.question ?? "Untitled story"}
                    </div>
                    {story.transcript && (
                      <p className="mt-1 text-sm leading-relaxed text-ink/70">{story.transcript}</p>
                    )}
                    {story.photos.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-3">
                        {story.photos.map((photo) => (
                          <li key={photo.id} className="w-28">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`/api/book/photo?id=${photo.id}`}
                              alt={photo.caption ?? "Story photo"}
                              className="h-24 w-28 rounded-lg border border-line object-cover"
                            />
                            {photo.caption && (
                              <div className="mt-1 text-xs text-ink/50">{photo.caption}</div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    <VoiceQrTag qr={qrs[story.id]} name={book.storytellerName} lang={book.language} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
