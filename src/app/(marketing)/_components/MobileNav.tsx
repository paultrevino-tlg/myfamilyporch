"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "./nav";

// The marketing site's only JS island (Phase 8.1): the mobile hamburger menu.
// Everything else in the shell is static server HTML. Closes on route change
// and on Escape; large tap targets for the older/secondary audience.
export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close when navigating to a new page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((v) => !v)}
        className="grid h-11 w-11 place-items-center rounded-full border border-ink/25 text-ink transition hover:bg-surface2 group-data-[overlay=true]:border-cream/70 group-data-[overlay=true]:text-cream group-data-[overlay=true]:hover:bg-cream/10"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      {open && (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full border-b border-line bg-paper text-ink [text-shadow:none]"
        >
          <nav aria-label="Primary" className="mx-auto flex max-w-6xl flex-col px-5 py-4">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="border-b border-line px-1 py-3.5 font-serif text-lg text-ink hover:text-brand"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="btn-primary mt-4 px-5 py-3 text-base"
            >
              Login
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
