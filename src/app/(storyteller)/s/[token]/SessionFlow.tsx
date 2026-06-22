"use client";

import { Children, isValidElement, useEffect, useRef, useState } from "react";
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
//  - Cloned-voice playback (the voice chip is visual only) → 4.2
// LIVE as of 2.5: the two "Your turn" screens record real audio and upload it to
// api/storyteller/answer, which stores it privately and writes the answer row.
// LIVE as of 3.1: the greeting uses the resolved address term and the opening
// question is a real library prompt (server-assembled), recorded with its
// prompt_id. Both fall back to placeholders if assembly returned nothing.
// LIVE as of 3.2: after the opening answer saves, we fetch one follow-up from
// api/ai/interview (AI once a transcript exists — 3.4 — else a pre-authored
// follow-up). Falls back to the gentle generic placeholder if nothing returns.

type Step =
  | "welcome"
  | "prime"
  | "denied"
  | "question"
  | "answer1"
  | "followup"
  | "answer2"
  | "done"
  | "closed";

export default function SessionFlow({
  token,
  name,
  language,
  address,
  question,
  promptId,
}: {
  token: string;
  name: string;
  language: string;
  address?: string | null;
  question?: string | null;
  promptId?: string | null;
}) {
  const lang: Lang = language === "es" ? "es" : "en";
  const [step, setStep] = useState<Step>("welcome");
  const tr = (key: string, vars?: Record<string, string>) => t(lang, key, vars);

  // Resolved from session assembly (3.1); fall back so the flow never blanks.
  const greetAddress = address || name;
  const openingQuestion = question || tr("q_placeholder");

  // The follow-up question, fetched from api/ai/interview after the opening
  // answer is saved (3.2). Null until fetched (or if generation yields nothing) —
  // the follow-up screen then keeps a gentle generic placeholder.
  const [followUpQuestion, setFollowUpQuestion] = useState<string | null>(null);
  const followUpText = followUpQuestion || tr("follow_placeholder");

  // The captured answers ground in a session and thread together. The first
  // answer's POST returns these; later answers send them back so the follow-up
  // links to its parent and reuses the same session.
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [firstAnswerId, setFirstAnswerId] = useState<string | null>(null);

  // Mic-failed beacon (TODO 2.4). Fire-and-forget; the elder's flow never waits
  // on it. Used both when priming is denied and if capture later fails to start.
  function beaconMicFailed() {
    setStep("denied");
    try {
      void fetch("/api/storyteller/mic-failed", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, user_agent: navigator.userAgent }),
        keepalive: true,
      });
    } catch {
      // ignore — best effort
    }
  }

  // Prime the mic (TODO 2.4). iOS gives one clean shot, so we ask only after the
  // friendly priming screen. On grant we stop the tracks immediately — real
  // capture re-acquires per answer screen (2.5) — and proceed. On denial we drop
  // to the calm recovery screen and beacon a mic-failed signal.
  async function requestMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((tk) => tk.stop());
      setStep("question");
    } catch {
      beaconMicFailed();
    }
  }

  // Upload one captured answer to the service-role route (TODO 2.5). Fail-soft:
  // a null/empty blob (skip, or capture that never started) uploads nothing, and
  // a network/server error never strands the elder — we log and let them move on.
  async function uploadAnswer(
    blob: Blob | null,
    durationSec: number,
    opts: { isFollowup: boolean; isFinal: boolean },
  ): Promise<string | null> {
    if (!blob || blob.size === 0) return null;
    const fd = new FormData();
    fd.set("token", token);
    fd.set("audio", blob, `answer.${blob.type.includes("mp4") ? "mp4" : "webm"}`);
    fd.set("is_followup", String(opts.isFollowup));
    fd.set("final", String(opts.isFinal));
    fd.set("lang", lang);
    fd.set("duration_sec", String(durationSec));
    // Opening = the assembled library prompt (3.1); follow-up = the question we
    // fetched from api/ai/interview (3.2). prompt_id rides along for the opening
    // so the answer row links back to the coverage backbone.
    fd.set("question_text", opts.isFollowup ? followUpText : openingQuestion);
    if (!opts.isFollowup && promptId) fd.set("prompt_id", promptId);
    if (sessionId) fd.set("session_id", sessionId);
    if (opts.isFollowup && firstAnswerId) fd.set("parent_answer_id", firstAnswerId);
    try {
      const res = await fetch("/api/storyteller/answer", { method: "POST", body: fd });
      if (res.ok) {
        const data = (await res.json()) as { session_id?: string; answer_id?: string };
        if (data.session_id) setSessionId(data.session_id);
        if (!opts.isFollowup && data.answer_id) setFirstAnswerId(data.answer_id);
        return data.answer_id ?? null;
      }
      console.error("[storyteller] answer upload rejected", res.status);
    } catch (e) {
      console.error("[storyteller] answer upload failed", e);
    }
    return null;
  }

  // Ask the interview brain (3.2) for one natural follow-up to the opening answer.
  // Fail-soft: any miss leaves followUpQuestion null and the screen shows the
  // gentle generic placeholder — the elder is never stranded.
  async function fetchFollowUp(answerId: string | null) {
    if (!answerId) return;
    try {
      const res = await fetch("/api/ai/interview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, answer_id: answerId }),
      });
      if (res.ok) {
        const data = (await res.json()) as { question?: string | null };
        if (data.question) setFollowUpQuestion(data.question);
      }
    } catch (e) {
      console.error("[storyteller] follow-up fetch failed", e);
    }
  }

  return (
    // lang drives screen-reader pronunciation for the whole flow (TODO 2.6).
    // Assistive tech honors lang on any element and it inherits to descendants,
    // so the per-storyteller language (en/es) is announced correctly even though
    // the root <html lang> can't know the token's language.
    <main
      lang={lang}
      className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 py-8 text-ink"
    >
      <div className="flex w-full max-w-md flex-1 flex-col">
        {step === "welcome" && (
          <WelcomeScreen
            token={token}
            lang={lang}
            greeting={tr("greeting", { address: greetAddress })}
            sub={tr("welcome_sub")}
            ctaLabel={tr("welcome_cta")}
            playingLabel={tr("playing_question")}
            talkLabel={tr("lets_talk")}
            laterLabel={tr("maybe_later")}
            onContinue={() => setStep("prime")}
            onDecline={() => setStep("closed")}
          />
        )}

        {step === "prime" && (
          <Screen>
            <Mic />
            <DisplayText>{tr("mic_prime_title")}</DisplayText>
            <Hint>{tr("mic_prime_sub")}</Hint>
            <QuestionVoice
              token={token}
              text={`${tr("mic_prime_title")}. ${tr("mic_prime_sub")}`}
              lang={lang}
              chipLabel={tr("voice_chip")}
              hearLabel={tr("hear_question")}
              playingLabel={tr("playing_question")}
            />
            <Spacer />
            <BigButton accent onClick={requestMic}>
              {tr("mic_prime_btn")}
            </BigButton>
          </Screen>
        )}

        {step === "denied" && (
          <Screen>
            <Avatar>🎤</Avatar>
            <DisplayText>{tr("mic_denied_title")}</DisplayText>
            <Hint>{tr("mic_denied_sub")}</Hint>
            <QuestionVoice
              token={token}
              text={`${tr("mic_denied_title")}. ${tr("mic_denied_sub")}`}
              lang={lang}
              chipLabel={tr("voice_chip")}
              hearLabel={tr("hear_question")}
              playingLabel={tr("playing_question")}
            />
            <Spacer />
            <BigButton accent onClick={requestMic}>
              {tr("mic_retry_btn")}
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
            <DisplayText>{openingQuestion}</DisplayText>
            {/* Plays in the interviewer's cloned voice (4.2); the large text above
                is the backup channel. Falls back to a static chip if no voice. */}
            <QuestionVoice
              token={token}
              text={openingQuestion}
              lang={lang}
              chipLabel={tr("voice_chip")}
              hearLabel={tr("hear_question")}
              playingLabel={tr("playing_question")}
            />
            <Spacer />
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
            savingLabel={tr("saving")}
            onMicFail={beaconMicFailed}
            onFinished={async (blob, dur) => {
              const answerId = await uploadAnswer(blob, dur, {
                isFollowup: false,
                isFinal: false,
              });
              // Generate the follow-up while the "saving" screen is still up, so
              // it's ready when the follow-up screen appears (no placeholder flash).
              await fetchFollowUp(answerId);
              setStep("followup");
            }}
            skipLabel={tr("skip")}
            onSkip={() => setStep("done")}
          />
        )}

        {step === "followup" && (
          <Screen>
            <SpeakingAvatar />
            <FollowTag>{tr("follow_tag")}</FollowTag>
            <DisplayText>{followUpText}</DisplayText>
            <QuestionVoice
              token={token}
              text={followUpText}
              lang={lang}
              chipLabel={tr("voice_chip")}
              hearLabel={tr("hear_question")}
              playingLabel={tr("playing_question")}
            />
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
            savingLabel={tr("saving")}
            onMicFail={beaconMicFailed}
            onFinished={async (blob, dur) => {
              await uploadAnswer(blob, dur, { isFollowup: true, isFinal: true });
              setStep("done");
            }}
          />
        )}

        {step === "done" && (
          <Screen>
            <Check />
            <DisplayText>{tr("done_title")}</DisplayText>
            <Hint>{tr("done_sub")}</Hint>
            <QuestionVoice
              token={token}
              text={`${tr("done_title")}. ${tr("done_sub")}`}
              lang={lang}
              chipLabel={tr("voice_chip")}
              hearLabel={tr("hear_question")}
              playingLabel={tr("playing_question")}
            />
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

// --- Welcome screen -----------------------------------------------------------
// The session opens here. By design the page does NOT autoplay on load (browsers
// block gesture-less audio, and we want the elder walked through deliberately):
// it shows a single "Tap to begin" CTA. That tap is the user gesture that lets
// audio play, so we then read the instructions aloud in the interviewer's voice
// (or the neutral default voice when none is linked). Only when the reading
// FINISHES does the button become "Let's talk" → mic priming. Fail-soft: if the
// audio can't load or play, we reveal "Let's talk" immediately so the elder is
// never trapped. "Maybe later" stays available throughout.
function WelcomeScreen({
  token,
  lang,
  greeting,
  sub,
  ctaLabel,
  playingLabel,
  talkLabel,
  laterLabel,
  onContinue,
  onDecline,
}: {
  token: string;
  lang: Lang;
  greeting: string;
  sub: string;
  ctaLabel: string;
  playingLabel: string;
  talkLabel: string;
  laterLabel: string;
  onContinue: () => void;
  onDecline: () => void;
}) {
  const [phase, setPhase] = useState<"intro" | "loading" | "playing" | "ready">("intro");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  // Tear down any audio + object URL on unmount.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
      audioRef.current = null;
    };
  }, []);

  async function begin() {
    setPhase("loading");
    // The instructions read aloud = the greeting + the gentle sub-line.
    const instructions = `${greeting}. ${sub}`;
    let audio: HTMLAudioElement | null = null;
    try {
      const res = await fetch("/api/storyteller/voice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, text: instructions, lang }),
      });
      if (res.status === 200) {
        const url = URL.createObjectURL(await res.blob());
        urlRef.current = url;
        audio = new Audio(url);
      }
    } catch {
      // network/synthesis miss — fall through to ready below
    }
    if (!audio) {
      setPhase("ready");
      return;
    }
    audioRef.current = audio;
    // Reveal "Let's talk" only when the reading finishes (or on playback error).
    audio.onended = () => setPhase("ready");
    audio.onerror = () => setPhase("ready");
    try {
      await audio.play();
      setPhase("playing");
    } catch {
      // Even with the gesture, playback can be refused — don't trap the elder.
      setPhase("ready");
    }
  }

  return (
    <Screen>
      <Avatar>👋</Avatar>
      <DisplayText>{greeting}</DisplayText>
      <Hint>{sub}</Hint>
      <Spacer />
      {phase === "intro" && (
        <BigButton accent onClick={begin}>
          {ctaLabel}
        </BigButton>
      )}
      {(phase === "loading" || phase === "playing") && (
        <div
          aria-live="polite"
          className="flex w-full items-center justify-center gap-3 rounded-3xl bg-accent/80 px-6 py-6 text-2xl font-bold text-white shadow-lg"
        >
          <span aria-hidden>🔊</span>
          {playingLabel}
        </div>
      )}
      {phase === "ready" && (
        <BigButton accent onClick={onContinue}>
          {talkLabel}
        </BigButton>
      )}
      <QuietButton onClick={onDecline}>{laterLabel}</QuietButton>
    </Screen>
  );
}

