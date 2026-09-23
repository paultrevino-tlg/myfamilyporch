// Render every transactional email variant to HTML files so the shared layout
// can be eyeballed in a browser without sending anything. The hosted EmailJS
// template used to be the place you previewed changes; this replaces it.
//
//   npx tsx scripts/preview-email.ts [outDir]   (default: ./.email-preview)
//
// Relative import, not the "@/..." alias — tsx runs this outside Next's
// resolver. Nothing here touches the network or the Resend key.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderEmail, renderEmailText, type EmailParams } from "../src/lib/email/render";

const VARIANTS: Record<string, EmailParams> = {
  "magic-link": {
    to_email: "grandma@example.com",
    subject: "Sign in to My Family Porch",
    headline: "Your sign-in link",
    message_html:
      "Tap the button below to continue. This link expires shortly and can only be used once.",
    button_label: "Sign in",
    button_url: "https://myfamilyporch.net/auth/v1/verify?token=abc123&type=magiclink",
    footnote: "If you didn't request this, you can safely ignore this email.",
  },
  invitation: {
    to_email: "son@example.com",
    subject: "You're invited to The Hernández Family on My Family Porch",
    headline: "Join The Hernández Family",
    message_html:
      "You've been invited to help with <strong>The Hernández Family</strong> on My Family Porch as a admin. Open the link below to accept — sign in with this email address (son@example.com).",
    button_label: "Accept invitation",
    button_url: "https://myfamilyporch.net/invite/9f2c4e7a-1b3d-4f8a-9c2e-7d1a5b6c8e0f",
    footnote:
      "This invitation expires in 7 days. If you weren't expecting it, you can ignore this email.",
  },
  "export-ready": {
    to_email: "daughter@example.com",
    subject: "Abuela's recordings are ready to download",
    headline: "Your download is ready",
    message_html:
      "<p>We’ve packaged up everything you’ve recorded with <strong>Abuela</strong> — audio, transcripts, and your keepsake book — into a single download. It’s yours to keep, forever.</p><p>The link below works for the next 7 days; you can always request a fresh one any time.</p>",
    button_label: "Download everything",
    button_url: "https://myfamilyporch.net/api/export/download?job=1234",
    footnote: "My Family Porch — your stories are always yours.",
  },
  // No button, no footnote — exercises the optional blocks being absent.
  "lead-notice": {
    to_email: "support@myfamilyporch.net",
    subject: "New porch lead",
    headline: "Someone wants to stay in touch",
    message_html:
      '<p><strong>Pat Q. &lt;script&gt;</strong> asked to be kept posted about My Family Porch.</p><p>Email: <a href="mailto:pat@example.com">pat@example.com</a></p>',
    footnote: "Sent from the marketing site email-capture form.",
  },
};

const outDir = process.argv[2] ?? ".email-preview";
mkdirSync(outDir, { recursive: true });

for (const [name, params] of Object.entries(VARIANTS)) {
  writeFileSync(join(outDir, `${name}.html`), renderEmail(params), "utf8");
  writeFileSync(join(outDir, `${name}.txt`), renderEmailText(params), "utf8");
  console.log(`wrote ${join(outDir, name)}.{html,txt}`);
}
