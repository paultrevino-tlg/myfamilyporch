"use client";

import { useEffect, useRef } from "react";

// The primary story's audio player on the public voice-QR play page. Same
// visible <audio controls> as before, but it attempts to start playing on
// mount so a visitor who taps the book's QR hears the recording right away.
// Browsers (notably iOS Safari / mobile Chrome) block autoplay-with-sound
// without a prior gesture on the page; we swallow that rejection and leave the
// controls visible so the visitor just taps play — never a dead-end.
export default function AutoPlayAudio({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // .play() returns a promise that rejects when the browser blocks autoplay.
    // Ignore it — the visible controls are the fallback.
    void el.play().catch(() => {});
  }, []);

  return (
    <audio ref={ref} controls autoPlay preload="auto" className={className} src={src} />
  );
}