// --- Answer screen (shared so the two "Your turn" steps are identical) --------
// Radical consistency keeps it effortless. Records real audio (2.5): the mic was
// already granted at priming (2.4), so re-acquiring a stream here is silent. We
// start a MediaRecorder on mount and stop+hand back the blob on "I'm finished".

// Pick a container/codec the browser actually records. iOS Safari records
// audio/mp4; Chromium prefers webm/opus. Empty string → let the UA choose.
function pickRecorderMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

function AnswerScreen({
  listening,
  title,
  hint,
  finishedLabel,
  savingLabel,
  onFinished,
  onMicFail,
  skipLabel,
  onSkip,
}: {
  listening: string;
  title: string;
  hint: string;
  finishedLabel: string;
  savingLabel: string;
  onFinished: (blob: Blob | null, durationSec: number) => void | Promise<void>;
  onMicFail: () => void;
  skipLabel?: string;
  onSkip?: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);

  function stopTracks() {
    streamRef.current?.getTracks().forEach((tk) => tk.stop());
    streamRef.current = null;
  }

  // Begin capture as soon as the screen appears; tear down on leave.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((tk) => tk.stop());
          return;
        }
        streamRef.current = stream;
        const mime = pickRecorderMime();
        const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        chunksRef.current = [];
        rec.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };
        rec.start();
        startedAtRef.current = Date.now();
        recorderRef.current = rec;
      } catch {
        // Mic was granted at priming but is unavailable now — fall to recovery.
        if (!cancelled) onMicFail();
      }
    })();
    return () => {
      cancelled = true;
      try {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
          recorderRef.current.stop();
        }
      } catch {
        // ignore
      }
      stopTracks();
    };
    // Mount once per answer screen; deps intentionally empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop the recorder and resolve with the assembled clip + its length.
  function stopRecording(): Promise<{ blob: Blob | null; durationSec: number }> {
    return new Promise((resolve) => {
      const rec = recorderRef.current;
      const durationSec = startedAtRef.current
        ? Math.round((Date.now() - startedAtRef.current) / 1000)
        : 0;
      if (!rec || rec.state === "inactive") {
        resolve({ blob: null, durationSec });
        return;
      }
      rec.onstop = () => {
        const type = rec.mimeType || "audio/webm";
        const blob = chunksRef.current.length
          ? new Blob(chunksRef.current, { type })
          : null;
        resolve({ blob, durationSec });
      };
      rec.stop();
    });
  }

  async function handleFinished() {
    setSaving(true);
    const { blob, durationSec } = await stopRecording();
    stopTracks();
    await onFinished(blob, durationSec);
    // Parent advances the step here, unmounting this screen.
  }

  function handleSkip() {
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    } catch {
      // ignore
    }
    stopTracks();
    onSkip?.();
  }

  if (saving) {
    return (
      <Screen>
        <Mic />
        <DisplayText>{savingLabel}</DisplayText>
      </Screen>
    );
  }

  return (
    <Screen>
      <Mic />
      <Label answer>{listening}</Label>
      <DisplayText>{title}</DisplayText>
      <Hint>{hint}</Hint>
      <Spacer />
      <BigButton onClick={handleFinished}>{finishedLabel}</BigButton>
      {skipLabel && onSkip && (
        <QuietButton onClick={handleSkip}>{skipLabel}</QuietButton>
      )}
    </Screen>
  );
}

