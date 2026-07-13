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
};

// Gather the facts (RLS-scoped) and resolve the step. Assumes a family exists
// (the page redirects no-family members to create one first).
export async function loadSetupState(familyId: string, userId: string): Promise<SetupState> {
  const sb = await supabaseServer();
  const [{ data: mem }, { data: sts }] = await Promise.all([
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
  };
}
