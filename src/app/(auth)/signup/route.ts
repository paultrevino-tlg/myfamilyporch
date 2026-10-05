import { NextRequest, NextResponse } from "next/server";

// Stable signup entry (Phase 8.5). The marketing "Get started" CTA targets this
// route, never the auth pages directly, so the funnel has a single seam the app
// owns.
//
// Pay first, account second (TODO 9.0; SPEC § Marketing, signup & billing):
// login no longer creates accounts, so until Stripe Checkout lands this sends
// prospective families to Contact rather than into a login that can't sign them
// up. New families are provisioned by the operator script meanwhile.
//
// TODO(9.2): turn this into the paywall step — pick a plan, create a Stripe
// Checkout session here and 307 to Stripe. The webhook (9.3), not the success
// redirect, creates the account. Marketing keeps pointing at /signup.
export function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/contact", req.url));
}
