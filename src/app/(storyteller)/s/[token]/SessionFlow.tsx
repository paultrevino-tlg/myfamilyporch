"use client";

import { useState } from "react";
import { t, type Lang } from "@/lib/i18n";

// The storyteller's voice session as a client-side state machine. Matches
// docs/prototypes/storyteller-flow.html: Welcome → Question → Your turn →
// AI follow-up → Your turn → Done. (The prototype's screen 0 is the SMS nudge,
// which is external — Phase 4.3 — so this surface opens on Welcome.)
//
// Elder-facing UX: one full-screen step at a time, one big single-tap action,
// always a forgiving exit, never a dead-end. See SPEC § Elder-facing UX.
//
// SEAMS for later tasks — kept deliberately inert here:
//  - Mic priming + denial recovery  → 2.4
//  - Real audio capture + answer write (api/storyteller/answer) → 2.5
//  - Real question + AI follow-up text (placeholders for now) → 3.1 / 3.2
//  - Cloned-voice playback (the voice chip is visual only) → 4.2
//  - {address} term resolution (we greet by name for now) → 3.1

type Step =
  | "welcome"
  | "question"
  | "answer1"
  | "followup"
  | "answer2"
  | "done"
  | "closed";

export default function SessionFlow({
  name,
  language,
}: {
  name: string;
  language: string;
}) {
  const lang: Lang = language === "es" ? "es" : "en";
  const [step, setStep] = useState<Step>("welcome");
  const tr = (key: string, vars?: Record<string, string>) => t(lang, key, vars);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 py-10 text-ink">
      <div className="flex w-full max-w-md flex-1 flex-col">
        {step === "welcome" && (
          <Screen>
            <Avatar>👋</Avatar>
            <DisplayText>{tr("greeting", { address: name })}</DisplayText>
            <Hint>{tr("welcome_sub")}</Hint>
            <Spacer />
            <BigButton onClick={() => setStep("question")}>
              {tr("lets_talk")}
            </BigButton>
            <QuietButton onClick={() => setStep("closed")}>
              {tr("maybe_later")}
            </QuietButton>
          </Screen>
        )}

        {step === "question" && (
          <Screen>
            <SpeakingAvatar />
            <Label>{tr("q_label")}</Label>
            <DisplayText>{tr("q_placeholder")}</DisplayText>
            <VoiceChip>{tr("voice_chip")}</VoiceChip>
            <Spacer />
            {/* 4.2: question audio plays in the cloned voice; text is the backup channel. */}
            <BigButton accent onClick={() => setStep("answer1")}>
              {tr("ready_to_answer")}
            </BigButton>
          </Screen>
        )}

        {step === "answer1" && (
          <AnswerScreen
            listening={tr("listening")}
            title={tr("your_turn")}
            hint={tr("take_time")}
            finishedLabel={tr("finished")}
            onFinished={() => setStep("followup")}
            skipLabel={tr("skip")}
            onSkip={() => setStep("done")}
          />
        )}

        {step === "followup" && (
          <Screen>
            <SpeakingAvatar />
            <FollowTag>{tr("follow_tag")}</FollowTag>
            <DisplayText>{tr("follow_placeholder")}</DisplayText>
            <VoiceChip>{tr("voice_chip")}</VoiceChip>
            <Spacer />
            <BigButton accent onClick={() => setStep("answer2")}>
              {tr("ready_to_answer")}
            </BigButton>
          </Screen>
        )}

        {step === "answer2" && (
          <AnswerScreen
            listening={tr("listening")}
            title={tr("your_turn_again")}
            hint={tr("no_rush")}
            finishedLabel={tr("finished")}
            onFinished={() => setStep("done")}
          />
        )}

        {step === "done" && (
          <Screen>
            <Check />
            <DisplayText>{tr("done_title")}</DisplayText>
            <Hint>{tr("done_sub")}</Hint>
            <Count>{tr("done_count")}</Count>
            <Spacer />
            <BigButton onClick={() => setStep("closed")}>
              {tr("done_btn")}
            </BigButton>
          </Screen>
        )}

        {step === "closed" && (
          <Screen>
            <Avatar>❤️</Avatar>
            <DisplayText>{tr("done_sub")}</DisplayText>
          </Screen>
        )}
      </div>
    </main>
  );
}

