import { NextRequest, NextResponse } from "next/server";

// Stable signup entry (Phase 8.5). The marketing "Get started" CTA targets this
// route, never the auth pages directly, so the funnel has a single seam the app
// owns. Today signup === the passwordless login flow (login → /auth/callback →
// dashboard → onboarding → create_family → dashboard); the SPEC's "pay during
// signup" funnel is deferred to Phase 9.
//
// TODO(9.2): turn this into the paywall step — create a Stripe Checkout session
// here and 307 to Stripe; Checkout's success_url returns into /auth/callback so
// the existing create_family onboarding still runs. Marketing keeps pointing at
// /signup, so the CTA never changes again.
export function GET(req: NextRequest) {
  const url = new URL(req.url);
  // Preserve a safe relative ?next through to login (e.g. an invite target);
  // never forward an absolute/off-site URL.
  const rawNext = url.searchParams.get("next");
  const next = rawNext && rawNext.startsWith("/") ? rawNext : null;
  const dest = new URL("/login", url.origin);
  if (next) dest.searchParams.set("next", next);
  return NextResponse.redirect(dest);
}
