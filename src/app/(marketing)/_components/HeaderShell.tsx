"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

// The <header> element itself, so the header can sit over the home page's
// full-bleed photograph and turn solid cream once you scroll past it
// (Porchlight). Every other page gets the solid bar from the first paint.
// usePathname resolves during prerender, so the home page's static HTML already
// ships the over-photo state — no flash. Children stay server-rendered; they
// restyle off `data-overlay` via Tailwind's group-data variants.
const SOLID_AFTER_PX = 120;

export function HeaderShell({ children }: { children: ReactNode }) {
  const overHero = usePathname() === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!overHero) return;
    const onScroll = () => setScrolled(window.scrollY > SOLID_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overHero]);

  const overlay = overHero && !scrolled;

  return (
    <header
      data-overlay={overlay}
      className={[
        "group sticky top-0 z-40 transition-colors duration-500 ease-porch",
        overlay
          ? "on-dark text-cream [text-shadow:0_1px_10px_rgba(44,34,27,.55)]"
          : "border-b border-line bg-paper/95 text-ink backdrop-blur",
      ].join(" ")}
    >
      {/* Scrim so the bar reads over any part of the photograph. */}
      {overlay && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[rgba(28,21,16,.72)] via-[rgba(28,21,16,.34)] to-transparent"
        />
      )}
      <div className="relative">{children}</div>
    </header>
  );
}
