"use client";

import { useRef, useState } from "react";

// A compact tap-to-play control for a single answer's audio. Audio streams from
// /api/stories/audio?answer={id}, which mints a short-lived signed URL only after
// a membership check (RLS is the real guard) — we never touch Storage directly.
//
// When there's no recording, the icon stays visible but greyed and inert, so the
// absence reads as "nothing to play here" rather than a missing feature.
export default function PlayAudioButton({
  answerId,
  hasAudio,
  className = "",
}: {
  answerId: string;
  hasAudio: boolean;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  if (!hasAudio) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="No audio available"
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-ink/25 cursor-not-allowed ${className}`}
      >
        <PlayIcon />
        <span className="sr-only">No audio available</span>
      </button>
    );
  }

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
    } else {
      el.pause();
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? "Pause audio" : "Play audio"}
      title={playing ? "Pause audio" : "Play audio"}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-accent transition-colors hover:bg-accent/10 ${className}`}
    >
      {playing ? <PauseIcon /> : <PlayIcon />}
      <audio
        ref={audioRef}
        preload="none"
        src={`/api/stories/audio?answer=${answerId}`}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
    </button>
  );
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}
