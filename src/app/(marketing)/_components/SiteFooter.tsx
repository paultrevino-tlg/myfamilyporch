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
      { label: "SMS reminders", href: "/sms" },
    ],
  },
];

export function SiteFooter() {
  const year = 2026; // TODO: revisit at year boundary (build-time constant; Date is avoided in this codebase).

  // Porchlight: the page closes on an umber band, honey column labels.
  return (
    <footer className="on-dark bg-ink text-cream/75">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-7">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr] lg:gap-12">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5 text-cream">
              <span aria-hidden className="lamp" />
              <span className="font-serif text-lg font-semibold tracking-tight">My Family Porch</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed">{SITE_TAGLINE}</p>
            <p className="mt-4 text-sm leading-relaxed">
              Your family&apos;s recordings are private — yours to keep, and never
              sold.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h2 className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-honey">
                {col.title}
              </h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="transition duration-300 ease-porch hover:text-cream"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-cream/15 pt-6 text-[0.82rem]">
          © {year} My Family Porch — a service of Technology Leadership Group, LLC.
        </div>
      </div>
    </footer>
  );
}
