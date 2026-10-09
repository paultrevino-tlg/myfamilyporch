import Link from "next/link";
import MobileNav from "./MobileNav";
import { HeaderShell } from "./HeaderShell";
import { NAV_LINKS } from "./nav";

// Sticky marketing header (Phase 8.1, restyled Porchlight): lamp-dot wordmark
// left, hairline-underlined nav + pill CTA right, hamburger on mobile. Over the
// home photograph it is light-on-dark; HeaderShell flips it solid on scroll and
// on every other page.
export function SiteHeader() {
  return (
    <HeaderShell>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-7">
        <Link
          href="/"
          className="flex items-center gap-2.5 whitespace-nowrap"
          aria-label="My Family Porch — home"
        >
          <span aria-hidden className="lamp" />
          <span className="font-serif text-lg font-semibold tracking-tight">My Family Porch</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="border-b border-transparent pb-0.5 text-[0.95rem] text-ink/80 transition duration-300 ease-porch hover:border-brand hover:text-brand group-data-[overlay=true]:text-cream/90 group-data-[overlay=true]:hover:border-cream group-data-[overlay=true]:hover:text-cream"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/login"
          className="btn-primary hidden px-5 py-2.5 md:inline-flex group-data-[overlay=true]:bg-cream group-data-[overlay=true]:text-ink group-data-[overlay=true]:[text-shadow:none] group-data-[overlay=true]:hover:bg-honey"
        >
          Login
        </Link>

        <MobileNav />
      </div>
    </HeaderShell>
  );
}
