"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { switchFamily } from "./actions";

// Site nav for the authenticated family/admin area. Rendered once in the (app)
// layout so every page gets the same shell: brand, section links (with the
// active one highlighted), family switcher, and the member avatar + sign-out.
type Family = { family_id: string; name: string };

const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/stories", label: "Stories" },
  { href: "/settings", label: "Settings" },
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

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-3 sm:px-7">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-bold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-sky2 text-lg shadow-sm">
            🏡
          </span>
          <span className="hidden sm:inline">Porch</span>
        </Link>

        {hasFamily && (
          <div className="ml-2 flex items-center gap-0.5">
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

          <div
            title={email}
            className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand to-brand2 text-xs font-bold text-white"
          >
            {initials(email)}
          </div>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-lg px-2 py-2 text-sm font-semibold text-ink/50 hover:bg-ink/5 hover:text-ink"
              title="Sign out"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>
    </header>
  );
}
