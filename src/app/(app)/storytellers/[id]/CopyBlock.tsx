"use client";

import { useState } from "react";

// Copy-paste P2P invite block (consent-flow.md steps 5-6). The family member
// copies this warm, first-person message (with the storyteller's own /c/<token>
// authorization link) and sends it from THEIR OWN phone — a person-to-person
// text, not our A2P system. Client island only for the clipboard button; the
// message text is rendered server-side.
export default function CopyBlock({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="mt-3 rounded-xl border border-line bg-surface2/40 p-3">
      <p className="whitespace-pre-wrap break-words text-sm text-ink/85">{message}</p>
      <button type="button" onClick={copy} className="btn-primary mt-3 text-sm">
        {copied ? "Copied ✓" : "Copy message"}
      </button>
    </div>
  );
}
