import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { Section } from "../_components/Section";

export const metadata = pageMeta({
  title: "SMS reminders & opt-in",
  description:
    "How the My Family Porch SMS reminder program works: who consents, how, message frequency, sample messages, and how to stop (reply STOP) or get help (reply HELP).",
  path: "/sms",
});

// Public opt-in / Call-to-Action page (A2P 10DLC, TODO 4.3). The real opt-in
// happens inside the authenticated dashboard (a family admin enters a
// storyteller's number and checks a required consent box), which a carrier
// reviewer can't see. This page is the PUBLIC, verifiable record of that flow:
// it states the program, the EXACT consent language shown on the in-app
// checkbox, sample messages (verbatim from lib/i18n sms_nudge), frequency,
// rates, and STOP/HELP — the URL submitted in the campaign's CTA field. Keep
// the consent sentence here in sync with the checkbox label in
// storytellers/[id]/page.tsx and settings/page.tsx.
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
              Reminders are set up by a family member, not by a public sign-up
              form. A family member creates an account at{" "}
              <Link href="/signup" className="text-accent underline">
                myfamilyporch.net
              </Link>
              , adds an elder storyteller they are recording, and enters that
              storyteller&apos;s mobile number. To save the number, the family
              member must check a required consent box confirming the
              storyteller has agreed to receive these reminders. There are no
              opt-in keywords — consent is given by an authorized family member
              at the time the number is added.
            </p>
            <p>
              The exact wording shown next to that required checkbox is:
            </p>
            <blockquote className="rounded-2xl border border-line bg-surface2/50 p-5 text-ink/85">
              &ldquo;I confirm this person has agreed to receive recurring
              automated reminder text messages from My Family Porch about
              recording their life stories. Message frequency varies (typically
              a few per week or fewer). Message and data rates may apply. Reply
              STOP to cancel, HELP for help.&rdquo;
            </blockquote>
          </div>
        </div>

        {/* Sample messages — must match lib/i18n sms_nudge copy */}
        <div className="mt-12">
          <h2 className="font-serif text-xl font-semibold text-ink/90">
            Sample messages
          </h2>
          <div className="mt-4 space-y-3">
            <p className="rounded-2xl border border-line bg-surface2/50 p-4 text-ink/85">
              My Family Porch: Hi Grandpa Tony, it&apos;s Maria — tap here to
              tell me a story 💬
              <br />
              https://myfamilyporch.net/s/abc123
            </p>
            <p className="rounded-2xl border border-line bg-surface2/50 p-4 text-ink/85">
              My Family Porch: Hi Mom — tap here to tell me a story 💬
              <br />
              https://myfamilyporch.net/s/xyz789
            </p>
            <p className="text-sm text-ink/55">
              Reminders may be sent in English or Spanish, matching the
              storyteller&apos;s chosen language.
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
              <strong>Message frequency:</strong> recurring, typically a few
              messages per week or fewer.
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
