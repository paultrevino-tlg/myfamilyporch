// Voice-QR play tokens (TODO 7.2). The token printed into a story's QR code in
// the keepsake. A relative scans it from the physical book and lands on the
// public /p/<token> page — NO login, never expires, so the keepsake plays even
// for someone who has no account (SPEC § The keepsake book: "each story gets a
// voice QR to the recording").
//
// Design — a deterministic, unguessable, DB-less bearer token over the answer id:
//  - DETERMINISTIC: encrypting the same answer id always yields the same token,
//    so the QR is STABLE across reprints (regenerating the book never invalidates
//    a book already in someone's hands). Achieved with a message-derived IV
//    (SIV-style) instead of a random one — each answer id gets its own IV, so the
//    GCM (key, IV) pair is never reused across different messages.
//  - UNGUESSABLE + TAMPER-PROOF: AES-GCM under a key derived from
//    STORYTELLER_TOKEN_SECRET (domain-separated from the magic-link uses). A
//    forged/edited token fails the GCM tag → null (fail closed). The answer id is
//    encrypted, not in the clear.
//  - NO DB ROW: nothing to store or look up; revocation is global (rotate the
//    secret). Right trade-off for a keepsake meant to last (a per-story revoke
//    would need a table — deliberately not built; see TODO 7.2).
//
// All Web Crypto so it runs on the Worker. Reads the app secret → SERVER-ONLY.
import { utf8, toBase64Url, fromBase64Url } from "@/lib/storyteller/crypto";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Copy any view into a fresh ArrayBuffer-backed Uint8Array. WebCrypto's
// BufferSource wants Uint8Array<ArrayBuffer>, but .slice() widens to
// ArrayBufferLike — this pins it back (same reason lib/storyteller/crypto's
// helpers allocate explicitly).
function ab(view: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(view.byteLength));
  out.set(view);
  return out;
}

// Derive the AES-GCM key from the app secret, domain-separated (":voice-qr") from
// the storyteller magic-link encrypt/HMAC uses of the same secret. Null if unset
// → callers fail closed rather than minting/reading with a missing key.
async function aesKey(): Promise<CryptoKey | null> {
  const secret = process.env.STORYTELLER_TOKEN_SECRET;
  if (!secret) {
    console.error("[book/play-token] STORYTELLER_TOKEN_SECRET is not set");
    return null;
  }
  const material = await crypto.subtle.digest("SHA-256", utf8(`${secret}:voice-qr`));
  return crypto.subtle.importKey("raw", material, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

// Deterministic 12-byte IV bound to BOTH the secret and the answer id. Distinct
// answer ids → distinct IVs (no GCM nonce reuse across messages); the same answer
// id always reproduces the same IV → the same token.
async function deriveIv(answerId: string): Promise<Uint8Array<ArrayBuffer>> {
  const secret = process.env.STORYTELLER_TOKEN_SECRET ?? "";
  const h = await crypto.subtle.digest("SHA-256", utf8(`${secret}:voice-qr-iv:${answerId}`));
  return ab(new Uint8Array(h).slice(0, 12));
}

// A UUID is packed into 16 raw bytes (not its 36-char string) to keep the token —
// and therefore the QR — as dense as possible.
function uuidToBytes(uuid: string): Uint8Array<ArrayBuffer> {
  const hex = uuid.replace(/-/g, "");
  const out = new Uint8Array(new ArrayBuffer(16));
  for (let i = 0; i < 16; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToUuid(bytes: Uint8Array): string {
  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// Mint the stable play token for a top-level answer id. Returns base64url(iv[12] ‖
// ciphertext) or null if the secret is unset / the id is malformed.
export async function mintPlayToken(answerId: string): Promise<string | null> {
  if (!UUID_RE.test(answerId)) return null;
  const key = await aesKey();
  if (!key) return null;
  const iv = await deriveIv(answerId);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, uuidToBytes(answerId));
  const out = new Uint8Array(iv.length + ct.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(ct), iv.length);
  return toBase64Url(out.buffer);
}

// Read a presented play token back to its answer id. Fails closed (null) on a
// missing key, a malformed blob, or a failed GCM tag (forged/edited token) —
// never throws, so the public page/route can render a calm dead-link state.
export async function readPlayToken(token: string): Promise<string | null> {
  if (!token) return null;
  const key = await aesKey();
  if (!key) return null;
  try {
    const bytes = fromBase64Url(token);
    if (bytes.length !== 12 + 16 + 16) return null; // iv ‖ (16-byte uuid + 16-byte tag)
    const iv = ab(bytes.slice(0, 12));
    const ct = ab(bytes.slice(12));
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    const uuid = bytesToUuid(new Uint8Array(pt));
    return UUID_RE.test(uuid) ? uuid : null;
  } catch {
    return null;
  }
}