// --- Answer screen (shared so the two "Your turn" steps are identical) --------
// Radical consistency keeps it effortless. Recording itself is wired in 2.4/2.5.

function AnswerScreen({
  listening,
  title,
  hint,
  finishedLabel,
  onFinished,
  skipLabel,
  onSkip,
}: {
  listening: string;
  title: string;
  hint: string;
  finishedLabel: string;
  onFinished: () => void;
  skipLabel?: string;
  onSkip?: () => void;
}) {
  return (
    <Screen>
      <Mic />
      <Label answer>{listening}</Label>
      <DisplayText>{title}</DisplayText>
      <Hint>{hint}</Hint>
      <Spacer />
      {/* 2.5: capture audio while this screen is up; "I'm finished" stops + uploads. */}
      <BigButton onClick={onFinished}>{finishedLabel}</BigButton>
      {skipLabel && onSkip && (
        <QuietButton onClick={onSkip}>{skipLabel}</QuietButton>
      )}
    </Screen>
  );
}

// --- Presentational pieces ----------------------------------------------------

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      {children}
    </div>
  );
}

function Spacer() {
  return <div className="flex-1" />;
}

function DisplayText({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="font-[family-name:var(--font-serif)] text-3xl font-semibold leading-snug">
      {children}
    </h1>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-lg leading-relaxed text-ink/70">{children}</p>;
}

function Label({
  children,
  answer = false,
}: {
  children: React.ReactNode;
  answer?: boolean;
}) {
  return (
    <p
      className={`text-sm font-bold uppercase tracking-widest ${
        answer ? "text-answer" : "text-accent"
      }`}
    >
      {children}
    </p>
  );
}

function FollowTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm font-bold text-accent">
      {children}
    </span>
  );
}

function VoiceChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-black/[0.03] px-4 py-2 text-base text-ink/70">
      <span className="flex h-4 items-end gap-0.5" aria-hidden>
        <i className="w-1 animate-pulse rounded-sm bg-accent" style={{ height: "60%" }} />
        <i className="w-1 animate-pulse rounded-sm bg-accent" style={{ height: "100%", animationDelay: "0.15s" }} />
        <i className="w-1 animate-pulse rounded-sm bg-accent" style={{ height: "40%", animationDelay: "0.3s" }} />
        <i className="w-1 animate-pulse rounded-sm bg-accent" style={{ height: "80%", animationDelay: "0.45s" }} />
      </span>
      {children}
    </span>
  );
}

function Count({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-ink/15 bg-black/[0.03] px-4 py-2 text-base text-ink/70">
      {children}
    </span>
  );
}

function Avatar({ children }: { children: React.ReactNode }) {
  // Placeholder family/interviewer mark; 3.1/4.2 swap in the real interviewer.
  return (
    <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent/70 text-5xl shadow-lg">
      {children}
    </div>
  );
}

function SpeakingAvatar() {
  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <span className="absolute h-28 w-28 animate-ping rounded-full border-2 border-accent/50" />
      <Avatar>🏡</Avatar>
    </div>
  );
}

function Mic() {
  return (
    <div className="flex h-32 w-32 animate-pulse items-center justify-center rounded-full bg-answer shadow-lg">
      <svg viewBox="0 0 24 24" className="h-14 w-14 fill-white" aria-hidden>
        <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" />
      </svg>
    </div>
  );
}

function Check() {
  return (
    <div className="flex h-28 w-28 items-center justify-center rounded-full bg-answer shadow-lg">
      <svg viewBox="0 0 24 24" className="h-14 w-14" aria-hidden>
        <path
          d="M4 12l6 6L20 6"
          fill="none"
          stroke="white"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function BigButton({
  children,
  onClick,
  accent = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-3xl px-6 py-6 text-2xl font-bold text-white shadow-lg transition active:scale-[0.98] ${
        accent ? "bg-accent" : "bg-answer"
      }`}
    >
      {children}
    </button>
  );
}

function QuietButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full py-4 text-lg text-ink/60 underline underline-offset-4"
    >
      {children}
    </button>
  );
}
