"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import PlayAudioButton from "../PlayAudioButton";
import VoiceQrTag from "./VoiceQrTag";
import type { Book, BookChapter, BookStory, BookPhoto } from "@/lib/book";
import type { VoiceQr } from "@/lib/book/voice-qr";
import {
  reorderChapters,
  reorderStories,
  reorderPhotos,
  removePhoto,
  setPhotoCaption,
} from "./actions";

// Admin keepsake editor (TODO 7.1). Drag-and-drop (native HTML5 — no library)
// to arrange chapters, stories within a chapter, and photos within a story; a
// grip ⠿ is the handle. Every reorder also has a keyboard-accessible Move
// up/down fallback so it isn't mouse-only. Optimistic local state; each change
// persists through a server action (RLS admin-write is the real boundary).

function move<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

type Drag =
  | { kind: "chapter"; chapter: number }
  | { kind: "story"; chapter: number; index: number }
  | { kind: "photo"; chapter: number; story: number; index: number }
  | null;

export default function BookEditor({
  book,
  qrs,
}: {
  book: Book;
  qrs: Record<string, VoiceQr>;
}) {
  const [chapters, setChapters] = useState<BookChapter[]>(book.chapters);
  const [, startTransition] = useTransition();
  const drag = useRef<Drag>(null);
  const router = useRouter();
  const sid = book.storytellerId;

  // --- chapter order -------------------------------------------------------
  function commitChapters(next: BookChapter[]) {
    setChapters(next);
    startTransition(() => reorderChapters(sid, next.map((c) => c.category)));
  }
  function moveChapter(from: number, to: number) {
    const next = move(chapters, from, to);
    if (next !== chapters) commitChapters(next);
  }

  // --- story order (within a chapter) -------------------------------------
  function commitStories(chapterIdx: number, stories: BookStory[]) {
    const next = chapters.map((c, i) => (i === chapterIdx ? { ...c, stories } : c));
    setChapters(next);
    startTransition(() => reorderStories(sid, stories.map((s) => s.id)));
  }
  function moveStory(chapterIdx: number, from: number, to: number) {
    const stories = move(chapters[chapterIdx].stories, from, to);
    if (stories !== chapters[chapterIdx].stories) commitStories(chapterIdx, stories);
  }

  // --- photo order (within a story) ---------------------------------------
  function commitPhotos(chapterIdx: number, storyIdx: number, photos: BookPhoto[]) {
    const next = chapters.map((c, ci) =>
      ci !== chapterIdx
        ? c
        : { ...c, stories: c.stories.map((s, si) => (si === storyIdx ? { ...s, photos } : s)) },
    );
    setChapters(next);
    startTransition(() => reorderPhotos(sid, photos.map((p) => p.id)));
  }
  function movePhoto(chapterIdx: number, storyIdx: number, from: number, to: number) {
    const photos = move(chapters[chapterIdx].stories[storyIdx].photos, from, to);
    if (photos !== chapters[chapterIdx].stories[storyIdx].photos) {
      commitPhotos(chapterIdx, storyIdx, photos);
    }
  }

  // --- drop dispatch -------------------------------------------------------
  function onDropChapter(to: number) {
    const d = drag.current;
    drag.current = null;
    if (d?.kind === "chapter") moveChapter(d.chapter, to);
  }
  function onDropStory(chapterIdx: number, to: number) {
    const d = drag.current;
    drag.current = null;
    if (d?.kind === "story" && d.chapter === chapterIdx) moveStory(chapterIdx, d.index, to);
  }
  function onDropPhoto(chapterIdx: number, storyIdx: number, to: number) {
    const d = drag.current;
    drag.current = null;
    if (d?.kind === "photo" && d.chapter === chapterIdx && d.story === storyIdx) {
      movePhoto(chapterIdx, storyIdx, d.index, to);
    }
  }

  if (chapters.length === 0) {
    return (
      <div className="card px-4 py-10 text-center text-sm text-ink/50">
        No stories are in the book yet. On the{" "}
        <a href="/stories" className="font-semibold text-accent hover:underline">
          Stories
        </a>{" "}
        page, tap <b>Add to the book</b> on the ones you want to keep.
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {chapters.map((chapter, ci) => (
        <section
          key={chapter.category}
          className="card overflow-hidden"
          onDragOver={(e) => {
            if (drag.current?.kind === "chapter") e.preventDefault();
          }}
          onDrop={() => onDropChapter(ci)}
        >
          {/* Chapter header — drag handle for chapter order */}
          <div
            draggable
            onDragStart={() => (drag.current = { kind: "chapter", chapter: ci })}
            className="flex items-center gap-2 border-b border-line bg-ink/[0.02] px-4 py-3"
          >
            <Grip title="Drag to reorder chapters" />
            <h3 className="font-serif text-lg font-semibold text-accent">{chapter.category}</h3>
            <span className="ml-1 text-xs text-ink/40">
              {chapter.stories.length} {chapter.stories.length === 1 ? "story" : "stories"}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <MoveBtn dir="up" disabled={ci === 0} onClick={() => moveChapter(ci, ci - 1)} />
              <MoveBtn
                dir="down"
                disabled={ci === chapters.length - 1}
                onClick={() => moveChapter(ci, ci + 1)}
              />
            </div>
          </div>

          <ul className="divide-y divide-line">
            {chapter.stories.map((story, si) => (
              <li
                key={story.id}
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  drag.current = { kind: "story", chapter: ci, index: si };
                }}
                onDragOver={(e) => {
                  if (drag.current?.kind === "story" && drag.current.chapter === ci)
                    e.preventDefault();
                }}
                onDrop={(e) => {
                  e.stopPropagation();
                  onDropStory(ci, si);
                }}
                className="px-4 py-4"
              >
                <div className="flex items-start gap-2">
                  <Grip title="Drag to reorder stories" className="mt-1" />
                  <PlayAudioButton answerId={story.id} hasAudio={story.hasAudio} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-serif text-base leading-snug">
                      {story.question ?? "Untitled story"}
                    </div>
                    {story.transcript && (
                      <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-ink/65">
                        {story.transcript}
                      </p>
                    )}

                    <PhotoStrip
                      story={story}
                      onUploaded={() => router.refresh()}
                      onRemove={(photoId) =>
                        startTransition(async () => {
                          await removePhoto(sid, photoId);
                          router.refresh();
                        })
                      }
                      onCaption={(photoId, caption) =>
                        startTransition(() => setPhotoCaption(sid, photoId, caption))
                      }
                      onMovePhoto={(from, to) => movePhoto(ci, si, from, to)}
                      onPhotoDragStart={(index) =>
                        (drag.current = { kind: "photo", chapter: ci, story: si, index })
                      }
                      onPhotoDragOver={(e) => {
                        const d = drag.current;
                        if (d?.kind === "photo" && d.chapter === ci && d.story === si)
                          e.preventDefault();
                      }}
                      onPhotoDrop={(index) => onDropPhoto(ci, si, index)}
                    />
                    <VoiceQrTag qr={qrs[story.id]} name={book.storytellerName} lang={book.language} />
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <MoveBtn dir="up" disabled={si === 0} onClick={() => moveStory(ci, si, si - 1)} />
                    <MoveBtn
                      dir="down"
                      disabled={si === chapter.stories.length - 1}
                      onClick={() => moveStory(ci, si, si + 1)}
                    />
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

function PhotoStrip({
  story,
  onUploaded,
  onRemove,
  onCaption,
  onMovePhoto,
  onPhotoDragStart,
  onPhotoDragOver,
  onPhotoDrop,
}: {
  story: BookStory;
  onUploaded: () => void;
  onRemove: (photoId: string) => void;
  onCaption: (photoId: string, caption: string) => void;
  onMovePhoto: (from: number, to: number) => void;
  onPhotoDragStart: (index: number) => void;
  onPhotoDragOver: (e: React.DragEvent) => void;
  onPhotoDrop: (index: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("answer_id", story.id);
      for (const f of Array.from(files)) form.append("photos", f);
      const res = await fetch("/api/book/photo", { method: "POST", body: form });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Upload failed");
      } else {
        onUploaded();
      }
    } catch {
      setError("Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mt-3">
      {story.photos.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {story.photos.map((photo, pi) => (
            <li
              key={photo.id}
              draggable
              onDragStart={(e) => {
                e.stopPropagation();
                onPhotoDragStart(pi);
              }}
              onDragOver={onPhotoDragOver}
              onDrop={(e) => {
                e.stopPropagation();
                onPhotoDrop(pi);
              }}
              className="w-28"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/book/photo?id=${photo.id}`}
                alt={photo.caption ?? "Story photo"}
                className="h-24 w-28 cursor-grab rounded-lg border border-line object-cover"
              />
              <div className="mt-1 flex items-center justify-between gap-1">
                <div className="flex gap-0.5">
                  <MoveBtn dir="up" small disabled={pi === 0} onClick={() => onMovePhoto(pi, pi - 1)} />
                  <MoveBtn
                    dir="down"
                    small
                    disabled={pi === story.photos.length - 1}
                    onClick={() => onMovePhoto(pi, pi + 1)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(photo.id)}
                  title="Remove photo"
                  className="rounded px-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
              <input
                type="text"
                defaultValue={photo.caption ?? ""}
                placeholder="Caption…"
                onBlur={(e) => {
                  if ((e.target.value.trim() || "") !== (photo.caption ?? ""))
                    onCaption(photo.id, e.target.value);
                }}
                className="input mt-1 w-28 px-2 py-1 text-xs"
              />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-ink/5 disabled:opacity-50"
        >
          {busy ? "Adding…" : "􀏅 Add a photo"}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => void upload(e.target.files)}
        />
      </div>
    </div>
  );
}

function Grip({ title, className = "" }: { title: string; className?: string }) {
  return (
    <span title={title} className={`cursor-grab select-none text-base leading-none text-ink/30 ${className}`}>
      ⠿
    </span>
  );
}

function MoveBtn({
  dir,
  onClick,
  disabled,
  small,
}: {
  dir: "up" | "down";
  onClick: () => void;
  disabled?: boolean;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "up" ? "Move up" : "Move down"}
      title={dir === "up" ? "Move up" : "Move down"}
      className={`grid place-items-center rounded border border-line text-ink/50 hover:bg-ink/5 disabled:opacity-30 ${
        small ? "h-5 w-5 text-[10px]" : "h-6 w-6 text-xs"
      }`}
    >
      {dir === "up" ? "▲" : "▼"}
    </button>
  );
}
