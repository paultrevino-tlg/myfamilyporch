import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Privacy Policy",
  description:
    "How My Family Porch collects, uses, and protects your information, including text-message reminders.",
  path: "/privacy",
});

// Minimal, A2P/CTIA-compliant privacy policy. Required as a live, reachable URL
// for Twilio A2P 10DLC campaign registration (TODO 4.3). Full marketing/legal
// pass is Phase 8.4 — this is the compliant baseline.
export default function PrivacyPolicy() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 leading-relaxed sm:px-7">
      <h1 className="font-semibold text-3xl">Privacy Policy</h1>
      <p className="mt-2 text-ink/60 text-sm">Last updated: June 3, 2026</p>

      <p className="mt-6 text-ink/80">
        My Family Porch (&ldquo;we,&rdquo; &ldquo;us&rdquo;) records a family
        elder&apos;s life stories as a short, AI-guided voice interview and turns
        them into a keepsake. This policy explains what information we collect,
        how we use it, and the choices you have. We do not sell your information,
        and we do not share it with third parties for their own marketing.
      </p>

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

      <h2 className="mt-8 font-semibold text-xl">Your choices</h2>
      <ul className="mt-3 list-disc space-y-1 pl-6 text-ink/80">
        <li>Reply STOP to any reminder text to stop receiving messages.</li>
        <li>
          Ask us to delete a recording or your account data by contacting us.
        </li>
      </ul>

      <h2 className="mt-8 font-semibold text-xl">Contact</h2>
      <p className="mt-3 text-ink/80">
        Questions about this policy? Email{" "}
        <a className="text-accent underline" href="mailto:support@myfamilyporch.net">
          support@myfamilyporch.net
        </a>
        .
      </p>
    </div>
  );
}
