import Link from "next/link";
import { SITE_TAGLINE } from "@/lib/seo";

// Marketing footer (Phase 8.1): wordmark + tagline, four link columns, a short
// privacy-reassurance line (the #1 buyer concern for this product), copyright.
// Links point at live pages or landing anchors — no dead 404s. /how-it-works,
// /about (our story), and /gift (8.7) are all live pages.

type Col = { title: string; links: { label: string; href: string }[] };

const COLUMNS: Col[] = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "/how-it-works" },
      { label: "Pricing", href: "/pricing" },
      { label: "What you get", href: "/#what-you-get" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Our story", href: "/about" },
      { label: "Why I built this", href: "/why" },
      { label: "Gift a porch", href: "/gift" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function SiteFooter() {
  const year = 2026; // TODO: revisit at year boundary (build-time constant; Date is avoided in this codebase).

  return (
    <footer className="border-t border-line bg-surface2/40">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-7">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5 font-bold tracking-tight">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-sky2 text-lg shadow-sm">
                🏡
              </span>
              <span className="font-serif text-lg font-semibold">My Family Porch</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink/65">{SITE_TAGLINE}</p>
            <p className="mt-4 text-sm leading-relaxed text-ink/65">
              Your family&apos;s recordings are private — yours to keep, and never
              sold.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h2 className="text-xs font-bold uppercase tracking-widest text-ink/65">
                {col.title}
              </h2>
              <ul className="mt-3 space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="text-ink/65 transition hover:text-ink"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-line pt-6 text-sm text-ink/65">
          © {year} My Family Porch — a service of Technology Leadership Group, LLC.
        </div>
      </div>
    </footer>
  );
}
