import { t, type Lang } from "@/lib/i18n";

// What the storyteller authorization page reads aloud.
//
// Composed in ONE place because it is rendered by two different engines that
// must say identical things: the cloned voice via api/consent/voice, and the
// browser's own SpeechSynthesis when that request fails. A drift between them
// would mean the elder hears different consent language depending on which
// fallback happened to fire.
//
// The bridge and finish lines are spoken only — never rendered — so the visible
// page (and the hosted A2P screenshot of it) stays exactly as registered. The
// disclosure itself is read VERBATIM: it is the operative consent record stored
// in consent_events.disclosure_text, so it must not be paraphrased for speech.
export function consentSpokenText(lang: Lang): string {
  return [
    t(lang, "consent_what_it_is"),
    t(lang, "consent_whats_next"),
    t(lang, "consent_spoken_bridge"),
    t(lang, "consent_optin_control"),
    t(lang, "consent_spoken_finish"),
  ].join(" ");
}