// --- Presentational pieces ----------------------------------------------------

// Matches the prototype's per-screen geometry (docs/prototypes/storyteller-flow.html):
// content is vertically centered in a growing stage, with the action button(s)
// pinned near the bottom — thumb-reachable, no big mid-screen void. The <Spacer/>
// in a step's children marks the boundary between the centered content and the
// bottom button group; screens without one (terminal/loading) just center all.
function Screen({ children }: { children: React.ReactNode }) {
  const items = Children.toArray(children);
  const splitAt = items.findIndex((c) => isValidElement(c) && c.type === Spacer);

  if (splitAt === -1) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        {items.slice(0, splitAt)}
      </div>
      <div className="flex flex-col items-center gap-2 pt-6">
        {items.slice(splitAt + 1)}
      </div>
    </div>
  );
}

// Boundary marker between a screen's centered content and its bottom buttons —
// Screen splits its children here. Renders nothing itself.
function Spacer() {
  return null;
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

// Animated equalizer bars — the "a voice is speaking" cue, shared by the static
// chip and the playing state of QuestionVoice.
function VoiceBars() {
  return (
    <span className="flex h-4 items-end gap-0.5" aria-hidden>
      <i className="w-1 animate-pulse rounded-sm bg-accent" style={{ height: "60%" }} />
      <i className="w-1 animate-pulse rounded-sm bg-accent" style={{ height: "100%", animationDelay: "0.15s" }} />
      <i className="w-1 animate-pulse rounded-sm bg-accent" style={{ height: "40%", animationDelay: "0.3s" }} />
      <i className="w-1 animate-pulse rounded-sm bg-accent" style={{ height: "80%", animationDelay: "0.45s" }} />
    </span>
  );
}

function VoiceChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-black/[0.03] px-4 py-2 text-base text-ink/70">
      <VoiceBars />
      {children}
    </span>
  );
}

