// Session assembly (TODO 3.1, 3.3). SERVER-ONLY. Picks the opening question for a
// storyteller's session from the coverage-backbone prompt library and resolves
// its tokens against the storyteller + the interviewer relationship, so the
// surface (and, later, the AI) speak in the right names/pronouns/era.
//
// The storyteller surface has no Supabase Auth session — it is token-scoped — so
// reads here go through the SERVICE ROLE, exactly like validateStorytellerToken.
// family_id/storyteller_id are supplied by the already-validated token, never by
// the client, so these reads stay tenant-scoped.
//
// 3.3 turns the deliberately-minimal 3.1 picker into a real, explainable selector:
// `applies_to` relationship gating, emotional-weight pacing (open with warm-ups,
// gate heavy/legacy prompts behind a few sessions, never stack two heavy), topic
// weighting toward under-covered categories, and an Avoid-topics seam. All plain
// arithmetic — deterministic (no randomness; Math.random isn't available on the
// Worker session) and explainable, matching the signals philosophy.
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
type Weight = "light" | "medium" | "heavy";

// Tokens we have no data source for yet ({partner}, {asker_parent}). Skip prompts
// that need them so we never substitute an empty string into the question. Those
// prompts are also relationship-gated (parent/grandparent/aunt_uncle); revisit
// once those facts are captured.
const UNRESOLVABLE_TOKEN = /\{partner\}|\{asker_parent\}/;

// Emotional-weight pacing thresholds (TODO 3.3 / SPEC § The AI interview loop).
// Heavy prompts (incl. the heavy-leaning Legacy category) stay locked until the
// storyteller has settled into the rhythm; the first couple of sessions lead with
// warm-ups. Tunable here; explainable by design.
const HEAVY_GATE_SESSIONS = 3; // no heavy prompts until this many completed sessions
const WARMUP_SESSIONS = 2;     // warm-ups rank first for the first N sessions

// A library prompt row, as much as the selector needs to rank it.
export type PromptCandidate = {
  id: string;
  prompt: string;
  category: string;
  applies_to: Kind[] | string[];
  emotional_weight: Weight;
  warm_up: boolean;
};

// The per-storyteller pacing/coverage signals the selector reasons over. Computed
// from data server-side; never trusted from the client.
export type SelectionSignals = {
  kind: Kind;                       // interviewer relationship — drives applies_to gating
  askedPromptIds: Set<string>;      // prompts already answered → never re-ask
  completedSessions: number;        // gates heavy prompts; emphasizes early warm-ups
  lastAnswerWeight: Weight | null;  // most recent answer's weight → never stack heavy
  categoryCounts: Map<string, number>; // answers per category → topic weighting
  avoidCategories: Set<string>;     // admin Avoid topics (5.3 seam; empty for now)
};

