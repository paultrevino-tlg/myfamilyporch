import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/auth";
import { loadSetupState } from "@/lib/setup";
import { buildConsentLink } from "@/lib/consent/storyteller";
import { t } from "@/lib/i18n";
import SetupOverview from "./SetupOverview";
import CopyBlock from "../storytellers/[id]/CopyBlock";

// Guided family-member setup (consent-flow.md). The overview graphic is always
// on top; below it, a single step card derived from the member's real state
// (verify number → add storyteller → send link → ready). Verify + add link out
// to their existing pages (?from=setup returns here); send-link is inline.
export default async function SetupPage() {
  const active = await getActiveMembership();
  if (!active) redirect("/onboarding"); // no family yet → create one first

  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const state = await loadSetupState(active.family_id, user.id);
  const lang = state.lang;

  // Build the inline copy-paste block for the send_link step.
  let consentMessage: string | null = null;
  if (state.step === "send_link" && state.pending?.phone) {
    const link = await buildConsentLink(
      state.pending.id,
      active.family_id,
      state.pending.phone,
      state.pending.language,
    );
    if (link) {
      consentMessage = t(state.pending.language, "copy_paste_block", {
        name: state.pending.name.trim().split(/\s+/)[0] || state.pending.name,
        link,
      });
    }
  }

  return (
    <main lang={lang} className="mx-auto max-w-2xl px-5 py-8 sm:px-7">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">
        {t(lang, "setup_title")}
      </h1>

      <div className="mt-6">
        <SetupOverview lang={lang} currentStep={state.currentStepNo} />
      </div>

      <div className="card mt-6 p-6">
        {state.step === "verify_number" && (
          <StepCard
            title={t(lang, "setup_verify_title")}
            sub={t(lang, "setup_verify_sub")}
            href="/verify-phone?from=setup"
            cta={t(lang, "setup_verify_cta")}
          />
        )}

        {state.step === "add_storyteller" && (
          <StepCard
            title={t(lang, "setup_add_title")}
            sub={t(lang, "setup_add_sub")}
            href="/storytellers/new"
            cta={t(lang, "setup_add_cta")}
          />
        )}

        {state.step === "send_link" && state.pending && (
          <div>
            <h2 className="font-serif text-xl font-semibold">
              {t(lang, "setup_send_title", { name: state.pending.name })}
            </h2>
            {consentMessage ? (
              <>
                <p className="mt-1.5 text-sm text-ink/60">
                  {t(lang, "setup_send_help", { name: state.pending.name })}
                </p>
                <CopyBlock message={consentMessage} />
                <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                  {t(lang, "setup_send_waiting", { name: state.pending.name })}
                </p>
                <Link href="/dashboard" className="btn-ghost mt-4 inline-block">
                  {t(lang, "setup_dashboard_cta")}
                </Link>
              </>
            ) : (
              // Pending storyteller with no number yet → send them to add it.
              <StepCard
                sub={t(lang, "setup_send_needphone", { name: state.pending.name })}
                href={`/storytellers/${state.pending.id}`}
                cta={t(lang, "setup_send_needphone_cta")}
              />
            )}
          </div>
        )}

        {state.step === "ready" && (
          <div className="text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-brand/10 text-4xl">
              🎉
            </div>
            <h2 className="mt-4 font-serif text-2xl font-semibold">
              {t(lang, "setup_ready_title")}
            </h2>
            <p className="mt-2 text-ink/65">{t(lang, "setup_ready_sub")}</p>
            <Link href="/dashboard" className="btn-primary mt-6 inline-block">
              {t(lang, "setup_dashboard_cta")}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

function StepCard({
  title,
  sub,
  href,
  cta,
}: {
  title?: string;
  sub: string;
  href: string;
  cta: string;
}) {
  return (
    <div>
      {title && <h2 className="font-serif text-xl font-semibold">{title}</h2>}
      <p className="mt-1.5 text-ink/65">{sub}</p>
      <Link href={href} className="btn-primary mt-4 inline-block">
        {cta}
      </Link>
    </div>
  );
}
