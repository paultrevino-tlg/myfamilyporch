import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "./(marketing)/_components/SiteHeader";
import { SiteFooter } from "./(marketing)/_components/SiteFooter";
import { Container } from "./(marketing)/_components/Container";
import { PRIMARY_CTA } from "./(marketing)/_components/nav";

// Custom on-brand 404 (Phase 8.6, brief §4). This is the GLOBAL not-found —
// Next renders it for any unmatched URL, and only inside the root layout, so the
// (marketing) shell's header/footer don't apply automatically. We rebuild that
// same shell here (skip link → SiteHeader → main → SiteFooter) so a wrong URL
// still lands on a warm, navigable page rather than a bare error. Server
// component, no JS island. noindex so search engines don't keep the 404 around.

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

const HELPFUL: { label: string; href: string }[] = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Our story", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="content" className="flex-1">
        <Container>
          <section className="mx-auto max-w-xl py-20 text-center sm:py-28">
            <span className="chip bg-accent/10 text-accent">404</span>
            <h1 className="mt-4 font-serif text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
              Looks like you&apos;ve wandered off the porch.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-ink/65">
              The page you&apos;re after isn&apos;t here — it may have moved, or the
              link may be a little worn. Let&apos;s get you back to the good
              stories.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/" className="btn-primary px-6 py-3 text-base">
                Back home
              </Link>
              <Link href={PRIMARY_CTA.href} className="btn-ghost px-6 py-3 text-base">
                {PRIMARY_CTA.label}
              </Link>
            </div>

            <div className="mt-12 border-t border-line pt-8">
              <p className="text-sm font-semibold uppercase tracking-widest text-ink/45">
                Or head somewhere familiar
              </p>
              <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-base">
                {HELPFUL.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="link">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}
