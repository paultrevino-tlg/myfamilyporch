"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteVoiceProfile } from "./actions";

// Voice profile setup (TODO 4.1). Shown in the interviewer's relationship section.
// The interviewer records a short sample in the browser (reusing the storyteller
// flow's MediaRecorder/codec pattern); we POST it to api/voice/clone, which sends
// it to ElevenLabs and links the returned voice to this relationship. Once linked,
// en/es preview buttons prove the SAME cloned voice speaks both languages.

type Linked = { id: string; label: string } | null;

// A short read-aloud script per language → a clean ~20–40s sample for the clone.
const SCRIPT: Record<"en" | "es", string> = {
  en: "Hi, it's me. I've been thinking about all the stories you carry — the everyday ones and the big ones. I'd love to just sit and listen for a little while. There's no rush, and no wrong answer. Whenever you're ready, tell me whatever comes to mind.",
  es: "Hola, soy yo. He estado pensando en todas las historias que llevas contigo — las de cada día y las más grandes. Me encantaría sentarme y escucharte un rato. No hay prisa, y no hay respuesta incorrecta. Cuando estés listo, cuéntame lo que te venga a la mente.",
};

function pickRecorderMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const c of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

export default function VoiceSetup({
  storytellerId,
  lang,
  linked,
}: {
  storytellerId: string;
  lang: "en" | "es";
  linked: Linked;
}) {
  const router = useRouter();
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [label, setLabel] = useState("My voice");
  const [status, setStatus] = useState<"idle" | "cloning" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<"en" | "es" | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopTracks() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  }
  useEffect(() => stopTracks, []); // tear down on unmount

  async function startRecording() {
    setError(null);
    setBlob(null);
    setSeconds(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickRecorderMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const type = rec.mimeType || "audio/webm";
        setBlob(chunksRef.current.length ? new Blob(chunksRef.current, { type }) : null);
        stopTracks();
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
      tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("Couldn't access the microphone. Check your browser's mic permission and try again.");
    }
  }

  function stopRecording() {
    setRecording(false);
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    } catch {
      // ignore
    }
    if (tickRef.current) clearInterval(tickRef.current);
  }

  async function createVoice() {
    if (!blob) return;
    setStatus("cloning");
    setError(null);
    const ext = blob.type.includes("mp4") ? "mp4" : blob.type.includes("ogg") ? "ogg" : "webm";
    const fd = new FormData();
    fd.set("storyteller_id", storytellerId);
    fd.set("label", label.trim() || "My voice");
    fd.set("lang", lang);
    fd.set("samples", blob, `voice-sample.${ext}`);
    try {
      const res = await fetch("/api/voice/clone", { method: "POST", body: fd });
      if (res.ok) {
        setBlob(null);
        setStatus("idle");
        router.refresh(); // re-render the server page with the now-linked voice
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Voice cloning failed. Please try again.");
    } catch {
      setError("Network error while creating the voice. Please try again.");
    }
    setStatus("error");
  }

  async function preview(which: "en" | "es") {
    if (!linked || previewing) return;
    setPreviewing(which);
    setError(null);
    try {
      const res = await fetch("/api/voice/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ voice_profile_id: linked.id, lang: which }),
      });
      if (!res.ok) {
        setError("Couldn't play a preview. The voice may still be processing.");
        setPreviewing(null);
        return;
      }
      const audio = new Audio(URL.createObjectURL(await res.blob()));
      audio.onended = () => setPreviewing(null);
      audio.onerror = () => setPreviewing(null);
      await audio.play();
    } catch {
      setError("Couldn't play a preview.");
      setPreviewing(null);
    }
  }

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  // --- Linked state: show the voice + previews + replace/remove -----------------
  if (linked) {
    return (
      <div className="mt-3 space-y-3">
        <p className="text-ink/70">
          Cloned voice: <span className="font-medium">{linked.label}</span>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => preview("en")}
            disabled={previewing !== null}
            className="btn-ghost"
          >
            {previewing === "en" ? "Playing…" : "▶ Preview (English)"}
          </button>
          <button
            type="button"
            onClick={() => preview("es")}
            disabled={previewing !== null}
            className="btn-ghost"
          >
            {previewing === "es" ? "Reproduciendo…" : "▶ Vista previa (Español)"}
          </button>
          <form action={deleteVoiceProfile}>
            <input type="hidden" name="storyteller_id" value={storytellerId} />
            <button type="submit" className="font-semibold text-red-600 underline-offset-4 hover:underline">
              Remove voice
            </button>
          </form>
        </div>
        {error && <p className="text-red-700">{error}</p>}
        <details>
          <summary className="cursor-pointer text-ink/60">Replace with a new recording</summary>
          <div className="mt-3">{recorder()}</div>
        </details>
      </div>
    );
  }

  // --- Unlinked state: record + create -----------------------------------------
  return <div className="mt-3">{recorder()}</div>;

  function recorder() {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-line bg-surface2 p-3.5 text-ink/70">
          <p className="mb-1 font-semibold text-ink/80">Read this aloud (about 20–40 seconds):</p>
          <p className="italic">{SCRIPT[lang]}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!recording ? (
            <button type="button" onClick={startRecording} className="btn-ink">
              {blob ? "Re-record" : "● Start recording"}
            </button>
          ) : (
            <button type="button" onClick={stopRecording} className="btn-danger">
              ■ Stop ({mmss})
            </button>
          )}
          {blob && !recording && <span className="text-ink/60">Recorded {mmss} — sounds good?</span>}
        </div>

        {blob && !recording && (
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col">
              <span className="text-ink/60">Name this voice</span>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="input mt-1"
              />
            </label>
            <button
              type="button"
              onClick={createVoice}
              disabled={status === "cloning"}
              className="btn-ink"
            >
              {status === "cloning" ? "Creating voice…" : "Create cloned voice"}
            </button>
          </div>
        )}

        {error && <p className="text-red-700">{error}</p>}
      </div>
    );
  }
}
