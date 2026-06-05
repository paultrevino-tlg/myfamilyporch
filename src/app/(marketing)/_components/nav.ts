// Marketing nav model (Phase 8.1). Plain data shared by the desktop header and
// the mobile menu so the two never drift. Anchor links (/#…) point at landing
// sections filled in by 8.2; the dedicated /how-it-works and /stories pages
// arrive in 8.6. The CTA is live now → the app's sign-in/onboarding entry.

export type NavLink = { label: string; href: string };

export const NAV_LINKS: NavLink[] = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Stories", href: "/#stories" },
  { label: "FAQ", href: "/#faq" },
];

// Primary call to action. Stripe Checkout signup is 8.5; for now it's the app
// entry point on the same origin (one codebase, one deploy on the apex).
export const PRIMARY_CTA: NavLink = { label: "Get started", href: "/login" };
