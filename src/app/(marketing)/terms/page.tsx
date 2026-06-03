import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions — My Family Porch",
  description:
    "Terms of service for My Family Porch, including the SMS reminder program, message frequency, and opt-out.",
};

// Minimal, A2P/CTIA-compliant terms. Required as a live, reachable URL for
// Twilio A2P 10DLC campaign registration (TODO 4.3). Must name the program,
// frequency, message/data rates, support contact, and STOP/HELP. Full
// marketing/legal pass is Phase 8.4 — this is the compliant baseline.
export default function Terms() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 leading-relaxed">
      <h1 className="font-semibold text-3xl">Terms &amp; Conditions</h1>
      <p className="mt-2 text-ink/60 text-sm">Last updated: June 3, 2026</p>

      <p className="mt-6 text-ink/80">
        These terms govern your use of My Family Porch, a service that records a
        family elder&apos;s life stories as a short, AI-guided voice interview and
        turns them into a keepsake. By using the service you agree to these
        terms.
      </p>

      <h2 className="mt-8 font-semibold text-xl">The service</h2>
      <p className="mt-3 text-ink/80">
        My Family Porch guides a storyteller through short voice interviews,
        transcribes the answers, and assembles them into a keepsake for the
        family. Family members manage storytellers and review stories from their
        account.
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
        Questions about these terms? Email{" "}
        <a className="text-accent underline" href="mailto:support@myfamilyporch.net">
          support@myfamilyporch.net
        </a>
        .
      </p>
    </main>
  );
}
