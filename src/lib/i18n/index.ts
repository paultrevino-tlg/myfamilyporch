export type Lang = "en" | "es";

// Storyteller-facing UI strings, keyed by language (see storyteller prototype,
// docs/prototypes/storyteller-flow.html). Drives the 7-screen voice flow.
// String-coverage audit complete (TODO 2.6): every visible string in the
// storyteller surface resolves through t() in the storyteller's language, and
// the flow carries a matching lang attribute for screen-reader pronunciation.
// The sample question/follow-up text here is still a placeholder until the AI
// interview loop (TODO 3.1/3.2) supplies real prompts, and the voice attribution
// is generic until cloned voice (4.2).
export const ui: Record<Lang, Record<string, string>> = {
  en: {
    // Welcome
    greeting: "Hi {address}",
    welcome_sub: "I've got a question for you whenever you're ready.",
    lets_talk: "Let's talk",
    maybe_later: "Maybe later",
    // Mic priming (prime before the iOS prompt — one clean shot)
    mic_prime_title: "One quick thing",
    mic_prime_sub: "So I can hear your story, your phone will ask to use the microphone. Just tap “Allow.”",
    mic_prime_btn: "OK, I'm ready",
    // Mic denial recovery (calm, never a dead-end)
    mic_denied_title: "I couldn't hear the microphone",
    mic_denied_sub: "No problem at all. In your phone's settings, allow the microphone for this page — then come back and tap below.",
    mic_retry_btn: "Try again",
    // Question
    q_label: "A question for you",
    q_placeholder: "What was your first car?",
    voice_chip: "in your family's voice",
    hear_question: "Tap to hear it",
    playing_question: "Playing…",
    ready_to_answer: "I'm ready to answer",
    // Your turn
    listening: "Listening",
    your_turn: "Your turn — just talk.",
    take_time: "Take all the time you need.",
    finished: "I'm finished",
    saving: "Saving your story…",
    skip: "Skip this one",
    // AI follow-up
    follow_tag: "↳ a question about what you just said",
    follow_placeholder: "Where's the farthest you ever drove it?",
    // Your turn, again
    your_turn_again: "Go ahead.",
    no_rush: "No rush at all.",
    // Done
    done_title: "That's a good one.",
    done_sub: "Saved. We'll talk again soon. ❤️",
    done_count: "2 questions today — that's plenty",
    done_btn: "Done",
    // SMS nudge (TODO 4.3). {address} = how the elder is addressed; {interviewer}
    // = who it's from. The deep-link URL is appended after this line by the
    // sender, never interpolated into the translated string.
    sms_nudge: "Hi {address}, it's {interviewer} — tap here to tell me a story 💬",
    sms_nudge_no_interviewer: "Hi {address} — tap here to tell me a story 💬",
  },
  es: {
    // Welcome
    greeting: "Hola, {address}",
    welcome_sub: "Tengo una pregunta para ti cuando quieras.",
    lets_talk: "Hablemos",
    maybe_later: "Quizás más tarde",
    // Mic priming (prime before the iOS prompt — one clean shot)
    mic_prime_title: "Una cosita rápida",
    mic_prime_sub: "Para escuchar tu historia, tu teléfono te pedirá usar el micrófono. Solo toca “Permitir.”",
    mic_prime_btn: "Listo, adelante",
    // Mic denial recovery (calm, never a dead-end)
    mic_denied_title: "No pude escuchar el micrófono",
    mic_denied_sub: "No pasa nada. En la configuración de tu teléfono, permite el micrófono para esta página — luego regresa y toca abajo.",
    mic_retry_btn: "Intentar de nuevo",
    // Question
    q_label: "Una pregunta para ti",
    q_placeholder: "¿Cuál fue tu primer carro?",
    voice_chip: "con la voz de tu familia",
    hear_question: "Toca para escuchar",
    playing_question: "Reproduciendo…",
    ready_to_answer: "Estoy listo para responder",
    // Your turn
    listening: "Escuchando",
    your_turn: "Es tu turno — solo habla.",
    take_time: "Tómate todo el tiempo que necesites.",
    finished: "Ya terminé",
    saving: "Guardando tu historia…",
    skip: "Saltar esta",
    // AI follow-up
    follow_tag: "↳ una pregunta sobre lo que acabas de decir",
    follow_placeholder: "¿Cuál es el lugar más lejano al que llegaste con él?",
    // Your turn, again
    your_turn_again: "Adelante.",
    no_rush: "Sin ninguna prisa.",
    // Done
    done_title: "Esa estuvo muy buena.",
    done_sub: "Guardada. Hablamos pronto. ❤️",
    done_count: "Dos preguntas hoy — con eso basta",
    done_btn: "Listo",
    // SMS nudge (TODO 4.3)
    sms_nudge: "Hola {address}, soy {interviewer} — toca aquí para contarme una historia 💬",
    sms_nudge_no_interviewer: "Hola {address} — toca aquí para contarme una historia 💬",
  },
};

// Resolve a string for a language, substituting {token} placeholders.
export function t(
  lang: Lang,
  key: string,
  vars: Record<string, string> = {},
): string {
  const raw = ui[lang]?.[key] ?? ui.en[key] ?? key;
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);
}
