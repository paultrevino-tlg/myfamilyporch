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
    welcome_cta: "Tap to begin",
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
    sms_nudge: "My Family Porch: Hi {address}, it's {interviewer} — tap here to tell me a story",
    sms_nudge_no_interviewer: "My Family Porch: Hi {address} — tap here to tell me a story",
    // Appended as the last line of every recurring nudge (A2P 10DLC: opt-out
    // and HELP language must appear in the message samples and the real messages).
    sms_stop_line: "Reply STOP to opt out, HELP for help",
    // Double opt-in confirmation (A2P 10DLC): the FIRST text a storyteller ever
    // gets. No reminders send until they reply YES (handled by api/sms/inbound).
    sms_confirm:
      "My Family Porch: {interviewer} invited you to record your life stories and get occasional reminder texts (up to 1 msg/day). Reply YES to start, STOP to opt out, HELP for help. Msg & data rates may apply.",
    sms_confirm_no_interviewer:
      "My Family Porch: Your family invited you to record your life stories and get occasional reminder texts (up to 1 msg/day). Reply YES to start, STOP to opt out, HELP for help. Msg & data rates may apply.",
    // Auto-replies from the inbound webhook.
    sms_confirmed_reply:
      "My Family Porch: You're all set — story reminders are on. Reply STOP anytime to opt out, HELP for help.",
    sms_help_reply:
      "My Family Porch story reminders. Up to 1 msg/day; msg & data rates may apply. Reply STOP to opt out. Support: support@myfamilyporch.net",
    // Member phone verification (consent-flow.md steps 2-3). {link} = the signed
    // /verify/<token> URL; sent to the member's OWN number after they enter it
    // and opt in on the app form (first-party consent — never proxy).
    magic_link_sms:
      "My Family Porch: Tap to verify your number and finish setup: {link}\nYou'll get texts to help set up your storyteller.\nMsg & data rates may apply. Reply STOP to opt out, HELP for help.",
    // The exact opt-in copy shown beside the checkbox on the verify form AND
    // stored as consent_events.disclosure_text (the audit record of what they
    // agreed to).
    member_optin_disclosure:
      "Yes, text me at this number. I agree to receive automated, recurring texts from My Family Porch to help set up and record my family's stories. Msg & data rates may apply. Reply STOP anytime to opt out, HELP for help.",
    // Confirm page (tapped from the SMS, rendered in the member's language).
    member_confirm_title: "You're all set ✓",
    member_confirm_sub:
      "Your number is verified and text reminders are on. You can close this and go back to My Family Porch.",
    member_confirm_dead_title: "This link isn't active",
    member_confirm_dead_sub:
      "It may have expired. Open My Family Porch and request a new verification text from your account.",
    // Storyteller authorization page (consent-flow.md steps 7-9). Elder-facing:
    // plain, large, one action. Rendered in the storyteller's language.
    consent_title: "Record your life stories",
    consent_what_it_is:
      "With My Family Porch, you record your life stories just by talking — and we turn them into a keepsake.",
    consent_whats_next:
      "We'll send you an occasional text with a link when it's time to record.",
    consent_name_label: "Your name",
    consent_number_label: "Your number",
    // The first-person opt-in control — shown by the checkbox AND stored verbatim
    // as consent_events.disclosure_text (the operative consent record).
    consent_optin_control:
      "Yes, text me at this number so I can record my stories. I agree to receive automated, recurring texts from My Family Porch. Msg & data rates may apply. Reply STOP anytime to opt out, HELP for help.",
    consent_agree_btn: "Yes, text me",
    consent_hear: "🔊 Hear this",
    consent_stop: "Stop",
    consent_optin_required: "Please check the box above so we can text you.",
    consent_success_title: "You're all set. ✓",
    consent_success_sub:
      "We'll text you when it's time to record your first story. You can close this now.",
    consent_dead_title: "This link isn't active",
    consent_dead_sub:
      "No worries at all. Ask the family member who sent it to share a fresh link.",
    consent_terms: "Terms",
    consent_privacy: "Privacy",
    // Step 9 — storyteller confirmation (first A2P message under valid consent).
    sms_storyteller_welcome:
      "My Family Porch: Thanks {name}! You're all set to record your stories — we'll text you when it's time to start.\nMsg & data rates may apply. Reply STOP to stop, HELP for help.",
    // Step 10 — the family member who set it up ("ready to begin"), sent to the
    // MEMBER in the member's language.
    sms_family_ready:
      "My Family Porch: Great news — {name} is all set up and ready to start recording their stories. We'll let you know as new stories come in.\nMsg & data rates may apply. Reply STOP to stop, HELP for help.",
    // Voice-QR play page (TODO 7.2). {name} = the storyteller. Rendered in the
    // storyteller's own language — the recording's language.
    qr_caption: "Scan to hear {name} tell it",
    play_kicker: "In their own voice",
    play_in_voice: "{name}, in their own voice",
    play_more: "More of the story",
    play_no_audio: "No recording for this part.",
    play_dead_title: "This recording link isn't active",
    play_dead_sub: "No worries at all. Ask your family for the keepsake again, and the story will be right here.",
  },
  es: {
    // Welcome
    greeting: "Hola, {address}",
    welcome_sub: "Tengo una pregunta para ti cuando quieras.",
    welcome_cta: "Toca para empezar",
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
    sms_nudge: "My Family Porch: Hola {address}, soy {interviewer} — toca aquí para contarme una historia",
    sms_nudge_no_interviewer: "My Family Porch: Hola {address} — toca aquí para contarme una historia",
    sms_stop_line: "Responde STOP para cancelar, AYUDA para ayuda",
    sms_confirm:
      "My Family Porch: {interviewer} te invitó a grabar tus historias de vida y recibir recordatorios ocasionales por texto (hasta 1 por día). Responde SÍ para empezar, STOP para cancelar, AYUDA para ayuda. Pueden aplicarse tarifas de mensajes y datos.",
    sms_confirm_no_interviewer:
      "My Family Porch: Tu familia te invitó a grabar tus historias de vida y recibir recordatorios ocasionales por texto (hasta 1 por día). Responde SÍ para empezar, STOP para cancelar, AYUDA para ayuda. Pueden aplicarse tarifas de mensajes y datos.",
    sms_confirmed_reply:
      "My Family Porch: Listo — los recordatorios de historias están activados. Responde STOP para cancelar, AYUDA para ayuda.",
    sms_help_reply:
      "Recordatorios de historias de My Family Porch. Hasta 1 mensaje por día; pueden aplicarse tarifas. Responde STOP para cancelar. Ayuda: support@myfamilyporch.net",
    // Member phone verification (consent-flow.md steps 2-3)
    magic_link_sms:
      "My Family Porch: Toca para verificar tu número y terminar la configuración: {link}\nRecibirás mensajes para ayudarte a configurar a tu narrador.\nPueden aplicar tarifas de mensajes y datos. Responde STOP para cancelar, HELP para ayuda.",
    member_optin_disclosure:
      "Sí, envíenme mensajes de texto a este número. Acepto recibir mensajes automáticos y recurrentes de My Family Porch para ayudar a configurar y grabar las historias de mi familia. Pueden aplicar tarifas de mensajes y datos. Responde STOP en cualquier momento para cancelar, HELP para ayuda.",
    member_confirm_title: "¡Todo listo! ✓",
    member_confirm_sub:
      "Tu número está verificado y los recordatorios por texto están activados. Puedes cerrar esto y volver a My Family Porch.",
    member_confirm_dead_title: "Este enlace no está activo",
    member_confirm_dead_sub:
      "Es posible que haya expirado. Abre My Family Porch y solicita un nuevo mensaje de verificación desde tu cuenta.",
    // Storyteller authorization page (consent-flow.md steps 7-9)
    consent_title: "Graba las historias de tu vida",
    consent_what_it_is:
      "Con My Family Porch, grabas las historias de tu vida con solo hablar — y nosotros las convertimos en un libro de recuerdos.",
    consent_whats_next:
      "Te enviaremos un mensaje ocasional con un enlace cuando sea momento de grabar.",
    consent_name_label: "Tu nombre",
    consent_number_label: "Tu número",
    consent_optin_control:
      "Sí, envíenme mensajes de texto a este número para poder grabar mis historias. Acepto recibir mensajes de texto automáticos y recurrentes de My Family Porch. Pueden aplicar tarifas de mensajes y datos. Responde STOP en cualquier momento para cancelar, HELP para ayuda.",
    consent_agree_btn: "Sí, envíenme mensajes",
    consent_hear: "🔊 Escuchar",
    consent_stop: "Detener",
    consent_optin_required: "Marca la casilla de arriba para que podamos enviarte mensajes.",
    consent_success_title: "¡Todo listo! ✓",
    consent_success_sub:
      "Te enviaremos un mensaje cuando sea momento de grabar tu primera historia. Puedes cerrar esto.",
    consent_dead_title: "Este enlace no está activo",
    consent_dead_sub:
      "No te preocupes. Pídele a la persona de tu familia que te envió el enlace que te comparta uno nuevo.",
    consent_terms: "Términos",
    consent_privacy: "Privacidad",
    sms_storyteller_welcome:
      "My Family Porch: ¡Gracias {name}! Ya puedes grabar tus historias — te avisaremos por mensaje cuando sea momento de empezar.\nPueden aplicar tarifas de mensajes y datos. Responde STOP para cancelar, HELP para ayuda.",
    sms_family_ready:
      "My Family Porch: ¡Buenas noticias! {name} ya está listo(a) para empezar a grabar sus historias. Te avisaremos cuando lleguen historias nuevas.\nPueden aplicar tarifas de mensajes y datos. Responde STOP para cancelar, HELP para ayuda.",
    // Voice-QR play page (TODO 7.2)
    qr_caption: "Escanea para escuchar a {name} contarlo",
    play_kicker: "Con su propia voz",
    play_in_voice: "{name}, con su propia voz",
    play_more: "Más de la historia",
    play_no_audio: "No hay grabación para esta parte.",
    play_dead_title: "Este enlace de la grabación no está activo",
    play_dead_sub: "No te preocupes. Pídele a tu familia el recuerdo otra vez y la historia estará aquí mismo.",
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
