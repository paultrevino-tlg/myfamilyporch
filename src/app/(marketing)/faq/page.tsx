import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { faqPageLd } from "@/lib/jsonld";
import { FAQ_GROUPS } from "@/lib/pricing";
import { Section } from "../_components/Section";
import { JsonLd } from "../_components/JsonLd";

export const metadata = pageMeta({
  title: "FAQ",
  description:
    "Answers to common questions about My Family Porch — how interviews work, how your family's voice recordings are stored and kept private, the keepsake book, and billing.",
  path: "/faq",
});

// Dedicated FAQ page (Phase 8.4). Grouped, native <details> accordion — the same
// accessible, zero-JS pattern as the homepage teaser. Content is read from
// lib/pricing FAQ_GROUPS (single source of truth, shared with the homepage).
export default function FaqPage() {
  return (
    <Section>
      <JsonLd data={faqPageLd()} />
      <div className="mx-auto max-w-3xl">
        <header className="text-center">
          <span className="chip bg-accent/10 text-accent">FAQ</span>
          <h1 className="mt-4 font-serif text-3xl font-semibold sm:text-4xl">
            Questions families ask.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-ink/70">
            The honest answers to what families want to know before they begin —
            especially about keeping their stories private.
          </p>
        </header>

        <div className="mt-12 space-y-12">
          {FAQ_GROUPS.map((group) => (
            <div key={group.category}>
              <h2 className="font-serif text-xl font-semibold text-ink/90">
                {group.category}
              </h2>
              <div className="mt-4 space-y-3">
                {group.items.map((item) => (
                  <details
                    key={item.q}
                    className="card group p-0 [&_summary]:list-none"
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 font-semibold">
                      {item.q}
                      <span
                        aria-hidden
                        className="shrink-0 text-xl text-brand transition group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="px-6 pb-5 leading-relaxed text-ink/70">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-ink/70">
          Still have a question?{" "}
          <Link href="/contact" className="text-accent underline">
            Get in touch
          </Link>
          —we&apos;re happy to help.
        </p>
      </div>
    </Section>
  );
}
