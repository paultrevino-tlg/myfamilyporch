"use client";

import { unlockAudio } from "@/lib/voice/player";

// The "Yes, text me" submit button. Its only job beyond submitting is to unlock
// the shared voice player on the tap (2.10), so the confirmation screen that
// follows the form's redirect can read itself aloud without another tap.
export default function AgreeButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      onClick={() => unlockAudio()}
      className="min-h-[64px] w-full rounded-2xl bg-brand px-6 text-2xl font-bold text-white shadow-sm active:translate-y-px"
    >
      {label}
    </button>
  );
}
