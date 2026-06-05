import { NextRequest, NextResponse } from "next/server";
import { getActiveMembership } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

// "Download everything" download (TODO 7.6). Mirrors api/stories/audio: the
// membership-gated read happens FIRST through the cookie-bound SSR client (RLS
// exp_select = is_member_of scopes it to the caller's families and any role —
// ownership is never gated), and ONLY then do we mint a short-lived SIGNED URL
// with the service role and 307-redirect. The download link emailed to the user
// points here (login-gated), never at a raw bearer URL — so no personal data or
// storage path leaks in a query string.
export const dynamic = "force-dynamic";

const EXPORT_BUCKET = "family-exports";
const SIGNED_URL_TTL_SEC = 300; // 5 minutes — long enough to start the download
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("job") ?? "";
  if (!UUID_RE.test(jobId)) {
    return NextResponse.json({ error: "bad job id" }, { status: 400 });
  }

  const active = await getActiveMembership();
  if (!active) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  // RLS-scoped read: a job from another family yields no row → 404.
  const { data: job } = await sb
    .from("exports")
    .select("status, zip_path, expires_at")
    .eq("id", jobId)
    .maybeSingle();
  if (!job || job.status !== "ready" || !job.zip_path) {
    return NextResponse.json({ error: "export not ready" }, { status: 404 });
  }
  if (job.expires_at && new Date(job.expires_at).getTime() < Date.now()) {
    // The ZIP has expired (and likely been cleaned up) — ask for a fresh one.
    return NextResponse.json({ error: "export expired" }, { status: 410 });
  }

  // Access established; mint the signed URL with the service role. The download
  // option forces a Save-As with the friendly ZIP filename from the object key.
  const filename = job.zip_path.split("/").pop() || "MyFamilyPorch-export.zip";
  const svc = supabaseService();
  const { data: signed, error } = await svc.storage
    .from(EXPORT_BUCKET)
    .createSignedUrl(job.zip_path, SIGNED_URL_TTL_SEC, { download: filename });
  if (error || !signed?.signedUrl) {
    console.error("[api/export/download] could not sign url", error);
    return NextResponse.json({ error: "could not load download" }, { status: 502 });
  }

  return NextResponse.redirect(signed.signedUrl, 307);
}
