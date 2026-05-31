import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Lands here after the emailed link round-trips through Supabase /auth/v1/verify.
// Exchanges the PKCE code for a session cookie, then sends the member into the app.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  // Only allow safe relative redirects — never an absolute/off-site URL.
  const rawNext = url.searchParams.get("next");
  const next = rawNext && rawNext.startsWith("/") ? rawNext : "/dashboard";

  if (code) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  return NextResponse.redirect(new URL("/login?error=auth", url.origin));
}
