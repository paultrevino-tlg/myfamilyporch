// BROWSER-ONLY. One shared audio element for everything the storyteller hears.
//
// Phones won't play sound until the page has been tapped, and they judge each
// play() call on its own: audio fetched AFTER a tap (every screen's spoken text
// is synthesized on arrival) is refused, so the elder had to tap "hear it" on
// every screen. The fix is the standard one: a single element that a tap has
// already played. Once a gesture has played it, later play() calls on the SAME
// element are allowed without another tap — so every screen can read itself.
//
// An <audio> element (not Web Audio) on purpose: on iPhone, Web Audio is muted
// by the ring/silent switch, and an elder's phone is often on silent.
//
// Module scope = one player per page lifetime, which survives client-side
// navigations (e.g. the consent form's redirect to its confirmation screen).

let el: HTMLAudioElement | null = null;
let silentUrl: string | null = null;
let clipUrl: string | null = null;
let current = 0; // id of the clip that owns the element right now

function element(): HTMLAudioElement {
  if (!el) {
    el = new Audio();
    el.preload = "auto";
  }
  return el;
}

// A 50 ms silent WAV, built in code so there's no opaque base64 blob to trust.
function silence(): string {
  if (silentUrl) return silentUrl;
  const rate = 8000;
  const samples = rate / 20;
  const buf = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples * 2, true);
  str(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples * 2, true);
  silentUrl = URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
  return silentUrl;
}

/**
 * Call SYNCHRONOUSLY inside a tap handler. Plays silence on the shared element so
 * the browser marks it as user-started; later clips then play without a tap.
 * Never interrupts something already playing, and is safe to call on every tap.
 */
export function unlockAudio(): void {
  if (typeof window === "undefined") return;
  const a = element();
  if (!a.paused) return;
  a.src = silence();
  a.play().catch(() => {
    // Refused or interrupted by the next clip loading — either is fine.
  });
}

/**
 * Play a clip on the shared element. Resolves to an id when playback started,
 * or null when the browser refused (no tap yet) — the caller then offers a
 * "tap to hear" button. `onEnd` fires when it finishes or fails mid-way.
 */
export async function playVoice(blob: Blob, onEnd?: () => void): Promise<number | null> {
  if (typeof window === "undefined") return null;
  const a = element();
  const id = ++current;
  a.pause();
  if (clipUrl) URL.revokeObjectURL(clipUrl);
  clipUrl = URL.createObjectURL(blob);
  a.src = clipUrl;
  a.onended = () => id === current && onEnd?.();
  a.onerror = () => id === current && onEnd?.();
  try {
    await a.play();
    return id === current ? id : null;
  } catch {
    return null;
  }
}

/**
 * Stop a clip — only if `id` still owns the element. A screen that never got a
 * clip started (null id) must not silence whatever the next screen is playing.
 */
export function stopVoice(id: number | null): void {
  if (id == null || id !== current) return;
  silenceAll();
}

/** Stop whatever is playing, no matter who started it (e.g. before the mic resumes). */
export function silenceAll(): void {
  if (!el) return;
  current++;
  el.pause();
  el.onended = null;
  el.onerror = null;
}
