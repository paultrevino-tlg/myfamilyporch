// Print layout for the keepsake (TODO 7.3). The SINGLE source of truth for how a
// book renders to paper — consumed by BOTH the in-browser print view
// (/book/[id]/print, photos resolved to the signed-URL route) AND the server PDF
// generator (lib/book/pdf.ts, photos resolved to inline data: URIs so the
// headless browser needs no auth back into the app). Pure: same inputs → same
// HTML string, no I/O. Page breaks per chapter, vector voice-QR SVGs (7.2),
// typography matching the app (Fraunces + Atkinson Hyperlegible).
import { t, type Lang } from "@/lib/i18n";
import type { Book } from "@/lib/book";
import type { VoiceQr } from "@/lib/book/voice-qr";

// HTML-escape text content (story transcripts/questions/captions are user data).
function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// The stylesheet is embedded so the document is fully self-contained (the PDF
// renderer feeds it via setContent with no base URL). Margins live in @page so
// both consumers honor the same trim; the PDF path sets preferCSSPageSize.
function styles(): string {
  return `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Atkinson+Hyperlegible:wght@400;700&display=swap');
@page { size: Letter; margin: 0.75in; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: 'Atkinson Hyperlegible', ui-sans-serif, system-ui, sans-serif;
  color: #15233B;
  font-size: 11.5pt;
  line-height: 1.55;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
h1, h2, h3, .serif { font-family: 'Fraunces', Georgia, 'Times New Roman', serif; }

/* Cover — its own page, warm keepsake palette (matches the on-screen cover). */
.cover {
  break-after: page;
  background: linear-gradient(135deg, #3a2c1c, #5a4327);
  color: #f3e7d2;
  border-radius: 16px;
  padding: 2.2in 0.6in;
  text-align: center;
  min-height: 7.5in;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.cover .eyebrow { font-size: 10pt; letter-spacing: 0.18em; text-transform: uppercase; color: #cdbb9c; }
.cover .title { font-family: 'Fraunces', Georgia, serif; font-size: 34pt; font-weight: 600; line-height: 1.1; margin: 0.18in 0; }
.cover .sub { font-size: 12pt; color: #cdbb9c; }

/* Chapters — each begins on a fresh page. */
.chapter { break-before: page; }
.chapter:first-of-type { break-before: auto; }
.chapter-title {
  font-size: 20pt;
  font-weight: 600;
  color: #0284C7;
  border-bottom: 1.5px solid #E1E9F2;
  padding-bottom: 0.08in;
  margin: 0 0 0.22in;
}

/* Stories. Keep a story's heading+QR together; allow long transcripts to flow. */
.story { margin: 0 0 0.32in; }
.story-q { font-family: 'Fraunces', Georgia, serif; font-size: 13pt; font-weight: 600; margin: 0 0 0.06in; break-after: avoid; }
.story-body { margin: 0; }
.transcript { margin: 0.04in 0; white-space: pre-wrap; }

/* Follow-up thread — indented, quieter. */
.followups { margin: 0.1in 0 0 0.2in; padding-left: 0.18in; border-left: 2px solid #E1E9F2; }
.followup { margin: 0 0 0.12in; }
.followup-q { font-style: italic; color: #15233B; margin: 0 0 0.02in; }
.followup .transcript { color: #15233B; }

/* Photos. */
.photos { display: flex; flex-wrap: wrap; gap: 0.16in; margin: 0.12in 0; }
.photo { break-inside: avoid; max-width: 2.4in; }
.photo img { max-width: 2.4in; max-height: 2.4in; border: 1px solid #E1E9F2; border-radius: 8px; object-fit: cover; display: block; }
.photo figcaption { font-size: 9pt; color: #5a6b85; margin-top: 0.03in; }

/* Voice QR. */
.qr { break-inside: avoid; display: inline-flex; flex-direction: column; align-items: center; gap: 0.04in; margin: 0.1in 0; }
.qr svg { width: 1.1in; height: 1.1in; }
.qr figcaption { font-size: 8.5pt; color: #5a6b85; max-width: 1.4in; text-align: center; line-height: 1.2; }

.empty { text-align: center; color: #5a6b85; padding: 2in 0; font-size: 12pt; }
`;
}

function renderPhoto(id: string, caption: string | null, src: string | undefined): string {
  if (!src) return "";
  return `<figure class="photo"><img src="${esc(src)}" alt="${esc(caption ?? "Story photo")}" />${
    caption ? `<figcaption>${esc(caption)}</figcaption>` : ""
  }</figure>`;
}

function renderQr(qr: VoiceQr | undefined, name: string, lang: Lang): string {
  if (!qr) return "";
  // qr.svg is library-generated markup (no user input) — safe to inline.
  return `<figure class="qr">${qr.svg}<figcaption>${esc(t(lang, "qr_caption", { name }))}</figcaption></figure>`;
}

// Build the complete, self-contained HTML document for a book.
//   photoSrc: photoId → resolved <img src> (signed-URL route for the print view,
//   data: URI for the PDF). Photos without a src are simply omitted.
export function renderBookHtml({
  book,
  qrs,
  photoSrc,
}: {
  book: Book;
  qrs: Record<string, VoiceQr>;
  photoSrc: Record<string, string>;
}): string {
  const lang = book.language;
  const name = book.storytellerName;

  const cover = `
<div class="cover">
  <div class="eyebrow">The life &amp; stories of</div>
  <div class="title">${esc(name)}</div>
  <div class="sub">${book.storyCount} ${book.storyCount === 1 ? "story" : "stories"} · in their own voice</div>
</div>`;

  let body: string;
  if (book.chapters.length === 0) {
    body = `<div class="empty">Nothing is in the book yet.</div>`;
  } else {
    body = book.chapters
      .map((chapter) => {
        const stories = chapter.stories
          .map((story) => {
            const photos = story.photos
              .map((p) => renderPhoto(p.id, p.caption, photoSrc[p.id]))
              .join("");
            const followUps = story.followUps
              .map(
                (f) =>
                  `<div class="followup">${
                    f.question ? `<p class="followup-q">${esc(f.question)}</p>` : ""
                  }${f.transcript ? `<p class="transcript">${esc(f.transcript)}</p>` : ""}</div>`,
              )
              .join("");
            return `
<div class="story">
  <h3 class="story-q">${esc(story.question ?? "Untitled story")}</h3>
  <div class="story-body">
    ${story.transcript ? `<p class="transcript">${esc(story.transcript)}</p>` : ""}
    ${photos ? `<div class="photos">${photos}</div>` : ""}
    ${followUps ? `<div class="followups">${followUps}</div>` : ""}
    ${renderQr(qrs[story.id], name, lang)}
  </div>
</div>`;
          })
          .join("");
        return `<section class="chapter"><h2 class="chapter-title">${esc(chapter.category)}</h2>${stories}</section>`;
      })
      .join("");
  }

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(name)} — My Family Porch</title>
<style>${styles()}</style>
</head>
<body>${cover}${body}</body>
</html>`;
}
