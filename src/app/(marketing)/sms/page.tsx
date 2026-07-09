import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { Section } from "../_components/Section";

export const metadata = pageMeta({
  title: "SMS reminders & opt-in",
  description:
    "How the My Family Porch SMS reminder program works: who consents, how, message frequency, sample messages, and how to stop (reply STOP) or get help (reply HELP).",
  path: "/sms",
});

// Public opt-in / Call-to-Action page (A2P 10DLC, TODO 4.3). Consent is TWO
// steps and the second comes from the message recipient themself: (1) a family
// admin enters the storyteller's number in the authenticated dashboard and
// checks a required attestation box; (2) the storyteller receives a one-time
// confirmation text and must reply YES before any reminders send (double
// opt-in — handled by api/sms/inbound + the sms_consent gate in lib/sms/nudge).
// This page is the PUBLIC, verifiable record of that flow for carrier review:
// program, exact checkbox language, the confirmation message, sample reminders
// (verbatim from lib/i18n, variable parts in [brackets]), frequency, rates,
// STOP/HELP — the URL submitted in the campaign's CTA field. Keep the consent
// sentence in sync with the checkbox label in storytellers/[id]/page.tsx.
export default function SmsOptInPage() {
  return (
    <Section>
      <div className="mx-auto max-w-3xl">
        <header>
          <span className="chip bg-accent/10 text-accent">SMS reminders</span>
          <h1 className="mt-4 font-serif text-3xl font-semibold sm:text-4xl">
            My Family Porch reminders
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink/70">
            My Family Porch can send a gentle reminder text encouraging the next
            recording session. Here is exactly how the program works, how a
            person agrees to receive it, and how to stop at any time.
          </p>
        </header>

        {/* How people consent — the CTA / opt-in mechanism */}
        <div className="mt-12">
          <h2 className="font-serif text-xl font-semibold text-ink/90">
            How people opt in
          </h2>
          <div className="mt-4 space-y-4 text-ink/80 leading-relaxed">
            <p>
              Opt-in happens in two steps, and no reminders are ever sent until
              the person receiving them confirms directly from their own phone.
            </p>
            <p>
              <strong>Step 1 — a family member sets it up.</strong> A family
              member creates an account at{" "}
              <Link href="/signup" className="text-accent underline">
                myfamilyporch.net
              </Link>
              , adds the storyteller they are recording, and enters that
              storyteller&apos;s mobile number. To save the number, the family
              member must check a required box attesting the storyteller has
              agreed. The exact wording of that checkbox is:
            </p>
            <blockquote className="rounded-2xl border border-line bg-surface2/50 p-5 text-ink/85">
              &ldquo;I confirm this person has agreed to receive recurring
              automated reminder text messages from My Family Porch about
              recording their life stories. They will first receive a one-time
              text and must reply YES before any reminders are sent. Message
              frequency varies (up to 1 message per day). Message and data
              rates may apply. Reply STOP to opt out, HELP for help.&rdquo;
            </blockquote>
            <p>
              <strong>
                Step 2 — the storyteller confirms from their own phone.
              </strong>{" "}
              The storyteller then receives a single confirmation text and must
              reply <strong>YES</strong> before any reminders are sent. If they
              never reply, no reminders are sent. That confirmation message is:
            </p>
            <blockquote className="rounded-2xl border border-line bg-surface2/50 p-5 text-ink/85">
              My Family Porch: [Family member] invited you to record your life
              stories and get occasional reminder texts (up to 1 msg/day). Reply
              YES to start, STOP to opt out, HELP for help. Msg &amp; data rates
              may apply.
            </blockquote>
          </div>
        </div>

        {/* Screenshots of the actual (login-protected) point of collection, so
            carrier reviewers can verify the consent flow without an account
            (A2P 10DLC CTA verification — the form lives in the authenticated
            dashboard, so this public page hosts the visual evidence). Retake
            these if the form copy or the consent checkbox ever changes. */}
        <div className="mt-12">
          <h2 className="font-serif text-xl font-semibold text-ink/90">
            What the sign-up form looks like
          </h2>
          <p className="mt-4 text-ink/80 leading-relaxed">
            The phone number is collected only inside the family member&apos;s
            password-protected account. These screenshots show the actual form
            (with sample data): the number cannot be saved without checking the
            consent attestation, and no reminders are sent while the app is
            still waiting for the recipient&apos;s own YES reply.
          </p>
          <figure className="mt-6">
            <div className="card overflow-hidden p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- static marketing page, no next/image in this codebase */}
              <img
                src="/sms/opt-in-form.png"
                alt="Dashboard form where a family member enters the storyteller's phone number, with the required consent attestation checkbox and links to the SMS terms and Privacy Policy."
                width={1424}
                height={570}
                className="h-auto w-full rounded-xl"
              />
            </div>
            <figcaption className="mt-2 text-sm text-ink/55">
              Step 1 — the number can only be saved with the consent attestation
              checked.
            </figcaption>
          </figure>
          <figure className="mt-6">
            <div className="card overflow-hidden p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- static marketing page, no next/image in this codebase */}
              <img
                src="/sms/awaiting-yes.png"
                alt="Dashboard banner reading: Confirmation already sent — waiting for them to reply YES before reminders can go out."
                width={1520}
                height={534}
                className="h-auto w-full rounded-xl"
              />
            </div>
            <figcaption className="mt-2 text-sm text-ink/55">
              Step 2 — reminders stay blocked until the recipient replies YES
              from their own phone.
            </figcaption>
          </figure>
        </div>

        {/* Sample messages — must match lib/i18n sms_nudge copy */}
        <div className="mt-12">
          <h2 className="font-serif text-xl font-semibold text-ink/90">
            Sample messages
          </h2>
          <div className="mt-4 space-y-3">
            <p className="rounded-2xl border border-line bg-surface2/50 p-4 text-ink/85">
              My Family Porch: Hi [Name], it&apos;s [Family member] — tap here
              to tell me a story
              <br />
              https://myfamilyporch.net/s/[unique-code]
              <br />
              Reply STOP to opt out, HELP for help
            </p>
            <p className="rounded-2xl border border-line bg-surface2/50 p-4 text-ink/85">
              My Family Porch: Hi [Name] — tap here to tell me a story
              <br />
              https://myfamilyporch.net/s/[unique-code]
              <br />
              Reply STOP to opt out, HELP for help
            </p>
            <p className="text-sm text-ink/55">
              [Name], [Family member], and [unique-code] vary per recipient;
              the link always points to myfamilyporch.net — we never use
              third-party link shorteners. Reminders may be sent in English or
              Spanish, matching the storyteller&apos;s chosen language.
            </p>
          </div>
        </div>

        {/* Program terms */}
        <div className="mt-12">
          <h2 className="font-serif text-xl font-semibold text-ink/90">
            Program details
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-ink/80 leading-relaxed">
            <li>
              <strong>Program name:</strong> My Family Porch reminders.
            </li>
            <li>
              <strong>Message frequency:</strong> recurring, up to 1 message
              per day (typically a few per week or fewer).
            </li>
            <li>
              <strong>Message and data rates may apply.</strong> Charges depend
              on your mobile carrier and plan.
            </li>
            <li>
              <strong>To stop:</strong> reply <strong>STOP</strong> at any time.
              You&apos;ll receive a single confirmation and no further messages.
            </li>
            <li>
              <strong>For help:</strong> reply <strong>HELP</strong>, or email{" "}
              <a
                className="text-accent underline"
                href="mailto:support@myfamilyporch.net"
              >
                support@myfamilyporch.net
              </a>
              .
            </li>
            <li>
              We never sell your information or share mobile numbers with third
              parties for their own marketing.
            </li>
            <li>
              Carriers are not liable for delayed or undelivered messages.
            </li>
          </ul>
        </div>

        <p className="mt-12 text-sm text-ink/60">
          Full details are in our{" "}
          <Link href="/terms" className="text-accent underline">
            Terms &amp; Conditions
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-accent underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </Section>
  );
}
