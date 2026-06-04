// Voice-QR rendering (TODO 7.2). Turns a story's id into the QR that gets
// printed beside it in the keepsake. We render the QR as an INLINE SVG: vector,
// so it stays razor-sharp at any print DPI (this is what 7.3's print/export will
// embed), and it needs no client JS. SERVER-ONLY (mints the play token, reads
// APP_BASE_URL).
import QRCode from "qrcode";
import { mintPlayToken } from "./play-token";

export type VoiceQr = {
  url: string; // the public /p/<token> playback link the QR encodes
  svg: string; // inline <svg> markup, ready to dangerouslySetInnerHTML
};

// Build the voice QR for one top-level story. Returns null if the play token
// can't be minted (secret unset) — callers simply omit the QR, never dead-end.
export async function buildVoiceQr(answerId: string): Promise<VoiceQr | null> {
  const token = await mintPlayToken(answerId);
  if (!token) return null;
  const base = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
  const url = `${base}/p/${token}`;
  const svg = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    // No width → the SVG is unitless (viewBox only), so the page sizes it with CSS.
  });
  return { url, svg };
}

// Build voice QRs for many stories at once (a whole book). Returns a map keyed by
// answer id; stories whose token can't be minted are simply absent.
export async function buildVoiceQrs(
  answerIds: string[],
): Promise<Record<string, VoiceQr>> {
  const entries = await Promise.all(
    answerIds.map(async (id) => [id, await buildVoiceQr(id)] as const),
  );
  const out: Record<string, VoiceQr> = {};
  for (const [id, qr] of entries) if (qr) out[id] = qr;
  return out;
}
