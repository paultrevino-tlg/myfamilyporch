// Shared phone normalization for SMS (E.164-ish). Extracted so the settings
// admin form (storyteller numbers) and the member phone-verification flow
// (docs/consent-flow.md) apply exactly the same rule. Twilio wants E.164
// (+15551234567); we keep a single leading "+" then digits only, and gate on a
// plausible 7–15 digit length. Blank clears the field (value: null).
export type NormalizedPhone =
  | { ok: true; value: string | null }
  | { ok: false };

export function normalizePhone(raw: string): NormalizedPhone {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null }; // blank = clear
  const plus = trimmed.startsWith("+") ? "+" : "";
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return { ok: false };
  return { ok: true, value: `${plus}${digits}` };
}

// Last 4 digits of a normalized number, for "confirm the number ending in ••••"
// UIs. Returns "" when there aren't enough digits.
export function last4(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : "";
}
