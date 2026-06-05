import Link from "next/link";
import MobileNav from "./MobileNav";
import { NAV_LINKS, PRIMARY_CTA } from "./nav";

// Sticky marketing header (Phase 8.1): wordmark left, primary nav + warm CTA
// right, hamburger on mobile. The translucent paper background + backdrop blur
// gives the "subtle background on scroll" feel without any scroll JS.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-7">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold tracking-tight"
          aria-label="My Family Porch — home"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-sky2 text-lg shadow-sm">
            🏡
          </span>
          <span className="font-serif text-lg font-semibold">My Family Porch</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 sm:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-semibold text-ink/70 transition hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <Link
          href={PRIMARY_CTA.href}
          className="btn-primary hidden px-5 py-2.5 sm:inline-flex"
        >
          {PRIMARY_CTA.label}
        </Link>

        <MobileNav />
      </div>
    </header>
  );
}
