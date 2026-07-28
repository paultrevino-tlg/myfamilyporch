"use client";

import { useEffect, useRef, useState } from "react";

// "Read this to me" for the authorization page (Elder-facing UX: every
// storyteller page reads its instructions aloud, tap-to-play).
//
// Speaks in the INTERVIEWER'S CLONED VOICE via api/consent/voice — the same
// familiar voice that will ask the questions later, heard at the moment the
// elder is deciding. Three layers so it never dead-ends:
//   1. cloned voice (or a neutral ElevenLabs voice if none is recorded yet)
//   2. the browser's own SpeechSynthesis, if that request fails
//   3. the large on-screen text, which is always the real backup channel
// The button only hides when there is nothing at all it could do.
export default function HearThis({
  token,
  text,
  lang,
  label,
  loadingLabel,
  stopLabel,
  variant = "consent",
  autoPlay = false,
}: {
  token: string;
  text: string;
  lang: "en" | "es";
  label: string;
  loadingLabel: string;
  stopLabel: string;
  variant?: "consent" | "success";
  // Try to speak on arrival (the confirmation screen). Browsers block audio
  // without a user gesture, and the tap that submitted the form does NOT carry
  // across the redirect — so on iOS this will usually be refused and the button
  // below is what actually plays it. Treated as a bonus, never a guarantee.
  autoPlay?: boolean;
}) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const [canSpeak, setCanSpeak] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  // Bumped on every play/stop. A fetch that resolves after its generation is
  // stale must not start playing — otherwise tapping "stop" while it's still
  // loading looks like it worked, then the audio starts anyway.
  const genRef = useRef(0);

  // Release the object URL and stop any audio/speech when the page goes away.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function stopAll() {
    genRef.current += 1; // abandon any in-flight synthesis
    audioRef.current?.pause();
    audioRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setState("idle");
  }

  // Last resort: the browser's built-in voice. Returns false when unavailable,
  // so the caller can hide a button that could never do anything.
  function speakLocally(): boolean {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "es" ? "es-ES" : "en-US";
    u.rate = 0.95; // a touch slower for clarity
    u.onend = () => setState("idle");
    u.onerror = () => setState("idle");
    window.speechSynthesis.speak(u);
    setState("playing");
    return true;
  }

  // `gestured` = the user tapped. An autoplay refusal is an expected outcome,
  // not a failure of the feature — the button IS the fallback, so it must stay
  // visible and we must not chase it with the browser voice (also gesture-gated).
  async function play(gestured: boolean) {
    if (state !== "idle") {
      stopAll();
      return;
    }
    const gen = ++genRef.current;
    setState("loading");
    try {
      const res = await fetch("/api/consent/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, lang, variant }),
      });
      if (!res.ok) throw new Error(String(res.status));

      const blob = await res.blob();
      if (genRef.current !== gen) return; // stopped while we were loading

      const url = URL.createObjectURL(blob);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setState("idle");
      audio.onerror = () => {
        // Decode/playback failure — fall through to the browser voice.
        if (!gestured || !speakLocally()) setState("idle");
      };
      await audio.play();
      setState("playing");
    } catch {
      if (genRef.current !== gen) return; // stopped while we were loading
      if (!gestured) {
        // Almost certainly an autoplay block. Go quiet and leave the button.
        setState("idle");
        return;
      }
      // Network, 401/502 — the browser voice may still work, and we're inside a
      // tap handler so it's user-gestured.
      if (!speakLocally()) {
        setCanSpeak(false);
        setState("idle");
      }
    }
  }

  // Speak on arrival where the browser allows it. Runs once; if it's refused,
  // nothing is shown to the user beyond the button that was already there.
  const autoTried = useRef(false);
  useEffect(() => {
    if (!autoPlay || autoTried.current) return;
    autoTried.current = true;
    void play(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay]);

  if (!canSpeak) return null;

  return (
    <button
      type="button"
      onClick={() => play(true)}
      aria-live="polite"
      aria-busy={state === "loading"}
      className="inline-flex min-h-[72px] w-full max-w-md items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-8 text-[24px] font-bold text-white shadow-md transition active:translate-y-px hover:bg-emerald-700"
    >
      {state === "playing" ? stopLabel : state === "loading" ? loadingLabel : label}
    </button>
  );
}