// Pure, deterministic selection. Filters the candidate pool by the 3.3 rules, then
// ranks the survivors. Returns the chosen prompt, or null if nothing is eligible.
export function selectOpeningPrompt(
  candidates: PromptCandidate[],
  s: SelectionSignals,
): PromptCandidate | null {
  // The most recent answer was heavy → don't follow it with another heavy one.
  const blockHeavyNow = s.lastAnswerWeight === "heavy";
  // Heavy/legacy prompts are gated until the storyteller has a few sessions in.
  const heavyUnlocked = s.completedSessions >= HEAVY_GATE_SESSIONS;
  const earlySession = s.completedSessions < WARMUP_SESSIONS;

  const eligible = candidates.filter((p) => {
    if (s.askedPromptIds.has(p.id)) return false;            // never re-ask
    if (UNRESOLVABLE_TOKEN.test(p.prompt)) return false;     // no data for {partner}/{asker_parent}
    if (s.avoidCategories.has(p.category)) return false;     // admin Avoid topics
    // applies_to gating: prompt must fit the interviewer relationship (or be universal).
    const appliesTo = p.applies_to as string[];
    if (!appliesTo.includes("any") && !appliesTo.includes(s.kind)) return false;
    // emotional-weight gating: hold heavy prompts back until paced for them.
    if (p.emotional_weight === "heavy" && (!heavyUnlocked || blockHeavyNow)) return false;
    return true;
  });
  if (!eligible.length) return null;

  // Rank by an ascending key tuple (lower wins). The input arrives in stable
  // (created_at, id) order, so ties keep that deterministic order under V8's
  // stable sort.
  const ranked = [...eligible].sort((a, b) => {
    // 1. Early sessions open with warm-ups.
    const aWarmFirst = earlySession && !a.warm_up ? 1 : 0;
    const bWarmFirst = earlySession && !b.warm_up ? 1 : 0;
    if (aWarmFirst !== bWarmFirst) return aWarmFirst - bWarmFirst;
    // 2. Topic weighting: prefer the least-covered category.
    const aCov = s.categoryCounts.get(a.category) ?? 0;
    const bCov = s.categoryCounts.get(b.category) ?? 0;
    if (aCov !== bCov) return aCov - bCov;
    // 3. Gentle bias toward warm-ups on the tiebreak.
    const aWarm = a.warm_up ? 0 : 1;
    const bWarm = b.warm_up ? 0 : 1;
    if (aWarm !== bWarm) return aWarm - bWarm;
    return 0; // stable: falls back to the DB's (created_at, id) order
  });
  return ranked[0];
}

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
  // Admin Avoid topics (categories). Wired by Topics steering (TODO 5.3); until
  // then no avoid store exists, so this stays empty and the filter is a no-op.
  avoidCategories?: Iterable<string>;
}): Promise<AssembledQuestion | null> {
  const db = supabaseService();

  // 1 & 2. Resolve the relationship context (storyteller facts + interviewer edge).
  const context = await buildRelationshipContext(args.storytellerId);
  if (!context) return null;
  const lang = context.lang;
  const address = context.address;

  // 3. Pacing/coverage signals, all derived from this storyteller's own history.
  //    a) Which prompts they've already answered → never re-ask.
  //    b) Per-category answer counts + the most recent answer's weight (one join).
  //    c) How many sessions they've completed → heavy gating + early warm-ups.
  const [askedRes, answeredRes, sessionsRes] = await Promise.all([
    db
      .from("answers")
      .select("prompt_id")
      .eq("storyteller_id", args.storytellerId)
      .not("prompt_id", "is", null),
    db
      .from("answers")
      .select("created_at, prompts(category, emotional_weight)")
      .eq("storyteller_id", args.storytellerId)
      .not("prompt_id", "is", null)
      .order("created_at", { ascending: false }),
    db
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("storyteller_id", args.storytellerId)
      .eq("status", "completed"),
  ]);

  const askedPromptIds = new Set(
    (askedRes.data ?? []).map((a) => a.prompt_id as string),
  );

  // Per-category counts (topic weighting) + the latest weight (never-stack-heavy).
  const categoryCounts = new Map<string, number>();
  let lastAnswerWeight: Weight | null = null;
  for (const row of answeredRes.data ?? []) {
    const p = (row as { prompts: { category: string; emotional_weight: Weight } | { category: string; emotional_weight: Weight }[] | null }).prompts;
    const rec = Array.isArray(p) ? p[0] : p;
    if (!rec) continue;
    categoryCounts.set(rec.category, (categoryCounts.get(rec.category) ?? 0) + 1);
    // Rows arrive newest-first, so the first one we see is the most recent.
    if (lastAnswerWeight === null) lastAnswerWeight = rec.emotional_weight;
  }

  const completedSessions = sessionsRes.count ?? 0;

  // 4. Candidate prompts: global library + this family's custom, in the
  //    storyteller's language, in stable (created_at, id) order so the selector's
  //    ties resolve deterministically. The 3.3 selector applies the gating/pacing/
  //    weighting; the DB just supplies the pool.
  const { data: prompts } = await db
    .from("prompts")
    .select("id, prompt, category, applies_to, emotional_weight, warm_up")
    .eq("lang", lang)
    .or(`family_id.is.null,family_id.eq.${args.familyId}`)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  const chosen = selectOpeningPrompt((prompts ?? []) as PromptCandidate[], {
    kind: context.kind,
    askedPromptIds,
    completedSessions,
    lastAnswerWeight,
    categoryCounts,
    avoidCategories: new Set(args.avoidCategories ?? []),
  });
  if (!chosen) return null;

  return {
    promptId: chosen.id,
    questionText: resolveTokens(chosen.prompt, context),
    address,
    context,
  };
}
