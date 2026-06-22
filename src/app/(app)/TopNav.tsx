"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { switchFamily } from "./actions";

// Site nav for the authenticated family/admin area. Rendered once in the (app)
// layout so every page gets the same shell: brand, section links (with the
// active one highlighted), family switcher, and the member avatar. The avatar
// opens a profile dropdown holding Family Access, My Settings, and Sign out.
// On mobile the links/switcher collapse into a hamburger menu (same idiom as
// the marketing MobileNav: closes on route change and Escape).
type Family = { family_id: string; name: string };

// Primary section links — always inline on desktop, top of the hamburger.
const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/stories", label: "Stories" },
  { href: "/book", label: "Book" },
];

// Account links — live under the profile avatar on desktop, in the hamburger's
// Profile section on mobile.
const PROFILE_LINKS = [
  { href: "/family-access", label: "Family Access" },
  { href: "/settings", label: "My Settings" },
];

function initials(seed: string): string {
  const clean = seed.replace(/@.*/, "").replace(/[._-]+/g, " ").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function TopNav({
  families,
  activeFamilyId,
  activeFamilyName,
  email,
}: {
  families: Family[];
  activeFamilyId: string | null;
  activeFamilyName: string | null;
  email: string;
}) {
  const pathname = usePathname();
  const hasFamily = activeFamilyId != null;
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close both menus when navigating to a new page.
  useEffect(() => {
    setOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  // Close on Escape while either menu is open.
  useEffect(() => {
    if (!open && !profileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, profileOpen]);

  // Close the profile dropdown on an outside click.
  useEffect(() => {
    if (!profileOpen) return;
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [profileOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-3 sm:px-7">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-bold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-sky2 text-lg shadow-sm">
            🏡
          </span>
          <span className="hidden sm:inline">My Family Porch</span>
        </Link>

        {/* Section links — inline on desktop, in the hamburger menu on mobile. */}
        {hasFamily && (
          <div className="ml-2 hidden items-center gap-0.5 sm:flex">
            {LINKS.map((l) => {
              const current = pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    current
                      ? "bg-surface text-ink shadow-sm ring-1 ring-line"
                      : "text-ink/55 hover:bg-ink/5 hover:text-ink"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2.5">
          {/* Family switcher — only when the member belongs to more than one. */}
          {families.length > 1 && (
            <div className="hidden items-center gap-1.5 sm:flex">
              {families.map((f) => (
                <form key={f.family_id} action={switchFamily}>
                  <input type="hidden" name="family_id" value={f.family_id} />
                  <button
                    type="submit"
                    disabled={f.family_id === activeFamilyId}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      f.family_id === activeFamilyId
                        ? "bg-ink text-white"
                        : "text-ink/60 hover:bg-ink/5"
                    }`}
                  >
                    {f.name}
                  </button>
                </form>
              ))}
            </div>
          )}
          {families.length === 1 && activeFamilyName && (
            <span className="hidden text-sm font-semibold text-ink/55 sm:inline">
              {activeFamilyName}
            </span>
          )}

          {/* Profile avatar + dropdown — desktop only (mobile uses the hamburger). */}
          <div ref={profileRef} className="relative hidden sm:block">
            <button
              type="button"
              aria-label="Account menu"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((v) => !v)}
              title={email}
              className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand to-brand2 text-xs font-bold text-white ring-offset-2 ring-offset-surface transition hover:ring-2 hover:ring-line"
            >
              {initials(email)}
            </button>

            {profileOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
              >
                <p className="truncate border-b border-line px-4 py-3 text-xs font-semibold text-ink/55">
                  {email}
                </p>
                {PROFILE_LINKS.map((l) => {
                  const current = pathname === l.href || pathname.startsWith(l.href + "/");
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      role="menuitem"
                      className={`block px-4 py-2.5 text-sm font-semibold transition ${
                        current
                          ? "bg-ink/5 text-ink"
                          : "text-ink/70 hover:bg-ink/5 hover:text-ink"
                      }`}
                    >
                      {l.label}
                    </Link>
                  );
                })}
                <form action="/auth/signout" method="post" className="border-t border-line">
                  <button
                    type="submit"
                    role="menuitem"
                    className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-ink/70 transition hover:bg-ink/5 hover:text-ink"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Avatar (display only) — mobile, next to the hamburger. */}
          <div
            title={email}
            className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand to-brand2 text-xs font-bold text-white sm:hidden"
          >
            {initials(email)}
          </div>

          {/* Hamburger — mobile only. */}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="app-mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-ink/70 transition hover:bg-surface2 sm:hidden"
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
        </div>
      </nav>

      {/* Mobile dropdown panel. */}
      {open && (
        <div
          id="app-mobile-menu"
          className="absolute inset-x-0 top-full border-b border-line bg-surface/95 backdrop-blur sm:hidden"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-1 px-5 py-4">
            {hasFamily &&
              LINKS.map((l) => {
                const current = pathname === l.href || pathname.startsWith(l.href + "/");
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`rounded-xl px-3 py-3 text-base font-semibold transition ${
                      current
                        ? "bg-ink/5 text-ink ring-1 ring-line"
                        : "text-ink/80 hover:bg-ink/5"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}

            {/* Family switcher (>1) or the single family's name. */}
            {families.length > 1 && (
              <div className="mt-2 border-t border-line pt-3">
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-ink/40">
                  Family
                </p>
                {families.map((f) => (
                  <form key={f.family_id} action={switchFamily}>
                    <input type="hidden" name="family_id" value={f.family_id} />
                    <button
                      type="submit"
                      disabled={f.family_id === activeFamilyId}
                      className={`w-full rounded-xl px-3 py-3 text-left text-base font-semibold transition ${
                        f.family_id === activeFamilyId
                          ? "bg-ink/5 text-ink ring-1 ring-line"
                          : "text-ink/80 hover:bg-ink/5"
                      }`}
                    >
                      {f.name}
                    </button>
                  </form>
                ))}
              </div>
            )}
            {families.length === 1 && activeFamilyName && (
              <p className="mt-2 border-t border-line px-3 pt-3 text-sm font-semibold text-ink/55">
                {activeFamilyName}
              </p>
            )}

            {/* Profile section — Family Access, My Settings, Sign out. */}
            {hasFamily && (
              <div className="mt-2 border-t border-line pt-3">
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-ink/40">
                  Profile
                </p>
                {PROFILE_LINKS.map((l) => {
                  const current = pathname === l.href || pathname.startsWith(l.href + "/");
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      className={`rounded-xl px-3 py-3 text-base font-semibold transition ${
                        current
                          ? "bg-ink/5 text-ink ring-1 ring-line"
                          : "text-ink/80 hover:bg-ink/5"
                      }`}
                    >
                      {l.label}
                    </Link>
                  );
                })}
              </div>
            )}

            <form action="/auth/signout" method="post" className="mt-2 border-t border-line pt-2">
              <button
                type="submit"
                className="w-full rounded-xl px-3 py-3 text-left text-base font-semibold text-ink/70 hover:bg-ink/5"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
