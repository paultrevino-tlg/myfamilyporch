// Setup-wizard state (consent-flow.md "Family-member setup" + the setup-overview
// graphic). The current step is DERIVED from data each render — no stored wizard
// column, so it's always accurate and resumable (a member can leave and come
// back, or finish a step on their phone, and /setup reflects reality).
import { supabaseServer } from "@/lib/supabase/server";
import type { Lang } from "@/lib/i18n";

export type SetupStep =
  | "create_family"
  | "verify_number"
  | "add_storyteller"
  | "send_link"
  | "ready";

// Maps a step to its position on the 6-stop overview graphic. Step 5 ("they
// approve") is the storyteller's own action on their phone, so from the member's
// side the next visible state after "send_link" (4) is "ready" (6).
export const STEP_NO: Record<SetupStep, number> = {
  create_family: 1,
  verify_number: 2,
  add_storyteller: 3,
  send_link: 4,
  ready: 6,
};

// Pure — unit-tested. Given the family/member/storyteller facts, pick the step.
export function deriveSetupStep(input: {
  hasFamily: boolean;
  memberOptedIn: boolean;
  storytellers: { consent_state: string }[];
}): SetupStep {
  if (!input.hasFamily) return "create_family";
  if (!input.memberOptedIn) return "verify_number";
  if (input.storytellers.length === 0) return "add_storyteller";
  // Once ANY storyteller has opted in, the core setup is done — additional
  // pending storytellers are managed from their hub, not the wizard.
  if (input.storytellers.some((s) => s.consent_state === "opted_in")) return "ready";
  return "send_link";
}

// ---------------------------------------------------------------------------
// Per-storyteller setup (/storytellers/[id]/setup)
//
// The family wizard above deliberately stops at "ready" once the family has one
// opted-in storyteller — every storyteller after that is onboarded through this
// flow instead. Same philosophy: DERIVED from data, never a stored column, so
// it's always accurate and a member can walk away and come back.
export type StorytellerSetupStep =
  | "number"
  | "schedule"
  | "invite"
  | "stopped"
  | "ready";

// The member's own steps, in order. The storyteller's opt-in is deliberately NOT
// in this list — it's their action, not the member's, and rendering it as a
// fourth identical dot made the flow look unfinishable.
export const ST_STEPS: { key: StorytellerSetupStep; label: string }[] = [
  { key: "number", label: "Number" },
  { key: "schedule", label: "Schedule" },
  { key: "invite", label: "Invite" },
];

export const ST_STEP_NO: Record<StorytellerSetupStep, number> = {
  number: 1,
  schedule: 2,
  invite: 3,
  stopped: 3, // an opt-out sits at the invite stop; it isn't progress
  ready: 4, // past the member's last step — the hand-off is done
};

// Pure. "invite" covers both "send it" and "waiting for them", because nothing
// records whether the member actually sent the text; the panel shows the invite
// and the waiting state together rather than claiming to know.
//
// Schedule comes BEFORE the invite on purpose. runScheduler only iterates rows
// in the schedules table, so a storyteller with no schedule is never considered
// and never nudged — while sms_storyteller_welcome has already promised them
// "we'll text you when it's time to start". Getting consent first and the
// schedule later is exactly how that promise gets broken.
export function deriveStorytellerSetupStep(input: {
  hasPhone: boolean;
  hasSchedule: boolean;
  consentState: string;
}): StorytellerSetupStep {
  if (input.consentState === "opted_in") return "ready";
  if (!input.hasPhone) return "number";
  if (input.consentState === "opted_out") return "stopped";
  if (!input.hasSchedule) return "schedule";
  return "invite";
}

export type PendingStoryteller = {
  id: string;
  name: string;
  phone: string; // "" when no number is on file yet
  language: Lang;
};

export type SetupState = {
  step: SetupStep;
  currentStepNo: number;
  lang: Lang; // the member's language — drives the localized overview + copy
  pending: PendingStoryteller | null; // set only for the send_link step
  // Has this member recorded their own voice yet? Not a wizard STEP — voice is
  // optional (api/storyteller/voice falls back to a neutral voice), so it never
  // blocks inviting a storyteller. But onboarding has to OFFER it, or the elder
  // silently hears a stranger reading their questions.
  hasVoice: boolean;
};

// Gather the facts (RLS-scoped) and resolve the step. Assumes a family exists
// (the page redirects no-family members to create one first).
export async function loadSetupState(familyId: string, userId: string): Promise<SetupState> {
  const sb = await supabaseServer();
  const [{ data: mem }, { data: sts }, { data: voice }] = await Promise.all([
    sb
      .from("memberships")
      .select("consent_state, language")
      .eq("family_id", familyId)
      .eq("user_id", userId)
      .maybeSingle(),
    sb
      .from("storytellers")
      .select("id, name, phone, language, consent_state")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false }),
    // The caller's OWN clone (voice_profiles.owner_user_id = them).
    sb
      .from("voice_profiles")
      .select("id, label")
      .eq("family_id", familyId)
      .eq("owner_user_id", userId)
      .maybeSingle(),
  ]);

  const storytellers = sts ?? [];
  const step = deriveSetupStep({
    hasFamily: true,
    memberOptedIn: mem?.consent_state === "opted_in",
    storytellers,
  });

  let pending: PendingStoryteller | null = null;
  if (step === "send_link") {
    // Prefer a pending storyteller that already has a number (ready to invite);
    // otherwise surface one so the card can prompt for the number.
    const withPhone = storytellers.find((s) => s.consent_state !== "opted_in" && s.phone?.trim());
    const any = withPhone ?? storytellers.find((s) => s.consent_state !== "opted_in");
    if (any) {
      pending = {
        id: any.id,
        name: any.name,
        phone: (any.phone ?? "").trim(),
        language: any.language === "es" ? "es" : "en",
      };
    }
  }

  return {
    step,
    currentStepNo: STEP_NO[step],
    lang: mem?.language === "es" ? "es" : "en",
    pending,
    hasVoice: !!voice,
  };
}
