/**
 * Provision a new family + owner account and email them a welcome (TODO 9.0).
 * The operator's way to add a family until Stripe Checkout (9.2/9.3) does it.
 * Idempotent: re-running for the same email returns the family they own.
 *
 * Run: npm run family:create -- --email sam@example.com --family "The Lopez Family" [--owner Sam] [--base https://myfamilyporch.net] [--no-email]
 * Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY from .dev.vars.
 */
import { provisionFamily, sendWelcomeEmail } from "../src/lib/billing/provision";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email");
  const familyName = arg("family");
  if (!email || !familyName) {
    console.error('Usage: npm run family:create -- --email <email> --family "<family name>" [--owner <first name>] [--base <url>] [--no-email]');
    process.exit(1);
  }
  const baseUrl = arg("base") ?? "https://myfamilyporch.net";

  const res = await provisionFamily({ email, familyName, ownerName: arg("owner") });
  console.log(
    `${res.userCreated ? "Created" : "Found"} user ${res.userId}; family ${res.familyId}`,
  );

  if (process.argv.includes("--no-email")) {
    console.log("Skipped the welcome email (--no-email).");
    return;
  }
  await sendWelcomeEmail({ email, familyName, baseUrl });
  console.log(`Welcome email sent to ${email} (sign-in at ${baseUrl}/login).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
