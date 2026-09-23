// The ONE transactional email layout, in code. Resend has no hosted template
// editor (unlike EmailJS, which this replaced), so the "one reusable template"
// becomes one reusable render function: it owns the brand header, card,
// typography, CTA button and footer, and every call site supplies content only.
//
// Email-client-safe: table layout, all-inline styles, web-safe fonts, solid
// colour fallbacks behind the gradient (Outlook ignores gradients), and a VML
// roundrect so Outlook desktop still gets a rounded button.
//
// Everything is escaped EXCEPT `message_html`, which is raw body HTML by
// design — call sites that interpolate user data into it must escape it
// themselves with `escapeHtml` below.

export type EmailParams = {
  to_email: string;
  subject: string;
  headline: string;
  message_html: string;
  button_label?: string;
  button_url?: string;
  footnote?: string;
};

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Plain-text alternative, derived from the same copy so the two parts can never
// drift. Clients that prefer text/plain (and some spam filters) want one.
export function renderEmailText(params: EmailParams): string {
  const body = params.message_html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;|&lsquo;|&#39;/g, "'")
    .replace(/&ldquo;|&rdquo;|&quot;/g, '"')
    .replace(/&middot;/g, "-")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const parts = [params.headline, body];
  if (params.button_url) {
    parts.push(`${params.button_label || "Continue"}: ${params.button_url}`);
  }
  if (params.footnote) parts.push(params.footnote);
  parts.push(
    `Sent to ${params.to_email}\nMy Family Porch - recording your family's stories`,
  );
  return parts.join("\n\n");
}

export function renderEmail(params: EmailParams): string {
  const subject = escapeHtml(params.subject);
  const headline = escapeHtml(params.headline);
  const hasButton = Boolean(params.button_url);
  const buttonUrl = escapeHtml(params.button_url ?? "");
  const buttonLabel = escapeHtml(params.button_label || "Continue");
  const toEmail = escapeHtml(params.to_email);

  // Outlook desktop can't round a padded <a>, so it gets a VML roundrect and
  // every other client gets the anchor. The two are mutually exclusive.
  const button = hasButton
    ? `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 4px auto;">
                <tr>
                  <td align="center">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${buttonUrl}" style="height:48px; v-text-anchor:middle; width:260px;" arcsize="25%" stroke="f" fillcolor="#2563EB">
                      <w:anchorlock/>
                      <center style="color:#ffffff; font-family:Arial,Helvetica,sans-serif; font-size:16px; font-weight:bold;">${buttonLabel}</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <a href="${buttonUrl}" target="_blank"
                       style="display:inline-block; background-color:#2563EB; padding:14px 32px; font-family:Arial,Helvetica,sans-serif; font-size:16px; font-weight:bold; line-height:20px; color:#ffffff; text-decoration:none; border-radius:12px;">${buttonLabel}</a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>`
    : "";

  const footnote = params.footnote
    ? `
              <p style="margin:24px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:13px; line-height:1.5; color:#5b6b85;">
                ${escapeHtml(params.footnote)}
              </p>`
    : "";

  // Plain-link fallback: the button can be stripped, blocked or unclickable.
  const linkFallback = hasButton
    ? `
              <p style="margin:20px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.5; color:#8a98ad;">
                If the button doesn&rsquo;t work, copy and paste this link into your browser:<br>
                <a href="${buttonUrl}" target="_blank" style="color:#2563EB; text-decoration:underline; word-break:break-all;">${buttonUrl}</a>
              </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${subject}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0; padding:0; background-color:#EBF1F8; -webkit-font-smoothing:antialiased; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
  <!-- Preheader (hidden preview text). -->
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#EBF1F8; opacity:0;">
    ${headline}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#EBF1F8;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <!-- Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; width:100%;">

          <!-- Brand header -->
          <tr>
            <td align="center" style="padding:8px 8px 24px 8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle" style="padding-right:12px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" valign="middle"
                            style="width:44px; height:44px; border-radius:12px; background-color:#2563EB; background-image:linear-gradient(135deg,#2563EB,#38BDF8); font-size:22px; line-height:44px; text-align:center;">
                          &#127969;
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td valign="middle"
                      style="font-family:Arial,Helvetica,sans-serif; font-size:19px; font-weight:bold; letter-spacing:-0.2px; color:#15233B;">
                    My Family Porch
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#FFFFFF; border:1px solid #E1E9F2; border-radius:20px; padding:40px 40px 36px 40px; box-shadow:0 4px 10px rgba(21,35,59,0.07);">

              <h1 style="margin:0 0 16px 0; font-family:Arial,Helvetica,sans-serif; font-size:24px; line-height:1.25; font-weight:bold; letter-spacing:-0.4px; color:#15233B;">
                ${headline}
              </h1>

              <!-- Body copy: RAW HTML from the call site, escaped there. -->
              <div style="font-family:Arial,Helvetica,sans-serif; font-size:16px; line-height:1.6; color:#15233B;">
                ${params.message_html}
              </div>
${button}${footnote}${linkFallback}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 16px 8px 16px;">
              <p style="margin:0 0 4px 0; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.5; color:#8a98ad;">
                Sent to ${toEmail}
              </p>
              <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.5; color:#8a98ad;">
                My Family Porch &middot; recording your family&rsquo;s stories
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}
