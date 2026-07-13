import type { Metadata } from "next";
import Link from "next/link";
import { loadConsentContext } from "@/lib/consent/storyteller";
import { t, type Lang } from "@/lib/i18n";
import { submitConsent } from "./actions";
import HearThis from "./HearThis";

// Storyteller authorization page (consent-flow.md step 7). The legal spine: the
// storyteller's OWN first-person tap is the operative consent. Token-gated
// (tapped on their phone, no login), rendered in their language, in the
// (storyteller) route group for the large low-vision elder fonts. A forged/dead
// token fails soft to a calm screen — never a stack trace, never a login wall.
export const metadata: Metadata = { robots: { index: false } };

function DeadLink({ lang }: { lang: Lang }) {
  return (
    <main lang={lang} className="flex min-h-screen items-center justify-center p-6 text-center">
      <div className="max-w-sm">
        <p className="font-serif text-3xl">{t(lang, "consent_dead_title")}</p>
        <p className="mt-4 text-xl leading-relaxed text-ink/65">{t(lang, "consent_dead_sub")}</p>
      </div>
    </main>
  );
}

function Success({ lang }: { lang: Lang }) {
  return (
    <main lang={lang} className="flex min-h-screen items-center justify-center p-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-brand/10 text-5xl">
          🎉
        </div>
        <h1 className="mt-5 font-serif text-4xl font-semibold">
          {t(lang, "consent_success_title")}
        </h1>
        <p className="mt-4 text-2xl leading-relaxed text-ink/70">
          {t(lang, "consent_success_sub")}
        </p>
      </div>
    </main>
  );
}

export default async function ConsentPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ lang?: string; done?: string; error?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const override: Lang | null = sp.lang === "es" ? "es" : sp.lang === "en" ? "en" : null;

  // Success screen renders straight from the query (no re-confirm).
  if (sp.done === "1") return <Success lang={override ?? "en"} />;

  const ctx = await loadConsentContext(token);
  if (!ctx) return <DeadLink lang={override ?? "en"} />;

  // The storyteller may switch language before opting in (SPEC): ?lang overrides
  // the token's default for display + for the language they opt in under.
  const lang: Lang = override ?? ctx.language;
  const other: Lang = lang === "es" ? "en" : "es";
  const maskedNumber = `(•••) •••-${ctx.last4}`;
  const hearText = `${t(lang, "consent_what_it_is")} ${t(lang, "consent_whats_next")} ${t(lang, "consent_optin_control")}`;

  return (
    <main lang={lang} className="mx-auto min-h-screen max-w-xl px-5 py-10 sm:px-7">
      {/* Language switch — the recipient controls the language they consent in. */}
      <div className="flex justify-end">
        <Link
          href={`/c/${token}?lang=${other}`}
          className="rounded-xl px-3 py-2 text-lg font-bold text-accent underline"
        >
          {other === "es" ? "Español" : "English"}
        </Link>
      </div>

      <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight">
        {t(lang, "consent_title")}
      </h1>
      <p className="mt-5 text-2xl leading-relaxed text-ink/80">{t(lang, "consent_what_it_is")}</p>
      <p className="mt-4 text-2xl leading-relaxed text-ink/80">{t(lang, "consent_whats_next")}</p>

      <div className="mt-6">
        <HearThis
          text={hearText}
          lang={lang}
          label={t(lang, "consent_hear")}
          stopLabel={`⏹ ${t(lang, "consent_stop")}`}
        />
      </div>

      <form action={submitConsent} className="mt-8 space-y-6">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="language" value={lang} />

        <label className="block">
          <span className="text-xl text-ink/60">{t(lang, "consent_name_label")}</span>
          <input
            name="name"
            defaultValue={ctx.name}
            className="mt-2 w-full rounded-2xl border-2 border-line bg-paper px-4 py-3.5 text-2xl"
          />
        </label>

        <div className="block">
          <span className="text-xl text-ink/60">{t(lang, "consent_number_label")}</span>
          <div className="mt-2 rounded-2xl border-2 border-line bg-surface2/40 px-4 py-3.5 text-2xl text-ink/75">
            {maskedNumber}
          </div>
        </div>

        {sp.error === "optin" && (
          <p className="rounded-2xl bg-amber-50 px-4 py-3.5 text-xl leading-relaxed text-amber-800">
            {t(lang, "consent_optin_required")}
          </p>
        )}

        {/* First-person opt-in control — unchecked by default, clear & conspicuous. */}
        <label className="flex items-start gap-4 rounded-2xl border-2 border-line bg-paper p-5">
          <input type="checkbox" name="consent" className="mt-1.5 h-7 w-7 shrink-0" />
          <span className="text-xl leading-relaxed text-ink/85">
            {t(lang, "consent_optin_control")}
          </span>
        </label>

        <button
          type="submit"
          className="min-h-[64px] w-full rounded-2xl bg-brand px-6 text-2xl font-bold text-white shadow-sm active:translate-y-px"
        >
          {t(lang, "consent_agree_btn")}
        </button>
      </form>

      <footer className="mt-8 flex justify-center gap-6 text-lg text-ink/55">
        <Link href="/terms" className="underline">
          {t(lang, "consent_terms")}
        </Link>
        <Link href="/privacy" className="underline">
          {t(lang, "consent_privacy")}
        </Link>
      </footer>
    </main>
  );
}
