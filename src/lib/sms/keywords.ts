// Inbound SMS keyword classification (consent-flow.md "Inbound keyword handling").
// The half carriers audit hardest: EVERY inbound message is checked here BEFORE
// it's treated as conversational content. Bilingual (EN + ES) exact keywords AND
// natural-language opt-outs, because elderly storytellers reply in plain
// language ("please stop", "no más mensajes") — exact-keyword-only handling
// would miss those and is non-compliant (FCC "any reasonable method", Apr 2025).
// Pure + framework-free so it's unit-testable.
import type { Lang } from "@/lib/i18n";

export type InboundIntent = "opt_out" | "help" | "resubscribe" | "none";
export type MatchedKind = "stop" | "help" | "start" | "natural_optout" | "none";
export type Classification = {
  intent: InboundIntent;
  matched: MatchedKind;
  needsReview: boolean;
  langHint?: Lang; // set when the matched keyword clearly belongs to one language
};

// Normalize: strip accents (SÍ→SI, DETÉN→DETEN), uppercase, collapse whitespace,
// trim. Keeps matching robust to casing/accents/spacing.
export function normalizeInbound(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

// First token with surrounding punctuation stripped ("STOP." → "STOP").
function firstToken(norm: string): string {
  return (norm.split(" ")[0] ?? "").replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, "");
}

const OPT_OUT_EN = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "OPTOUT", "REVOKE"];
const OPT_OUT_ES = ["PARAR", "ALTO", "CANCELAR", "BAJA", "ELIMINAR", "DETENER", "FIN", "QUITAR"];
const RESUB_EN = ["START", "YES", "UNSTOP", "OPTIN"];
const RESUB_ES = ["EMPEZAR", "COMENZAR", "INICIAR", "SI", "ALTA"];

// Natural-language opt-out phrases (already accent-stripped + uppercased to match
// normalizeInbound). Matched as a substring of the whole normalized message.
const NL_OPTOUT_EN = [
  "STOP TEXTING",
  "STOP MESSAGING",
  "REMOVE ME",
  "UNSUBSCRIBE ME",
  "LEAVE ME ALONE",
  "DO NOT TEXT",
  "NO MORE TEXTS",
  "TAKE ME OFF",
];
const NL_OPTOUT_ES = [
  "DEJA DE ENVIAR",
  "NO MAS MENSAJES",
  "NO ME ENVIES",
  "ELIMINAME",
  "QUITAME",
  "DEJAME EN PAZ",
  "NO QUIERO MENSAJES",
  "CANCELAR MENSAJES",
];

export function classifyInbound(body: string): Classification {
  const norm = normalizeInbound(body ?? "");
  if (!norm) return { intent: "none", matched: "none", needsReview: false };
  const word = firstToken(norm);

  // Exact opt-out (first token). Opt-out wins over everything else.
  if (OPT_OUT_EN.includes(word)) return { intent: "opt_out", matched: "stop", needsReview: false, langHint: "en" };
  if (OPT_OUT_ES.includes(word)) return { intent: "opt_out", matched: "stop", needsReview: false, langHint: "es" };

  // Resubscribe (ES first — "SI" is ES-specific, "YES" is EN).
  if (RESUB_ES.includes(word)) return { intent: "resubscribe", matched: "start", needsReview: false, langHint: "es" };
  if (RESUB_EN.includes(word)) return { intent: "resubscribe", matched: "start", needsReview: false, langHint: "en" };

  // Help ("INFO" is shared; "AYUDA" is ES).
  if (word === "AYUDA") return { intent: "help", matched: "help", needsReview: false, langHint: "es" };
  if (word === "HELP" || word === "INFO") return { intent: "help", matched: "help", needsReview: false, langHint: "en" };

  // Natural-language opt-out (anywhere in the message). Err toward opting out and
  // flag for review — never require the literal word STOP.
  if (NL_OPTOUT_EN.some((p) => norm.includes(p)))
    return { intent: "opt_out", matched: "natural_optout", needsReview: true, langHint: "en" };
  if (NL_OPTOUT_ES.some((p) => norm.includes(p)))
    return { intent: "opt_out", matched: "natural_optout", needsReview: true, langHint: "es" };

  return { intent: "none", matched: "none", needsReview: false };
}
