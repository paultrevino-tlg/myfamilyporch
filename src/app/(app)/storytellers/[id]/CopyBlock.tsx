"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { sendInviteToMyPhone } from "./invite-actions";

// Copy-paste P2P invite block (consent-flow.md steps 5-6). The family member
// copies this warm, first-person message (with the storyteller's own /c/<token>
// authorization link) and sends it from THEIR OWN phone — a person-to-person
// text, not our A2P system.
//
// "Send this to my phone" texts a copy of the invitation to the MEMBER's own
// opted-in number so it's easy to forward from their handset. On demand only,
// and never to the storyteller — their copy always stays person-to-person.
// Client island for the clipboard + the send; the message text is rendered
// server-side.
export default function CopyBlock({
  message,
  storytellerId,
}: {
  message: string;
  storytellerId: string;
}) {
  const [copied, setCopied] = useState(false);
  const [sendState, setSendState] = useState<
    null | { kind: "sent" } | { kind: "needs-verify" } | { kind: "stopped" } | { kind: "error" }
  >(null);
  const [pending, startTransition] = useTransition();

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked (older browser / permissions) — the text is still
      // selectable in the box below, so the member can copy it manually.
      setCopied(false);
    }
  }

  function sendToPhone() {
    setSendState(null);
    startTransition(async () => {
      const res = await sendInviteToMyPhone(storytellerId);
      if (res.status === "sent") setSendState({ kind: "sent" });
      else if (res.status === "skipped" && res.reason === "suppressed")
        setSendState({ kind: "stopped" });
      else if (res.status === "skipped") setSendState({ kind: "needs-verify" });
      else setSendState({ kind: "error" });
    });
  }

  return (
    <div className="mt-3 rounded-xl border border-line bg-surface2/40 p-3">
      <p className="whitespace-pre-wrap break-words text-sm text-ink/85">{message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="btn-primary text-sm">
          {copied ? "Copied ✓" : "Copy message"}
        </button>
        <button
          type="button"
          onClick={sendToPhone}
          disabled={pending}
          className="btn-ink text-sm disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send this to my phone"}
        </button>
      </div>

      {sendState?.kind === "sent" && (
        <p className="mt-2.5 text-sm text-emerald-700">
          Sent — check your phone, then forward it to them. 📲
        </p>
      )}
      {sendState?.kind === "needs-verify" && (
        <p className="mt-2.5 text-sm text-ink/70">
          Verify your own mobile number first and we can text this to you.{" "}
          <Link href="/verify-phone" className="font-semibold text-brand hover:underline">
            Verify my number →
          </Link>
        </p>
      )}
      {sendState?.kind === "stopped" && (
        <p className="mt-2.5 text-sm text-ink/70">
          You replied STOP, so we&apos;ve stopped texting you. Text START to +1 623 235 8221
          to turn texts back on — or just copy the message above.
        </p>
      )}
      {sendState?.kind === "error" && (
        <p className="mt-2.5 text-sm text-ink/70">
          We couldn&apos;t text that just now. Copy the message above and send it from
          your phone.
        </p>
      )}
    </div>
  );
}
