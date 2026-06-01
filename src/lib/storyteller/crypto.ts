// Web Crypto helpers for storyteller magic-link tokens. Split out from token.ts
// so this module carries NO service-role import — server components (e.g. the
// /storytellers page) can import decryptToken without pulling the service client
// into their module graph.
//
// Two distinct uses of STORYTELLER_TOKEN_SECRET, domain-separated:
//  - HMAC (token.ts): the stored, one-way lookup/validation key for a link.
//  - AES-GCM (here): reversible encryption of the raw token at rest, so the
//    shareable /s/<token> URL can be re-displayed to admins. A DB leak alone
//    (without the secret) yields nothing usable.
// SERVER-ONLY: reads the app secret. Never import into a client component.

export function utf8(s: string): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder().encode(s);
  const bytes = new Uint8Array(new ArrayBuffer(enc.byteLength));
  bytes.set(enc);
  return bytes;
}

export function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Derive a 256-bit AES-GCM key from the app secret, domain-separated from the
// HMAC use by the ":link-enc" suffix. Returns null if the secret is unset, so
// callers fail closed rather than encrypting/decrypting with a missing key.
async function aesKey(): Promise<CryptoKey | null> {
  const secret = process.env.STORYTELLER_TOKEN_SECRET;
  if (!secret) {
    console.error("[storyteller/crypto] STORYTELLER_TOKEN_SECRET is not set");
    return null;
  }
  const material = await crypto.subtle.digest("SHA-256", utf8(`${secret}:link-enc`));
  return crypto.subtle.importKey("raw", material, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

// Encrypt a raw token → base64url(iv[12] ‖ ciphertext). Null if the key is unset.
export async function encryptToken(raw: string): Promise<string | null> {
  const key = await aesKey();
  if (!key) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, utf8(raw));
  const out = new Uint8Array(iv.length + ct.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(ct), iv.length);
  return toBase64Url(out.buffer);
}

// Decrypt a stored token. Fails closed (null) on a missing key, a malformed
// blob, or a failed GCM tag — never throws, so callers can render around it.
export async function decryptToken(enc: string): Promise<string | null> {
  const key = await aesKey();
  if (!key) return null;
  try {
    const bytes = fromBase64Url(enc);
    const iv = bytes.slice(0, 12);
    const ct = bytes.slice(12);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new TextDecoder().decode(pt);
  } catch {
    return null;
  }
}
