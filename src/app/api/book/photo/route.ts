import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";

// Keepsake photos (TODO 7.1). Two halves, same private-media pattern as the
// story audio route (api/stories/audio):
//
//   GET  ?id=<photoId>  — serve a photo. Read the story_photos row through the
//        cookie-bound SSR client (RLS sp_select = is_member_of, ANY role — so
//        viewers see book photos too); a cross-family id simply returns no row
//        → 404. Only AFTER that membership-gated read do we mint a short-lived
//        SIGNED URL with the service role (the bucket has no Storage policies)
//        and 307-redirect. An <img src> follows the redirect.
//
//   POST  (multipart)   — admin uploads one or more images for a story. Admin-
//        gated (RLS sp_write = admin is the real boundary); the answer must
//        belong to the active family. Bytes go straight to the private bucket
//        via the service role; we persist a story_photos row per image.

const BUCKET = "story-photos";
const SIGNED_URL_TTL_SEC = 300; // 5 min — long enough to render, no more
const MAX_BYTES = 10 * 1024 * 1024; // mirrors the bucket's 10 MiB limit
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function GET(req: NextRequest) {
  const photoId = req.nextUrl.searchParams.get("id") ?? "";
  if (!UUID_RE.test(photoId)) {
    return NextResponse.json({ error: "bad photo id" }, { status: 400 });
  }

  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  // Membership-gated read: RLS scopes this to the caller's families + any role.
  const { data: photo } = await sb
    .from("story_photos")
    .select("storage_path")
    .eq("id", photoId)
    .maybeSingle();
  if (!photo?.storage_path) {
    return NextResponse.json({ error: "no photo" }, { status: 404 });
  }

  const svc = supabaseService();
  const { data: signed, error } = await svc.storage
    .from(BUCKET)
    .createSignedUrl(photo.storage_path, SIGNED_URL_TTL_SEC);
  if (error || !signed?.signedUrl) {
    console.error("[book/photo] could not sign url", error);
    return NextResponse.json({ error: "could not load photo" }, { status: 502 });
  }
  return NextResponse.redirect(signed.signedUrl, 307);
}

export async function POST(req: NextRequest) {
  const active = await getActiveMembership();
  if (!active || !roleAtLeast(active.role, "admin")) {
    return NextResponse.json({ error: "admin required" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "expected multipart form" }, { status: 400 });
  }

  const answerId = String(form.get("answer_id") ?? "");
  if (!UUID_RE.test(answerId)) {
    return NextResponse.json({ error: "bad answer id" }, { status: 400 });
  }

  const files = form
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) {
    return NextResponse.json({ error: "no photos" }, { status: 400 });
  }
  for (const f of files) {
    if (!EXT[f.type]) {
      return NextResponse.json({ error: "unsupported image type" }, { status: 415 });
    }
    if (f.size > MAX_BYTES) {
      return NextResponse.json({ error: "image too large" }, { status: 413 });
    }
  }

  // The answer must belong to the active family. RLS already scopes this read to
  // the caller's families; the explicit family filter refuses a stray id and
  // gives us the storyteller_id for the object key.
  const sb = await supabaseServer();
  const { data: answer } = await sb
    .from("answers")
    .select("id, storyteller_id")
    .eq("id", answerId)
    .eq("family_id", active.family_id)
    .maybeSingle();
  if (!answer) {
    return NextResponse.json({ error: "no such story" }, { status: 404 });
  }

  const svc = supabaseService();

  // Append after any existing photos so new uploads land at the end.
  const { data: existing } = await svc
    .from("story_photos")
    .select("sort")
    .eq("answer_id", answerId);
  let nextSort =
    (existing ?? []).reduce((m, p) => Math.max(m, p.sort ?? 0), 0) + 1;

  const inserted: string[] = [];
  for (const f of files) {
    const ext = EXT[f.type];
    const key = `${active.family_id}/${answer.storyteller_id}/${answerId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await svc.storage
      .from(BUCKET)
      .upload(key, await f.arrayBuffer(), { contentType: f.type, upsert: false });
    if (upErr) {
      console.error("[book/photo] upload failed", upErr);
      return NextResponse.json({ error: "upload failed" }, { status: 502 });
    }
    const { data: row, error: insErr } = await svc
      .from("story_photos")
      .insert({
        family_id: active.family_id,
        answer_id: answerId,
        storage_path: key,
        sort: nextSort++,
      })
      .select("id")
      .single();
    if (insErr || !row) {
      console.error("[book/photo] row insert failed", insErr);
      await svc.storage.from(BUCKET).remove([key]); // don't orphan the object
      return NextResponse.json({ error: "could not save photo" }, { status: 500 });
    }
    inserted.push(row.id);
  }

  return NextResponse.json({ ok: true, photo_ids: inserted });
}
