// Twilio webhook authenticity (X-Twilio-Signature). Shared by every Twilio
// webhook — inbound replies and delivery status callbacks — so there is one
// implementation of the check, and it fails closed.
//
// Signature = Base64(HMAC-SHA1(authToken, url + sorted(key+value))). Web Crypto
// (Worker-compatible), no Node 'crypto' import.

export async function twilioSignature(
  authToken: string,
  url: string,
  params: URLSearchParams,
): Promise<string> {
  const keys = [...new Set([...params.keys()])].sort();
  const payload = url + keys.map((k) => k + params.get(k)).join("");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(mac)));
}

// The public URL Twilio signs — APP_BASE_URL + path, never req.url (the Worker
// may see an internal host behind the proxy).
export function webhookUrl(path: string): string {
  const base = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
  return `${base}${path}`;
}

// True only when the request carries a valid signature for `path`.
export async function verifyTwilioRequest(
  req: Request,
  path: string,
  params: URLSearchParams,
): Promise<boolean> {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return false;
  const presented = req.headers.get("x-twilio-signature") ?? "";
  const expected = await twilioSignature(authToken, webhookUrl(path), params);
  return presented !== "" && presented === expected;
}
