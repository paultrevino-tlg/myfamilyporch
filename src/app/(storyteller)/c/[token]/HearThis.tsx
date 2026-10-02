"use client";

import { useEffect, useRef, useState } from "react";
import { playVoice, stopVoice, unlockAudio } from "@/lib/voice/player";

// "Read this to me" for the authorization page (Elder-facing UX: every
// storyteller page reads its instructions aloud).
//
// Speaks in the INTERVIEWER'S CLONED VOICE via api/consent/voice — the same
// familiar voice that will ask the questions later, heard at the moment the
// elder is deciding. Three layers so it never dead-ends:
//   1. cloned voice (or a neutral ElevenLabs voice if none is recorded yet)
//   2. the browser's own SpeechSynthesis, if that request fails
//   3. the large on-screen text, which is always the real backup channel
// The button only hides when there is nothing at all it could do.
//
// Plays through the shared storyteller player (2.10): the tap on this button
// (or on "Yes, text me") unlocks it, and the player survives the form's
// client-side redirect — so the confirmation screen reads itself, no tap.
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
  // Speak on arrival (the confirmation screen). Works once the elder has tapped
  // anything on the page before it; on a cold load the button plays it.
  autoPlay?: boolean;
}) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const [canSpeak, setCanSpeak] = useState(true);
  const playIdRef = useRef<number | null>(null);
  // Bumped on every play/stop. A fetch that resolves after its generation is
  // stale must not start playing — otherwise tapping "stop" while it's still
  // loading looks like it worked, then the audio starts anyway.
  const genRef = useRef(0);

  // Stop any audio/speech when the page goes away.
  useEffect(() => {
    return () => {
      stopVoice(playIdRef.current);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function stopAll() {
    genRef.current += 1; // abandon any in-flight synthesis
    stopVoice(playIdRef.current);
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
    // Must run synchronously in the tap, before any await.
    if (gestured) unlockAudio();
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

      const id = await playVoice(blob, () => setState("idle"));
      if (genRef.current !== gen) {
        stopVoice(id);
        return;
      }
      if (id == null) throw new Error("playback refused");
      playIdRef.current = id;
      setState("playing");
    } catch {
      if (genRef.current !== gen) return; // stopped while we were loading
      if (!gestured) {
        // Almost certainly an autoplay block. Go quiet and leave the button.
        setState("idle");
        return;
      }
      // Network, 401/502, decode failure — the browser voice may still work.
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
