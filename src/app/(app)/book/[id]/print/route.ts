import { NextResponse } from "next/server";
import { getActiveMembership } from "@/lib/auth";
import { loadBook } from "@/lib/book";
import { buildVoiceQrs } from "@/lib/book/voice-qr";
import { renderBookHtml } from "@/lib/book/print-html";

// In-browser print view of the keepsake (TODO 7.3). Returns a self-contained,
// print-optimized HTML document the family can open and Save-as-PDF from their
// own browser (Ctrl/Cmd-P) — and the fallback when server PDF rendering (the
// BROWSER binding) isn't available. Member-readable, matching book read access:
// RLS-scoped via loadBook; a cross-family id yields no book → 404. Photos resolve
// to the cookie-authed signed-URL route (api/book/photo), which works in the
// signed-in member's own browser.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const active = await getActiveMembership();
  if (!active) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  const { id } = await params;

  const book = await loadBook(active.family_id, id);
  if (!book) {
    return new NextResponse("Not found", { status: 404 });
  }

  const storyIds = book.chapters.flatMap((c) => c.stories.map((s) => s.id));
  const qrs = await buildVoiceQrs(storyIds);

  const photoSrc: Record<string, string> = {};
  for (const c of book.chapters) {
    for (const s of c.stories) {
      for (const p of s.photos) photoSrc[p.id] = `/api/book/photo?id=${p.id}`;
    }
  }

  const html = renderBookHtml({ book, qrs, photoSrc });
  return new NextResponse(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
