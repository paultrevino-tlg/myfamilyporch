export type Lang = "en" | "es";

// Storyteller-facing UI strings, keyed by language (see storyteller prototype).
export const ui: Record<Lang, Record<string, string>> = {
  en: {
    greeting: "Hi {address}",
    ready: "I've got a question for you whenever you're ready.",
    lets_talk: "Let's talk",
    your_turn: "Your turn — just talk.",
    finished: "I'm finished",
    done_title: "That's a good one, {address}.",
  },
  es: {
    greeting: "Hola, {address}",
    ready: "Tengo una pregunta para ti cuando quieras.",
    lets_talk: "Hablemos",
    your_turn: "Es tu turno — solo habla.",
    finished: "Ya terminé",
    done_title: "Esa estuvo muy buena, {address}.",
  },
};
