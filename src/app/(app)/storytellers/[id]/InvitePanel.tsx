import CopyBlock from "./CopyBlock";

// The storyteller's invite, in the three states it can be in. Extracted so the
// hub and the setup wizard show the same thing (consent-flow.md steps 5-6).
//
// `message` is the already-built copy_paste_block in the STORYTELLER's language,
// or null when the link couldn't be minted (missing token secret).
export default function InvitePanel({
  storytellerId,
  storytellerName,
  consentState,
  message,
}: {
  storytellerId: string;
  storytellerName: string;
  consentState: string;
  message: string | null;
}) {
  if (consentState === "opted_in") {
    return (
      <p className="rounded-xl bg-green-50 px-3 py-2.5 text-sm text-green-800">
        ✓ {storytellerName} opted in — story texts are on.
      </p>
    );
  }

  // They replied STOP. A consumer opt-out has to be reversed by the consumer on
  // the same channel, so there is deliberately no in-app way to undo it here.
  if (consentState === "opted_out") {
    return (
      <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
        {storytellerName} replied STOP, so we&apos;ve stopped texting them. They can
        text START to +1 623 235 8221 from that phone to turn texts back on.
      </p>
    );
  }

  if (!message) {
    return (
      <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
        Couldn&apos;t build the invite link — the storyteller-token secret may not be
        configured.
      </p>
    );
  }

  return (
    <div>
      <p className="text-sm font-semibold text-ink/80">Send {storytellerName} their invite</p>
      <p className="mt-1 max-w-prose text-xs leading-relaxed text-ink/55">
        Copy this and text it to {storytellerName} from your own phone — or have us
        text it to you so you can forward it. When they tap the link and say yes,
        they&apos;re set up, and we&apos;ll let you know.
      </p>
      <CopyBlock message={message} storytellerId={storytellerId} />
    </div>
  );
}
