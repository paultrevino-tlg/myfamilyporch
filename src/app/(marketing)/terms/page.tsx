import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Terms & Conditions",
  description:
    "Terms of service for My Family Porch, including the SMS reminder program, message frequency, and opt-out.",
  path: "/terms",
});

// A2P/CTIA-compliant terms, expanded in the Phase 8.4 legal pass with content
// ownership and an AI-processing disclosure. The SMS program section is preserved
// for Twilio A2P 10DLC (TODO 4.3): it must name the program, frequency,
// message/data rates, support contact, and STOP/HELP.
export default function Terms() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 leading-relaxed sm:px-7">
      <h1 className="font-semibold text-3xl">Terms &amp; Conditions</h1>
      <p className="mt-2 text-ink/65 text-sm">Last updated: June 5, 2026</p>

      <p className="mt-6 text-ink/80">
        These terms govern your use of My Family Porch, a service operated by
        Technology Leadership Group, LLC (&ldquo;we,&rdquo; &ldquo;us&rdquo;) that
        records a family elder&apos;s life stories as a short, AI-guided voice
        interview and turns them into a keepsake. By using the service you agree
        to these terms.
      </p>

      <h2 className="mt-8 font-semibold text-xl">The service</h2>
      <p className="mt-3 text-ink/80">
        My Family Porch guides a storyteller through short voice interviews,
        transcribes the answers, and assembles them into a keepsake for the
        family. Family members manage storytellers and review stories from their
        account.
      </p>

      <h2 className="mt-8 font-semibold text-xl">Who owns the content</h2>
      <p className="mt-3 text-ink/80">
        Your family&apos;s stories, recordings, transcripts, and keepsake book
        belong to your family. We don&apos;t claim ownership of them. You grant us
        only the limited permission needed to operate the service for you — to
        store, transcribe, and assemble your stories into the keepsake. You can
        export everything at any time, and if you cancel, your content is still
        yours to download and keep.
      </p>

      <h2 className="mt-8 font-semibold text-xl">AI and voice processing</h2>
      <p className="mt-3 text-ink/80">
        My Family Porch uses artificial intelligence to guide the interview and
        to help turn the answers into a keepsake. With your family&apos;s consent,
        a cloned voice may be used to make the interview feel familiar; it is used
        only to guide your own family&apos;s sessions and is never shared or used
        elsewhere. This processing is carried out by service providers acting only
        on our behalf, who may not use your content for their own purposes. Our
        handling of this information is described in our{" "}
        <a className="text-accent underline" href="/privacy">
          Privacy Policy
        </a>
        .
      </p>

      <h2 className="mt-8 font-semibold text-xl">
        SMS reminder program (&ldquo;My Family Porch reminders&rdquo;)
      </h2>
      <p className="mt-3 text-ink/80">
        If a mobile number is provided with consent, we send reminder text
        messages encouraging the next recording session. By providing a mobile
        number, you confirm you are authorized to receive these messages or that
        the recipient has agreed to receive them.
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-6 text-ink/80">
        <li>
          <strong>Program:</strong> My Family Porch reminders.
        </li>
        <li>
          <strong>Message frequency:</strong> recurring, typically a few messages
          per week or fewer.
        </li>
        <li>
          <strong>Message and data rates may apply.</strong> Charges depend on
          your mobile carrier and plan.
        </li>
        <li>
          To stop receiving messages, reply <strong>STOP</strong> at any time.
          You will receive a single confirmation and no further messages.
        </li>
        <li>
          For help, reply <strong>HELP</strong> or email{" "}
          <a
            className="text-accent underline"
            href="mailto:support@myfamilyporch.net"
          >
            support@myfamilyporch.net
          </a>
          .
        </li>
        <li>
          Carriers are not liable for delayed or undelivered messages.
        </li>
      </ul>

      <h2 className="mt-8 font-semibold text-xl">Acceptable use</h2>
      <p className="mt-3 text-ink/80">
        You agree to use the service only for lawful, personal family purposes,
        to provide accurate information, and only to add a storyteller&apos;s
        phone number when that person has agreed to receive reminders.
      </p>

      <h2 className="mt-8 font-semibold text-xl">Privacy</h2>
      <p className="mt-3 text-ink/80">
        Our handling of your information is described in our{" "}
        <a className="text-accent underline" href="/privacy">
          Privacy Policy
        </a>
        . We never sell your information or share it with third parties for their
        own marketing.
      </p>

      <h2 className="mt-8 font-semibold text-xl">Contact</h2>
      <p className="mt-3 text-ink/80">
        Questions about these terms? Visit our{" "}
        <a className="text-accent underline" href="/contact">
          contact page
        </a>{" "}
        or email{" "}
        <a className="text-accent underline" href="mailto:support@myfamilyporch.net">
          support@myfamilyporch.net
        </a>
        .
      </p>
    </div>
  );
}
