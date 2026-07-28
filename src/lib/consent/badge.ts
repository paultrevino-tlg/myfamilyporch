// One vocabulary for "can we text this person yet?", shared by every admin
// surface that shows it (the dashboard cards, the storyteller hub's Phone row,
// and the member's own Settings panel).
//
// It exists because the answer is easy to get wrong by eye: a saved phone number
// looks like a finished setup, but until the storyteller taps their own
// /c/<token> page and opts in, preSendGate blocks every message. That gap is the
// most common reason a family thinks reminders are on when nothing is being sent.
export type ConsentState = "pending" | "opted_in" | "opted_out";

export type ConsentBadge = { label: string; cls: string };

// `hasPhone` is separate from the state because a storyteller with no number at
// all is a different (earlier) problem than one who simply hasn't opted in yet.
export function consentBadge(state: ConsentState, hasPhone: boolean): ConsentBadge {
  if (!hasPhone) return { label: "No number", cls: "bg-surface2 text-ink/55 ring-1 ring-line" };
  switch (state) {
    case "opted_in":
      return { label: "✓ Verified", cls: "bg-emerald-50 text-emerald-700" };
    case "opted_out":
      return { label: "Opted out", cls: "bg-amber-100 text-amber-800" };
    default:
      return { label: "Not verified", cls: "bg-amber-100 text-amber-800" };
  }
}