// Plays the question in the interviewer's cloned voice (TODO 4.2). Fetches the
// audio from the token-gated api/storyteller/voice when the screen appears,
// attempts autoplay (iOS blocks gesture-less playback, so this is best-effort),
// and renders a big tap-to-(re)play chip. The large question text on the screen
// is the always-present backup channel, so if there's no cloned voice (204) or
// synthesis fails, we fall back to the static chip and never block the elder.
function QuestionVoice({
  token,
  text,
  lang,
  chipLabel,
  hearLabel,
  playingLabel,
}: {
  token: string;
  text: string;
  lang: Lang;
  chipLabel: string;
  hearLabel: string;
  playingLabel: string;
}) {
  const [state, setState] = useState<"loading" | "ready" | "playing" | "unavailable">("loading");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    (async () => {
      try {
        const res = await fetch("/api/storyteller/voice", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token, text, lang }),
        });
        if (cancelled) return;
        if (res.status !== 200) {
          setState("unavailable"); // 204 (no cloned voice) or error → text only
          return;
        }
        const url = URL.createObjectURL(await res.blob());
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        urlRef.current = url;
        const audio = new Audio(url);
        audio.onended = () => setState("ready");
        audioRef.current = audio;
        setState("ready");
        // Best-effort autoplay; on iOS this rejects without a gesture and the
        // elder taps the chip instead.
        audio.play().then(() => !cancelled && setState("playing")).catch(() => {});
      } catch {
        if (!cancelled) setState("unavailable");
      }
    })();
    return () => {
      cancelled = true;
      audioRef.current?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
      audioRef.current = null;
    };
  }, [token, text, lang]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (state === "playing") {
      audio.pause();
      audio.currentTime = 0;
      setState("ready");
      return;
    }
    audio.currentTime = 0;
    audio.play().then(() => setState("playing")).catch(() => {});
  }

  // No cloned voice / failed → the static chip; the text above carries the question.
  if (state === "unavailable") return <VoiceChip>{chipLabel}</VoiceChip>;

  const playing = state === "playing";
  const label = state === "loading" ? chipLabel : playing ? playingLabel : hearLabel;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-black/[0.03] px-4 py-2 text-base text-ink/70"
    >
      {playing ? <VoiceBars /> : <span aria-hidden>🔊</span>}
      {label}
    </button>
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
    <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-[#6366F1] to-sky2 text-5xl shadow-lg">
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
