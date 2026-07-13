import { headers } from "next/headers";
import { confirmMemberVerification } from "@/lib/consent/member";
import { t } from "@/lib/i18n";

// Member phone-verification CONFIRM page (consent-flow.md step 3). Public,
// token-gated — tapped from the SMS on the member's phone, which may carry no
// Supabase session. The signed token IS the authorization; confirmMemberVerification
// applies the opt-in via the service role and records the consent_event. Never
// crashes: a forged/expired token renders a calm dead-link screen (200).
export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

export default async function VerifyConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const h = await headers();
  const ip =
    h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = h.get("user-agent");

  const result = await confirmMemberVerification(token, { ip, ua });
  const lang = result.status === "confirmed" ? result.language : "en";
  const ok = result.status === "confirmed";

  return (
    <main
      lang={lang}
      className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6"
    >
      <div className="card p-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand/10 text-4xl">
          {ok ? "✅" : "🔗"}
        </div>
        <h1 className="mt-4 font-serif text-2xl font-semibold">
          {t(lang, ok ? "member_confirm_title" : "member_confirm_dead_title")}
        </h1>
        <p className="mt-3 text-ink/65">
          {t(lang, ok ? "member_confirm_sub" : "member_confirm_dead_sub")}
        </p>
      </div>
    </main>
  );
}
