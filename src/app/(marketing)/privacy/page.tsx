import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Privacy Policy",
  description:
    "How My Family Porch collects, uses, and protects your information, including text-message reminders.",
  path: "/privacy",
});

// A2P/CTIA-compliant privacy policy, expanded in the Phase 8.4 legal pass to
// spell out how voice recordings are stored, who can access them, and that they
// are never sold. The SMS section is preserved for Twilio A2P 10DLC (TODO 4.3).
export default function PrivacyPolicy() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 leading-relaxed sm:px-7">
      <h1 className="font-semibold text-3xl">Privacy Policy</h1>
      <p className="mt-2 text-ink/60 text-sm">Last updated: June 5, 2026</p>

      <p className="mt-6 text-ink/80">
        My Family Porch, a service of Technology Leadership Group, LLC
        (&ldquo;we,&rdquo; &ldquo;us&rdquo;), records a family elder&apos;s life
        stories as a short, AI-guided voice interview and turns them into a
        keepsake. This policy explains what information we collect,
        how we use it, and the choices you have. We do not sell your information,
        and we do not share it with third parties for their own marketing.
      </p>

      <section className="mt-8 rounded-2xl border border-line bg-surface2/40 p-6">
        <h2 className="font-semibold text-xl">Your voice recordings</h2>
        <p className="mt-3 text-ink/80">
          The voice recordings of your family&apos;s stories are the most
          personal thing we hold, so we want to be direct about exactly how they
          are handled.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-ink/80">
          <li>
            <strong>How they&apos;re stored:</strong> recordings are kept in
            private storage and are encrypted in transit. Each family&apos;s
            recordings are isolated from every other family&apos;s — one family
            can never reach another family&apos;s content.
          </li>
          <li>
            <strong>Who can access them:</strong> only signed-in members of your
            family account can listen, and only after an access check. The
            storyteller reaches their own session through a private, single-use
            link — never a public page. Audio is delivered only over short-lived,
            signed links after that same check. Our service providers may process
            recordings strictly to operate the service on our behalf (for
            example, to transcribe them), never for their own purposes.
          </li>
          <li>
            <strong>They are never sold:</strong> we do not sell your recordings
            or transcripts, and we never share them with third parties for their
            own marketing or to train their own products.
          </li>
        </ul>
      </section>

      <h2 className="mt-8 font-semibold text-xl">Information we collect</h2>
      <ul className="mt-3 list-disc space-y-1 pl-6 text-ink/80">
        <li>
          <strong>Account information</strong> for family members who sign in:
          name and email address.
        </li>
        <li>
          <strong>Storyteller details</strong> a family adds: name, preferred
          language, and a mobile phone number used to send interview reminders.
        </li>
        <li>
          <strong>Voice recordings and transcripts</strong> created during an
          interview session, and the questions asked.
        </li>
        <li>
          <strong>Basic technical data</strong> needed to operate the service
          securely (for example, request logs).
        </li>
      </ul>

      <h2 className="mt-8 font-semibold text-xl">How we use information</h2>
      <ul className="mt-3 list-disc space-y-1 pl-6 text-ink/80">
        <li>To run the guided voice interview and build the family keepsake.</li>
        <li>
          To send reminder text messages about recording the next story, when a
          mobile number has been provided with consent (see below).
        </li>
        <li>To secure the service, prevent abuse, and provide support.</li>
      </ul>

      <h2 className="mt-8 font-semibold text-xl">Text messaging (SMS)</h2>
      <p className="mt-3 text-ink/80">
        If a mobile number is provided, the person may receive occasional
        reminder text messages from My Family Porch, typically a few per week or
        fewer. Message and data rates may apply. You can opt out at any time by
        replying <strong>STOP</strong>, and you can reply <strong>HELP</strong>{" "}
        for assistance. Mobile information is used only to deliver these
        reminders; it is <strong>never sold or shared with third parties</strong>{" "}
        and is never used for unrelated marketing.
      </p>

      <h2 className="mt-8 font-semibold text-xl">How we store and protect it</h2>
      <p className="mt-3 text-ink/80">
        Voice recordings are kept in private storage and are accessible only to
        members of your family account after an access check. Data is encrypted
        in transit. Each family&apos;s data is isolated from every other
        family&apos;s.
      </p>

      <h2 className="mt-8 font-semibold text-xl">Service providers</h2>
      <p className="mt-3 text-ink/80">
        We rely on a small number of vendors strictly to operate the service —
        for example, to deliver text messages, transcribe audio, and host data.
        They may process information only on our behalf to provide these
        functions and may not use it for their own purposes.
      </p>

      <h2 className="mt-8 font-semibold text-xl">Keeping or deleting your data</h2>
      <p className="mt-3 text-ink/80">
        Your stories are yours to keep. You can download everything — every audio
        recording, the transcripts, and your book — at any time. We keep your
        content for as long as your account is active so your family can revisit
        it. You can ask us to permanently delete a single recording or your
        entire account at any time, and we will remove it from our active
        systems.
      </p>

      <h2 className="mt-8 font-semibold text-xl">Your choices</h2>
      <ul className="mt-3 list-disc space-y-1 pl-6 text-ink/80">
        <li>Reply STOP to any reminder text to stop receiving messages.</li>
        <li>
          Ask us to delete a recording or your account data by{" "}
          <a className="text-accent underline" href="/contact">
            contacting us
          </a>
          .
        </li>
      </ul>

      <h2 className="mt-8 font-semibold text-xl">Contact</h2>
      <p className="mt-3 text-ink/80">
        Questions about this policy? Visit our{" "}
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
