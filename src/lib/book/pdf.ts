// Server-side keepsake PDF generation (TODO 7.3). Renders the print layout
// (lib/book/print-html) to a real PDF via Cloudflare's Browser Rendering binding.
// SERVER-ONLY: uses the service role to inline photos and the BROWSER binding to
// drive a headless Chromium. Factored as a reusable generator so the full-archive
// export (7.6) can produce the same book.pdf without re-deriving anything.
//
// Failure contract (master-arch "External provider integrations"): a missing
// BROWSER binding (e.g. local `npm run dev`, which has no Cloudflare runtime) →
// fail soft, return null; the caller degrades to the in-browser print view.
import puppeteer from "@cloudflare/puppeteer";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { loadBook } from "@/lib/book";
import { buildVoiceQrs } from "@/lib/book/voice-qr";
import { renderBookHtml } from "@/lib/book/print-html";
import { supabaseService } from "@/lib/supabase/service";

const PHOTO_BUCKET = "story-photos";
const SIGNED_URL_TTL_SEC = 120; // only needed for the inline fetch below

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

// Inline every in-book photo as a data: URI so the rendered HTML is fully
// self-contained — the headless browser needs no auth (and no network) back into
// the app. Scoped to the family (a forged id can't reach another tenant's bytes).
// A photo we can't fetch is simply dropped (the layout omits a missing src).
async function resolvePhotoDataUris(
  familyId: string,
  photoIds: string[],
): Promise<Record<string, string>> {
  if (photoIds.length === 0) return {};
  const svc = supabaseService();
  const { data: rows } = await svc
    .from("story_photos")
    .select("id, storage_path")
    .eq("family_id", familyId)
    .in("id", photoIds);

  const out: Record<string, string> = {};
  await Promise.all(
    (rows ?? []).map(async (row) => {
      if (!row.storage_path) return;
      const ext = row.storage_path.split(".").pop()?.toLowerCase() ?? "";
      const mime = MIME_BY_EXT[ext] ?? "image/jpeg";
      const { data: signed } = await svc.storage
        .from(PHOTO_BUCKET)
        .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SEC);
      if (!signed?.signedUrl) return;
      try {
        const res = await fetch(signed.signedUrl);
        if (!res.ok) return;
        const buf = new Uint8Array(await res.arrayBuffer());
        let binary = "";
        for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
        out[row.id] = `data:${mime};base64,${btoa(binary)}`;
      } catch (err) {
        console.error("[book/pdf] photo inline failed", row.id, err);
      }
    }),
  );
  return out;
}

// Generate the keepsake PDF for one storyteller. Returns the PDF bytes, or null
// if the book doesn't exist for this family or the BROWSER binding is absent.
export async function renderBookPdf(
  familyId: string,
  storytellerId: string,
): Promise<Uint8Array | null> {
  const book = await loadBook(familyId, storytellerId);
  if (!book) return null;

  const storyIds = book.chapters.flatMap((c) => c.stories.map((s) => s.id));
  const photoIds = book.chapters.flatMap((c) =>
    c.stories.flatMap((s) => s.photos.map((p) => p.id)),
  );
  const [qrs, photoSrc] = await Promise.all([
    buildVoiceQrs(storyIds),
    resolvePhotoDataUris(familyId, photoIds),
  ]);
  const html = renderBookHtml({ book, qrs, photoSrc });

  const { env } = getCloudflareContext();
  const binding = (env as Record<string, unknown>).BROWSER as
    | Parameters<typeof puppeteer.launch>[0]
    | undefined;
  if (!binding) {
    console.warn("[book/pdf] no BROWSER binding — cannot render PDF here");
    return null;
  }

  const browser = await puppeteer.launch(binding);
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true, // honor @page Letter + margins from print-html
    });
    return pdf as unknown as Uint8Array;
  } finally {
    await browser.close();
  }
}
