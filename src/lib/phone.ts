// Shared phone normalization for SMS. Extracted so the settings admin form
// (storyteller numbers) and the member phone-verification flow
// (PLAN-consent-flow.md) apply exactly the same rule.
//
// Output is always true E.164 (+15551234567) or a rejection — never the bare
// national digits this used to emit. Twilio's API requires E.164, and the
// suppression list is keyed on it, so a stored "4806784044" was both
// unsendable and invisible to the STOP check (see lib/sms/suppression.ts).
// Blank clears the field (value: null).
export type NormalizedPhone =
  | { ok: true; value: string | null }
  | { ok: false };

// Matches a plausible E.164 number: "+", a nonzero country digit, then 6-14 more.
const E164 = /^\+[1-9]\d{6,14}$/;

export function isE164(phone: string): boolean {
  return E164.test(phone);
}

export function normalizePhone(raw: string): NormalizedPhone {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null }; // blank = clear

  const hadPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  // An explicit country code was given — trust it, just sanity-check the length.
  if (hadPlus) {
    if (digits.length < 7 || digits.length > 15) return { ok: false };
    const value = `+${digits}`;
    return isE164(value) ? { ok: true, value } : { ok: false };
  }

  // No country code. The registered A2P campaign is US/NANP, and the elder-facing
  // audience types "480 678 4044", so assume +1 rather than storing something
  // undialable. Anything else has to be entered with its own "+".
  if (digits.length === 10) return { ok: true, value: `+1${digits}` };
  if (digits.length === 11 && digits.startsWith("1")) return { ok: true, value: `+${digits}` };
  return { ok: false };
}

// Last 4 digits of a normalized number, for "confirm the number ending in ••••"
// UIs. Returns "" when there aren't enough digits.
export function last4(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : "";
}

// Display form for a stored E.164 US number: +14806784044 → "+1 (480) 678-4044".
// Non-US or unparseable numbers are returned as-is (still readable).
export function formatPhone(phone: string): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(phone);
  return m ? `+1 (${m[1]}) ${m[2]}-${m[3]}` : phone;
}
