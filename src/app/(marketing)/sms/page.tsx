import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { Section } from "../_components/Section";

export const metadata = pageMeta({
  title: "SMS program & opt-in",
  description:
    "How the My Family Porch SMS program works: who consents and how (first-party opt-in only), sample messages, message frequency, and how to stop (reply STOP) or get help (reply HELP).",
  path: "/sms",
});

// Public opt-in / Call-to-Action page (A2P 10DLC). Consent is FIRST-PARTY at
// every point: the family member opts in for their OWN number, and the
// storyteller opts in themselves on their own authorization page. Nothing is
// sent by proxy, and nothing automated reaches the storyteller until they tap
// their link and say yes. This page is the public, verifiable record of that
// flow for carrier review. Keep the disclosures in sync with lib/i18n
// (member_optin_disclosure, consent_optin_control) and the messages with the
// sms_* keys.
export default function SmsOptInPage() {
  return (
    <Section>
      <div className="mx-auto max-w-3xl">
        <header>
          <span className="chip bg-accent/10 text-accent">SMS program</span>
          <h1 className="mt-4 font-serif text-3xl font-semibold sm:text-4xl">
            My Family Porch text messages
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink/70">
            My Family Porch sends a few helpful texts to set up recording and a
            gentle reminder when it&apos;s time for the next story. Here is exactly
            how the program works, how each person agrees to receive it, and how to
            stop at any time.
          </p>
        </header>

        {/* How consent works — first-party at every point */}
        <div className="mt-12">
          <h2 className="font-serif text-xl font-semibold text-ink/90">
            How people opt in
          </h2>
          <div className="mt-4 space-y-4 leading-relaxed text-ink/80">
            <p>
              Consent is <strong>first-party</strong> everywhere: each person
              agrees to receive texts at their <strong>own</strong> number. No one
              opts in on someone else&apos;s behalf, and no automated message
              reaches a storyteller until they have personally agreed.
            </p>
            <p>
              <strong>1 — The family member opts in for their own number.</strong>{" "}
              After creating an account at{" "}
              <Link href="/signup" className="text-accent underline">
                myfamilyporch.net
              </Link>
              , they enter their own mobile number and check a consent box. We text
              that number a one-time verification link; tapping it confirms the
              number and records their opt-in. The exact wording of that box is:
            </p>
            <blockquote className="rounded-2xl border border-line bg-surface2/50 p-5 text-ink/85">
              &ldquo;Yes, text me at this number. I agree to receive automated,
              recurring texts from My Family Porch to help set up and record my
              family&apos;s stories. Msg &amp; data rates may apply. Reply STOP
              anytime to opt out, HELP for help.&rdquo;
            </blockquote>
            <p>
              <strong>2 — The family member invites their storyteller.</strong>{" "}
              They add the storyteller and copy a short invitation, which they
              send <strong>from their own phone</strong> as an ordinary personal
              text message. That message is person-to-person — it is not sent by
              our system and is not part of this automated program.
            </p>
            <p>
              <strong>
                3 — The storyteller opts in themselves on their own page.
              </strong>{" "}
              The invitation link opens an authorization page on the
              storyteller&apos;s phone that explains the program, confirms their
              name and number, and asks them to opt in — in the first person. Only
              their own tap turns messaging on. The exact wording of that opt-in
              is:
            </p>
            <blockquote className="rounded-2xl border border-line bg-surface2/50 p-5 text-ink/85">
              &ldquo;Yes, text me at this number so I can record my stories. I
              agree to receive automated, recurring texts from My Family Porch. Msg
              &amp; data rates may apply. Reply STOP anytime to opt out, HELP for
              help.&rdquo;
            </blockquote>
            <p className="text-sm text-ink/60">
              Consent disclosures and the opt-in page are shown in the
              recipient&apos;s language (English or Spanish), and the exact wording
              shown at the moment of consent is recorded for each person.
            </p>
          </div>
        </div>

        {/* Screenshots of the two first-party opt-in surfaces — the public,
            verifiable record carriers require (recapture if the forms change). */}
        <div className="mt-12">
          <h2 className="font-serif text-xl font-semibold text-ink/90">
            What the opt-in looks like
          </h2>
          <p className="mt-4 leading-relaxed text-ink/80">
            Consent is collected in two places, and each person opts in for their
            own number. Here is exactly what each of them sees.
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sms/member-optin.png"
                alt="The family member's phone-verification form at myfamilyporch.net: a mobile number field, a language selector, and a checked box reading “Yes, text me at this number. I agree to receive automated, recurring texts from My Family Porch to help set up and record my family's stories. Msg & data rates may apply. Reply STOP anytime to opt out, HELP for help.”"
                loading="lazy"
                className="w-full rounded-2xl border border-line"
              />
              <figcaption className="mt-2 text-sm text-ink/60">
                1 — The family member verifies their own number and opts in.
              </figcaption>
            </figure>
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sms/storyteller-optin.png"
                alt="The storyteller's own authorization page: their name and masked number, and a checked box reading “Yes, text me at this number so I can record my stories. I agree to receive automated, recurring texts from My Family Porch. Msg & data rates may apply. Reply STOP anytime to opt out, HELP for help.”"
                loading="lazy"
                className="w-full rounded-2xl border border-line"
              />
              <figcaption className="mt-2 text-sm text-ink/60">
                3 — The storyteller opts in themselves on their own authorization
                page.
              </figcaption>
            </figure>
          </div>
        </div>

        {/* Sample A2P messages — must match lib/i18n sms_* copy */}
        <div className="mt-12">
          <h2 className="font-serif text-xl font-semibold text-ink/90">
            Sample messages
          </h2>
          <p className="mt-4 leading-relaxed text-ink/80">
            These are the automated messages the program sends. Variable parts
            appear in [brackets]; every link points to myfamilyporch.net — we never
            use third-party link shorteners. Messages may be sent in English or
            Spanish to match the recipient&apos;s chosen language.
          </p>
          <div className="mt-4 space-y-3">
            <p className="rounded-2xl border border-line bg-surface2/50 p-4 text-ink/85">
              My Family Porch: Tap to verify your number and finish setup:
              https://myfamilyporch.net/verify/[unique-code]
              <br />
              You&apos;ll get texts to help set up your storyteller.
              <br />
              Msg &amp; data rates may apply. Reply STOP to opt out, HELP for help.
            </p>
            <p className="rounded-2xl border border-line bg-surface2/50 p-4 text-ink/85">
              My Family Porch: Thanks [Name]! You&apos;re all set to record your
              stories — we&apos;ll text you when it&apos;s time to start.
              <br />
              Msg &amp; data rates may apply. Reply STOP to stop, HELP for help.
            </p>
            <p className="rounded-2xl border border-line bg-surface2/50 p-4 text-ink/85">
              My Family Porch: Hi [Name], it&apos;s [Family member] — tap here to
              tell me a story
              <br />
              https://myfamilyporch.net/s/[unique-code]
              <br />
              Reply STOP to opt out, HELP for help
            </p>
            <p className="rounded-2xl border border-line bg-surface2/50 p-4 text-ink/85">
              My Family Porch: Great news — [Name] is all set up and ready to start
              recording their stories. We&apos;ll let you know as new stories come
              in.
              <br />
              Msg &amp; data rates may apply. Reply STOP to stop, HELP for help.
            </p>
          </div>
          <p className="mt-4 rounded-2xl border border-dashed border-line p-4 text-sm text-ink/60">
            <strong>Not part of this program:</strong> the storyteller invitation
            (&ldquo;Hi [Name], I set up something so you can record your life
            stories just by talking… Tap here to start:
            myfamilyporch.net/c/[unique-code]&rdquo;) is a personal text the family
            member sends from their own phone — person-to-person, not an automated
            message from us.
          </p>
        </div>

        {/* STOP / HELP / START */}
        <div className="mt-12">
          <h2 className="font-serif text-xl font-semibold text-ink/90">
            Stopping, help, and resubscribing
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 leading-relaxed text-ink/80">
            <li>
              Reply <strong>STOP</strong> at any time (English or Spanish keywords,
              and plain-language requests like &ldquo;please stop texting me&rdquo;
              are honored). You&apos;ll get one confirmation and no further
              messages.
            </li>
            <li>
              Reply <strong>HELP</strong> for program info and support contact.
            </li>
            <li>
              After a STOP, reply <strong>START</strong> to resubscribe. START
              never turns on messages for someone who never opted in.
            </li>
          </ul>
        </div>

        {/* Program terms */}
        <div className="mt-12">
          <h2 className="font-serif text-xl font-semibold text-ink/90">
            Program details
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 leading-relaxed text-ink/80">
            <li>
              <strong>Program name:</strong> My Family Porch reminders.
            </li>
            <li>
              <strong>Message frequency:</strong> recurring, up to 1 message per
              day (typically a few per week or fewer).
            </li>
            <li>
              <strong>Message and data rates may apply.</strong> Charges depend on
              your mobile carrier and plan.
            </li>
            <li>
              <strong>To stop:</strong> reply <strong>STOP</strong> at any time.
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
              We do not share, sell, or otherwise provide your mobile phone
              number or SMS opt-in and consent information to any third parties
              or affiliates for marketing or promotional purposes.
            </li>
            <li>Carriers are not liable for delayed or undelivered messages.</li>
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
