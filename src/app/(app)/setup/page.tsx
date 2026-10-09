import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/auth";
import { loadSetupState } from "@/lib/setup";
import { buildConsentLink, inviteGreetingName } from "@/lib/consent/storyteller";
import { t, type Lang } from "@/lib/i18n";
import { formatPhone } from "@/lib/phone";
import SetupOverview from "./SetupOverview";
import CopyBlock from "../storytellers/[id]/CopyBlock";
import VoiceSetup from "../storytellers/VoiceSetup";
import { Photo } from "@/components/Photo";

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
  const fromNumber = process.env.TWILIO_FROM_NUMBER
    ? formatPhone(process.env.TWILIO_FROM_NUMBER)
    : null;

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
        name: await inviteGreetingName(sb, state.pending.id, user.id, state.pending.name),
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
                {/* 4C.H: voice BEFORE the invite. The first thing the storyteller
                    hears is the "Read this to me" on their invite page — in the
                    member's voice only if it exists by then. The invite stays one
                    tap away ("skip"), so voice is encouraged, never required.
                    VoiceSetup refreshes the page once cloned, and the invite
                    then shows directly. */}
                {state.hasVoice ? (
                  <InviteSend lang={lang} name={state.pending.name} storytellerId={state.pending.id} message={consentMessage} />
                ) : (
                  <>
                    <div className="mt-3 rounded-xl border border-line p-4">
                      <h3 className="font-serif text-lg font-semibold">
                        {t(lang, "setup_voice_first_title")}
                      </h3>
                      <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink/60">
                        {t(lang, "setup_voice_first_sub", { name: state.pending.name })}
                      </p>
                      <VoiceSetup linked={null} />
                    </div>
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-medium text-ink/60">
                        {t(lang, "setup_voice_skip")}
                      </summary>
                      <InviteSend lang={lang} name={state.pending.name} storytellerId={state.pending.id} message={consentMessage} />
                    </details>
                  </>
                )}

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
            {/* The porch light is on: setup is done and the first question is on its way. */}
            <Photo
              name="porchlight"
              sizes="(min-width: 768px) 48rem, 100vw"
              className="h-40 w-full rounded-xl object-cover sm:h-52"
              style={{ objectPosition: "70% 40%" }}
            />
            <h2 className="mt-6 font-serif text-2xl font-semibold">
              {t(lang, "setup_ready_title")}
            </h2>
            <p className="mt-2 text-ink/65">{t(lang, "setup_ready_sub")}</p>
            {fromNumber && (
              <p className="mx-auto mt-3 max-w-prose rounded-xl bg-surface2 px-3 py-2 text-sm text-ink/70">
                {t(lang, "setup_save_contact", { number: fromNumber })}
              </p>
            )}

            {/* Caught here too, for anyone who skipped it during the wait — the
                storyteller is about to start hearing questions. */}
            {!state.hasVoice && (
              <div className="mt-6 border-t border-line pt-6 text-left">
                <h3 className="font-serif text-lg font-semibold">
                  {t(lang, "setup_voice_title_ready")}
                </h3>
                <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink/60">
                  {t(lang, "setup_voice_sub_ready")}
                </p>
                <VoiceSetup linked={null} />
              </div>
            )}

            <Link href="/dashboard" className="btn-primary mt-6 inline-block">
              {t(lang, "setup_dashboard_cta")}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

// The copy-paste invite + "waiting for them" note (consent-flow.md steps 5-6).
function InviteSend({
  lang,
  name,
  storytellerId,
  message,
}: {
  lang: Lang;
  name: string;
  storytellerId: string;
  message: string;
}) {
  return (
    <>
      <p className="mt-1.5 text-sm text-ink/60">{t(lang, "setup_send_help", { name })}</p>
      <CopyBlock message={message} storytellerId={storytellerId} />
      <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
        {t(lang, "setup_send_waiting", { name })}
      </p>
    </>
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
