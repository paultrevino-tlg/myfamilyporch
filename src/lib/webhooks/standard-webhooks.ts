// Standard Webhooks (https://www.standardwebhooks.com) signature verification.
// Used to authenticate Supabase Auth's "Send Email" hook before we trust its
// payload. Pure Web Crypto (crypto.subtle) — no Node-only APIs, so it runs on
// the Cloudflare Workers runtime. Constant-time compare, ±5-min timestamp
// tolerance, and multi-signature support for key rotation.

const TOLERANCE_SECONDS = 5 * 60;

export type WebhookHeaders = {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
};

// Build over an explicit ArrayBuffer so the result is Uint8Array<ArrayBuffer>,
// which crypto.subtle's BufferSource overloads require.
function fromBase64(s: string): Uint8Array<ArrayBuffer> {
  const binary = atob(s);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function utf8(s: string): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder().encode(s);
  const bytes = new Uint8Array(new ArrayBuffer(enc.byteLength));
  bytes.set(enc);
  return bytes;
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function verifyStandardWebhook(
  payload: string,
  headers: WebhookHeaders,
  secret: string,
): Promise<boolean> {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;

  // Reject stale / replayed deliveries.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > TOLERANCE_SECONDS) return false;

  // Secret may arrive as "v1,whsec_<base64>", "whsec_<base64>", or "<base64>".
  let raw = secret.startsWith("v1,") ? secret.slice(3) : secret;
  if (raw.startsWith("whsec_")) raw = raw.slice("whsec_".length);

  const key = await crypto.subtle.importKey(
    "raw",
    fromBase64(raw),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signedContent = `${id}.${timestamp}.${payload}`;
  const sig = await crypto.subtle.sign("HMAC", key, utf8(signedContent));
  const expected = toBase64(sig);

  // webhook-signature is a space-separated list of "v1,<base64sig>" entries.
  for (const entry of signature.split(" ")) {
    const comma = entry.indexOf(",");
    const value = comma === -1 ? entry : entry.slice(comma + 1);
    if (value && timingSafeEqual(value, expected)) return true;
  }
  return false;
}
