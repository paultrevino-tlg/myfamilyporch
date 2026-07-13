// Signed, self-describing consent tokens (docs/consent-flow.md). One primitive,
// two uses, distinguished by `purpose`:
//   - 'member_verify' (Phase 4C.B): proves a family member possesses the number
//      they entered + carries the opt-in context to the confirm page.
//   - 'consent'       (Phase 4C.C): the storyteller authorization link — carries
//      storyteller_id + phone + language so the auth page paints on first load.
//
// Stateless: the HMAC over the JSON payload IS the integrity guarantee, so there
// is no DB row to look up (unlike the storyteller recording tokens, which are
// revocable). The number is carried INSIDE the signed body, never in the visible
// URL path as a guessable id. SERVER-ONLY (reads STORYTELLER_TOKEN_SECRET) —
// never import into a client component.
import { utf8, toBase64Url, fromBase64Url } from "@/lib/storyteller/crypto";
import type { Lang } from "@/lib/i18n";

export type ConsentPurpose = "member_verify" | "consent";

export type ConsentTokenPayload = {
  purpose: ConsentPurpose;
  familyId: string;
  phone: string; // E.164-ish — the number the consent applies to
  language: Lang;
  exp: number; // epoch seconds
  membershipId?: string; // present for 'member_verify'
  storytellerId?: string; // present for 'consent'
};

// HMAC-SHA256 over the token body, domain-separated from the storyteller-token
// HMAC (":consent") and the AES key (":link-enc"). Null if the secret is unset
// so callers fail CLOSED rather than signing/verifying with a missing key.
async function hmac(body: string): Promise<string | null> {
  const secret = process.env.STORYTELLER_TOKEN_SECRET;
  if (!secret) {
    console.error("[consent/token] STORYTELLER_TOKEN_SECRET is not set");
    return null;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    utf8(`${secret}:consent`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, utf8(body));
  return toBase64Url(sig);
}

// Constant-time string compare (both are same-length base64url of a fixed-size
// MAC in practice, but guard length anyway).
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

// Sign a payload → "<base64url(body)>.<base64url(sig)>". Null if the secret is
// unset. `nowMs` is injected for testability (real callers pass Date.now()).
export async function signConsentToken(
  fields: Omit<ConsentTokenPayload, "exp">,
  ttlSeconds: number,
  nowMs: number,
): Promise<string | null> {
  const payload: ConsentTokenPayload = {
    ...fields,
    exp: Math.floor(nowMs / 1000) + ttlSeconds,
  };
  const body = toBase64Url(utf8(JSON.stringify(payload)).buffer);
  const sig = await hmac(body);
  if (!sig) return null;
  return `${body}.${sig}`;
}

// Verify signature + purpose + expiry, then return the parsed payload. Returns
// null on any failure (bad signature, wrong purpose, expired, malformed,
// missing secret). Never throws — pages render a calm dead-link screen on null.
export async function verifyConsentToken(
  token: string,
  expectedPurpose: ConsentPurpose,
  nowMs: number,
): Promise<ConsentTokenPayload | null> {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = await hmac(body);
  if (!expected || !timingSafeEqual(sig, expected)) return null;

  let payload: ConsentTokenPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
  } catch {
    return null;
  }
  if (!payload || payload.purpose !== expectedPurpose) return null;
  if (typeof payload.exp !== "number" || Math.floor(nowMs / 1000) > payload.exp) {
    return null;
  }
  return payload;
}
