import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { Section } from "../_components/Section";
import { PageIntro, SectionHead } from "../_components/Editorial";

export const metadata = pageMeta({
  title: "Contact & help",
  description:
    "Get help with My Family Porch — questions about your account or billing, privacy and data-deletion requests, or text-message reminders. Email support@myfamilyporch.net.",
  path: "/contact",
});

const SUPPORT_EMAIL = "support@myfamilyporch.net";

// Topics families reach out about. Each links to the support inbox with a
// helpful prefilled subject so messages arrive already sorted.
const TOPICS: { title: string; body: string; subject: string }[] = [
  {
    title: "Help getting started",
    body: "Setting up a storyteller, scheduling the first interview, or anything that isn't working the way you expected.",
    subject: "Help getting started",
  },
  {
    title: "Account & billing",
    body: "Questions about your plan, an invoice, the printed book add-on, or changing your subscription.",
    subject: "Account & billing question",
  },
  {
    title: "Privacy & deleting data",
    body: "Ask us to delete a single recording or your entire account, or anything about how your stories are kept private.",
    subject: "Privacy / data deletion request",
  },
];

// Contact & help hub (Phase 8.4). Static, no form — the not-ready email-capture
// form is 8.8. Centralizes the support email, what to reach out about (including
// privacy/deletion requests), and the SMS STOP/HELP note.
export default function ContactPage() {
  return (
    <>
      <PageIntro label="Contact" title="We&apos;re here to help.">
        <p>
          My Family Porch is a small, family-run team. Email us any time and a
          real person will get back to you — usually within about two business
          days.
        </p>
        <p className="mt-8">
          <a href={`mailto:${SUPPORT_EMAIL}`} className="btn-primary px-7 py-3.5 font-serif text-base font-medium">
            Email {SUPPORT_EMAIL}
          </a>
        </p>
      </PageIntro>

      <Section className="bg-surface2">
        <div className="border-t border-ink/15">
          {TOPICS.map((topic) => (
            <a
              key={topic.title}
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(topic.subject)}`}
              className="rise group grid gap-x-12 gap-y-2 border-b border-ink/15 py-8 transition-[padding] duration-500 ease-porch hover:pl-5 md:grid-cols-[1fr_1.35fr]"
            >
              <h2 className="font-serif text-[clamp(1.35rem,1.2rem+0.6vw,1.8rem)] font-medium leading-tight group-hover:text-brand">
                {topic.title} <span aria-hidden className="text-brand">→</span>
              </h2>
              <p className="text-ink/80">{topic.body}</p>
            </a>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHead label="SMS" title="Text-message reminders" size="md">
          <p className="mt-6 text-ink/85">
            If a storyteller is getting reminder texts, they can reply{" "}
            <strong>STOP</strong> at any time to stop them, or{" "}
            <strong>HELP</strong> for assistance. Message and data rates may
            apply. See our{" "}
            <Link href="/terms" className="link">
              Terms
            </Link>{" "}
            for the full SMS program details.
          </p>
          <p className="mt-6 text-ink/80">
            Curious about something else? Many answers are on our{" "}
            <Link href="/faq" className="link">
              FAQ page
            </Link>
            .
          </p>
        </SectionHead>
      </Section>
    </>
  );
}
