"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS, PRIMARY_CTA } from "./nav";

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
    <div className="sm:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((v) => !v)}
        className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-ink/70 transition hover:bg-surface2"
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
          className="absolute inset-x-0 top-full border-b border-line bg-paper/95 backdrop-blur"
        >
          <nav aria-label="Primary" className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-4">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-xl px-3 py-3 text-base font-semibold text-ink/80 hover:bg-surface2"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href={PRIMARY_CTA.href}
              className="btn-primary mt-2 px-5 py-3 text-base"
            >
              {PRIMARY_CTA.label}
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
