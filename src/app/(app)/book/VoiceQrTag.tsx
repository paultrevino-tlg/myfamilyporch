import { t, type Lang } from "@/lib/i18n";
import type { VoiceQr } from "@/lib/book/voice-qr";

// The voice QR printed beside a story (TODO 7.2). A pure presentational component
// (no hooks, no server-only imports) so BOTH the read-only book (server) and the
// admin editor (client) can render it. The SVG is inline + vector, so it stays
// sharp when 7.3 sends the book to print. Scanning it opens the public /p/<token>
// playback page — no login, never expires.
export default function VoiceQrTag({
  qr,
  name,
  lang,
}: {
  qr: VoiceQr | undefined;
  name: string;
  lang: Lang;
}) {
  if (!qr) return null;
  return (
    <figure className="mt-3 flex w-fit flex-col items-center gap-1">
      <a
        href={qr.url}
        target="_blank"
        rel="noopener"
        className="block h-24 w-24 [&>svg]:h-full [&>svg]:w-full"
        // Inline SVG markup from the qrcode lib (no user input → safe). The QR
        // both scans (phone camera) and clicks/taps through to the same /p/<token>.
        dangerouslySetInnerHTML={{ __html: qr.svg }}
      />
      <figcaption className="max-w-[6.5rem] text-center text-[11px] leading-tight text-ink/55">
        {t(lang, "qr_caption", { name })}
      </figcaption>
    </figure>
  );
}
