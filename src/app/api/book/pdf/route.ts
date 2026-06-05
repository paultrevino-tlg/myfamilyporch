import { NextRequest, NextResponse } from "next/server";
import { getActiveMembership } from "@/lib/auth";
import { loadBook } from "@/lib/book";
import { renderBookPdf } from "@/lib/book/pdf";

// Keepsake PDF download (TODO 7.3). Auth + RLS + family scoping, then render the
// book to a real PDF via the BROWSER binding and stream it as an attachment.
// Member-readable (matches book read access). If the BROWSER binding isn't
// available (e.g. local dev) the generator returns null → 503 telling the client
// to fall back to the in-browser print view (/book/<id>/print).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Keep a download filename safe and friendly: "<Name> — My Family Porch.pdf".
function filenameFor(name: string): string {
  const clean = name.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "Keepsake";
  return `${clean} - My Family Porch.pdf`;
}

export async function GET(req: NextRequest) {
  const storytellerId = req.nextUrl.searchParams.get("storyteller") ?? "";
  if (!UUID_RE.test(storytellerId)) {
    return NextResponse.json({ error: "bad storyteller id" }, { status: 400 });
  }

  const active = await getActiveMembership();
  if (!active) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  // RLS-scoped existence + family check (a cross-family id yields no book → 404).
  const book = await loadBook(active.family_id, storytellerId);
  if (!book) {
    return NextResponse.json({ error: "no such book" }, { status: 404 });
  }

  let pdf: Uint8Array | null;
  try {
    pdf = await renderBookPdf(active.family_id, storytellerId);
  } catch (err) {
    console.error("[book/pdf] render failed", err);
    return NextResponse.json({ error: "could not render PDF" }, { status: 502 });
  }
  if (!pdf) {
    return NextResponse.json(
      { error: "PDF rendering unavailable", fallback: `/book/${storytellerId}/print` },
      { status: 503 },
    );
  }

  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filenameFor(book.storytellerName)}"`,
      "cache-control": "private, no-store",
    },
  });
}
