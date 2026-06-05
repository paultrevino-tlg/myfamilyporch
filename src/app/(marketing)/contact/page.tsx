import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { Section } from "../_components/Section";

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
    <Section>
      <div className="mx-auto max-w-3xl">
        <header className="text-center">
          <span className="chip bg-accent/10 text-accent">Contact</span>
          <h1 className="mt-4 font-serif text-3xl font-semibold sm:text-4xl">
            We&apos;re here to help.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-ink/70">
            My Family Porch is a small, family-run team. Email us any time and a
            real person will get back to you — usually within about two business
            days.
          </p>
          <p className="mt-6">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="btn-primary inline-flex"
            >
              Email {SUPPORT_EMAIL}
            </a>
          </p>
        </header>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {TOPICS.map((topic) => (
            <a
              key={topic.title}
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
                topic.subject,
              )}`}
              className="card block p-6 transition hover:border-brand/40"
            >
              <h2 className="font-semibold">{topic.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink/65">
                {topic.body}
              </p>
            </a>
          ))}
        </div>

        <div className="card mt-8 p-6">
          <h2 className="font-semibold">Text-message reminders</h2>
          <p className="mt-2 leading-relaxed text-ink/70">
            If a storyteller is getting reminder texts, they can reply{" "}
            <strong>STOP</strong> at any time to stop them, or{" "}
            <strong>HELP</strong> for assistance. Message and data rates may
            apply. See our{" "}
            <Link href="/terms" className="text-accent underline">
              Terms
            </Link>{" "}
            for the full SMS program details.
          </p>
        </div>

        <p className="mt-8 text-center text-ink/65">
          Curious about something else? Many answers are on our{" "}
          <Link href="/faq" className="text-accent underline">
            FAQ page
          </Link>
          .
        </p>
      </div>
    </Section>
  );
}
