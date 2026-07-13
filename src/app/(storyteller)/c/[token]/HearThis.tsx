"use client";

import { useEffect, useState } from "react";

// "Hear this" read-aloud for the authorization page (Elder-facing UX: every
// storyteller page reads its instructions aloud, tap-to-play). Uses the browser
// SpeechSynthesis API — no server, no cost, works without a cloned voice (which
// may not exist at consent time). Hides itself if the browser has no TTS.
export default function HearThis({
  text,
  lang,
  label,
  stopLabel,
}: {
  text: string;
  lang: "en" | "es";
  label: string;
  stopLabel: string;
}) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    // Stop any speech if the page unmounts.
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!supported) return null;

  function toggle() {
    const synth = window.speechSynthesis;
    if (synth.speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "es" ? "es-ES" : "en-US";
    u.rate = 0.95; // a touch slower for clarity
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.speak(u);
    setSpeaking(true);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-live="polite"
      className="inline-flex min-h-[60px] items-center gap-2 rounded-2xl border-2 border-line bg-paper px-6 text-[22px] font-bold text-ink shadow-sm active:translate-y-px"
    >
      {speaking ? stopLabel : label}
    </button>
  );
}
