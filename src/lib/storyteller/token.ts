// Storyteller magic-link tokens (TODO 2.2). The SECOND auth surface: storytellers
// never touch Supabase Auth. A token is a high-entropy opaque secret carried in
// the /s/[token] URL; we persist only its HMAC, so a DB leak yields nothing
// usable without STORYTELLER_TOKEN_SECRET. The storyteller_tokens row is the
// source of truth for revocation. All Web Crypto so it runs on the Worker.
//
// SERVER-ONLY: uses the service-role client (bypasses RLS) and the app secret.
// Never import this into a client component.
import { supabaseService } from "@/lib/supabase/service";

// --- Web Crypto helpers (mirrors lib/webhooks/standard-webhooks.ts) ----------

function utf8(s: string): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder().encode(s);
  const bytes = new Uint8Array(new ArrayBuffer(enc.byteLength));
  bytes.set(enc);
  return bytes;
}

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// HMAC-SHA256(secret, token) → base64url. Returns null if the secret is unset,
// so callers fail CLOSED rather than minting/validating with a missing key.
async function hmac(token: string): Promise<string | null> {
  const secret = process.env.STORYTELLER_TOKEN_SECRET;
  if (!secret) {
    console.error("[storyteller/token] STORYTELLER_TOKEN_SECRET is not set");
    return null;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    utf8(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, utf8(token));
  return toBase64Url(sig);
}

// --- mint / validate / revoke ------------------------------------------------

export type ValidToken = {
  storyteller_id: string;
  family_id: string;
  name: string;
  language: string;
};

// Mint a fresh recording link for a storyteller. Returns the raw token (shown to
// the admin ONCE — we only persist its hash). Caller is responsible for having
// authorized the request (admin of the owning family) before calling this.
export async function mintStorytellerToken(
  storytellerId: string,
  familyId: string,
): Promise<string | null> {
  const raw = toBase64Url(crypto.getRandomValues(new Uint8Array(32)).buffer);
  const token_hash = await hmac(raw);
  if (!token_hash) return null;

  const db = supabaseService();
  const { error } = await db.from("storyteller_tokens").insert({
    family_id: familyId,
    storyteller_id: storytellerId,
    token_hash,
  });
  if (error) throw error;
  return raw;
}

// Validate a presented token. Looks up the un-revoked row by HMAC, resolves the
// storyteller, and stamps last_used_at. Returns null on any failure (fail closed).
export async function validateStorytellerToken(token: string): Promise<ValidToken | null> {
  if (!token) return null;
  const token_hash = await hmac(token);
  if (!token_hash) return null;

  const db = supabaseService();
  const { data: row } = await db
    .from("storyteller_tokens")
    .select("id, storyteller_id, family_id, storytellers(name, language)")
    .eq("token_hash", token_hash)
    .is("revoked_at", null)
    .maybeSingle();
  if (!row) return null;

  const st = Array.isArray(row.storytellers) ? row.storytellers[0] : row.storytellers;
  if (!st) return null;

  // Best-effort usage stamp; never block the session on it.
  await db
    .from("storyteller_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id);

  return {
    storyteller_id: row.storyteller_id,
    family_id: row.family_id,
    name: st.name,
    language: st.language,
  };
}

// Revoke every active link for a storyteller (e.g. the device changed hands).
export async function revokeStorytellerTokens(storytellerId: string): Promise<void> {
  const db = supabaseService();
  const { error } = await db
    .from("storyteller_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("storyteller_id", storytellerId)
    .is("revoked_at", null);
  if (error) throw error;
}
