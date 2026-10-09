import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { faqPageLd } from "@/lib/jsonld";
import { FAQ_GROUPS } from "@/lib/pricing";
import { Section } from "../_components/Section";
import { JsonLd } from "../_components/JsonLd";
import { PageIntro, SectionHead, FaqList } from "../_components/Editorial";

export const metadata = pageMeta({
  title: "FAQ",
  description:
    "Answers to common questions about My Family Porch — how interviews work, how your family's voice recordings are stored and kept private, the keepsake book, and billing.",
  path: "/faq",
});

// Dedicated FAQ page (Phase 8.4). Grouped, native <details> accordion — the same
// accessible, zero-JS FaqList as the homepage teaser. Content is read from
// lib/pricing FAQ_GROUPS (single source of truth, shared with the homepage).
export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqPageLd()} />
      <PageIntro label="FAQ" title="Questions families ask.">
        The honest answers to what families want to know before they begin —
        especially about keeping their stories private.
      </PageIntro>

      {FAQ_GROUPS.map((group, i) => (
        <Section key={group.category} className={i % 2 === 0 ? "bg-surface2" : ""}>
          <SectionHead label="Questions about" title={group.category} size="md" />
          <FaqList items={group.items} />
        </Section>
      ))}

      <Section>
        <p className="rise text-lg text-ink/85">
          Still have a question?{" "}
          <Link href="/contact" className="link">
            Get in touch
          </Link>
          —we&apos;re happy to help.
        </p>
      </Section>
    </>
  );
}
