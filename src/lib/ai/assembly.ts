// Session assembly (TODO 3.1). SERVER-ONLY. Picks the opening question for a
// storyteller's session from the coverage-backbone prompt library and resolves
// its tokens against the storyteller + the interviewer relationship, so the
// surface (and, later, the AI) speak in the right names/pronouns/era.
//
// The storyteller surface has no Supabase Auth session — it is token-scoped — so
// reads here go through the SERVICE ROLE, exactly like validateStorytellerToken.
// family_id/storyteller_id are supplied by the already-validated token, never by
// the client, so these reads stay tenant-scoped.
//
// Deliberately minimal selection for 3.1: prefer warm-ups, skip already-asked
// prompts, deterministic order. Topic weighting, applies_to gating, and
// emotional-weight pacing/avoid rules are TODO 3.3; follow-up generation is 3.2.
import { supabaseService } from "@/lib/supabase/service";
import { resolveTokens, type RelationshipContext } from "./interviewer";

export type AssembledQuestion = {
  promptId: string | null;
  questionText: string;        // tokens resolved
  address: string;             // resolved address term (falls back to first name)
  context: RelationshipContext; // handed to the AI for follow-ups (3.2)
};

type Pronouns = RelationshipContext["pronouns"];
type Kind = RelationshipContext["kind"];

// Tokens we have no data source for yet ({partner}, {asker_parent}). Skip prompts
// that need them so we never substitute an empty string into the question. 3.3
// (relationship gating) revisits this once those facts are captured.
const UNRESOLVABLE_TOKEN = /\{partner\}|\{asker_parent\}/;

// Build the resolved relationship context for a storyteller (TODO 3.1/3.2).
// SERVER-ONLY. Both the opening-question assembly and the follow-up route
// (api/ai/interview) derive context here so names/pronouns are always resolved
// server-side from data — never trusted from the client. Returns null if the
// storyteller is missing.
export async function buildRelationshipContext(
  storytellerId: string,
): Promise<RelationshipContext | null> {
  const db = supabaseService();

  // The storyteller's shared facts drive name, pronouns, era, and language.
  const { data: st } = await db
    .from("storytellers")
    .select("name, pronouns, birth_year, language")
    .eq("id", storytellerId)
    .maybeSingle();
  if (!st) return null;

  const lang: "en" | "es" = st.language === "es" ? "es" : "en";

  // The interviewer relationship supplies the address term + asker relation.
  // Prefer the member flagged as interviewer; otherwise any relationship row.
  const { data: rels } = await db
    .from("storyteller_relationships")
    .select("address_term, asker_relation, kind, is_interviewer")
    .eq("storyteller_id", storytellerId)
    .order("is_interviewer", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1);
  const rel = rels?.[0] ?? null;

  const address = (rel?.address_term ?? st.name) || st.name;
  return {
    address,
    name: st.name,
    pronouns: (st.pronouns as Pronouns) ?? "they_them",
    askerRelation: rel?.asker_relation ?? undefined,
    kind: (rel?.kind as Kind) ?? "other",
    birthYear: st.birth_year ?? undefined,
    lang,
  };
}

export async function assembleOpeningQuestion(args: {
  storytellerId: string;
  familyId: string;
}): Promise<AssembledQuestion | null> {
  const db = supabaseService();

  // 1 & 2. Resolve the relationship context (storyteller facts + interviewer edge).
  const context = await buildRelationshipContext(args.storytellerId);
  if (!context) return null;
  const lang = context.lang;
  const address = context.address;

  // 3. Don't re-ask questions this storyteller has already answered.
  const { data: asked } = await db
    .from("answers")
    .select("prompt_id")
    .eq("storyteller_id", args.storytellerId)
    .not("prompt_id", "is", null);
  const askedIds = new Set((asked ?? []).map((a) => a.prompt_id as string));

  // 4. Candidate prompts: global library + this family's custom, in the
  // storyteller's language. Warm-ups first; deterministic order (no randomness —
  // Math.random isn't available on the Worker session). 3.3 adds real weighting.
  const { data: prompts } = await db
    .from("prompts")
    .select("id, prompt, warm_up")
    .eq("lang", lang)
    .or(`family_id.is.null,family_id.eq.${args.familyId}`)
    .order("warm_up", { ascending: false })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true }); // stable tiebreak (seed rows share created_at)

  const chosen = (prompts ?? []).find(
    (p) => !askedIds.has(p.id) && !UNRESOLVABLE_TOKEN.test(p.prompt),
  );
  if (!chosen) return null;

  return {
    promptId: chosen.id,
    questionText: resolveTokens(chosen.prompt, context),
    address,
    context,
  };
}
