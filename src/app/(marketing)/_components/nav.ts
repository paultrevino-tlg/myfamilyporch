// Marketing nav model (Phase 8.1). Plain data shared by the desktop header and
// the mobile menu so the two never drift. Anchor links (/#…) point at landing
// sections filled in by 8.2; the dedicated /how-it-works and /stories pages
// arrive in 8.6. The CTA is live now → the app's sign-in/onboarding entry.

export type NavLink = { label: string; href: string };

export const NAV_LINKS: NavLink[] = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Stories", href: "/#stories" },
  { label: "FAQ", href: "/faq" },
];

// Primary call to action → the app's stable signup entry (Phase 8.5). The
// target is a SAME-ORIGIN relative path on purpose: marketing + app ship as one
// deploy on the apex (== APP_BASE_URL), so a relative href resolves against the
// live origin automatically AND keeps these marketing pages statically rendered
// (no runtime env read). If the app ever moves to its own origin, flip this one
// constant to an `${APP_BASE_URL}/signup` absolute. The real Stripe Checkout
// paywall lives behind /signup and is wired in 9.2 — the CTA never changes.
export const PRIMARY_CTA: NavLink = { label: "Get started", href: "/signup" };
