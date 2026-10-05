/**
 * Every interviewer relationship gets a real library opener in both languages
 * (TODO 3.6). Runs the production selector (selectOpeningPrompt) over the seed
 * files as a brand-new storyteller, so it needs no database or secrets.
 * Fails if any kind × language has no pick, or the pick reads like the
 * built-in placeholder (which would make a real fallback indistinguishable).
 * Run: npm run check:openers
 */
import { selectOpeningPrompt, type PromptCandidate } from "../src/lib/ai/assembly";
import { t } from "../src/lib/i18n";
import en from "../supabase/seed/prompts-seed.json";
import es from "../supabase/seed/prompts-seed-es.json";

const KINDS = ["parent", "grandparent", "aunt_uncle", "sibling", "spouse", "other"] as const;
const LIBRARIES = { en: en.prompts, es: es.prompts } as const;

let failed = false;
for (const [lang, rows] of Object.entries(LIBRARIES) as [keyof typeof LIBRARIES, unknown[]][]) {
  const pool = (rows as PromptCandidate[]).map((p, i) => ({ ...p, id: p.id ?? `${lang}-${i}` }));
  const placeholder = t(lang, "q_placeholder");
  for (const kind of KINDS) {
    const pick = selectOpeningPrompt(pool, {
      kind,
      askedPromptIds: new Set(),
      completedSessions: 0,
      lastAnswerWeight: null,
      categoryCounts: new Map(),
      avoidCategories: new Set(),
      focusCategories: new Set(),
      easeOffCategories: new Set(),
    });
    const ok = !!pick && pick.prompt.trim() !== placeholder.trim();
    if (!ok) failed = true;
    console.log(`${ok ? "ok  " : "FAIL"} ${lang} ${kind.padEnd(11)} ${pick ? pick.prompt : "(no eligible prompt)"}`);
  }
}

if (failed) {
  console.error("\ncheck:openers failed — a kind/language has no real opener.");
  process.exit(1);
}
console.log("\ncheck:openers passed.");
