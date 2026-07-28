import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";
import { buildConsentLink } from "@/lib/consent/storyteller";
import {
  deriveStorytellerSetupStep,
  ST_STEP_NO,
  ST_STEP_TOTAL,
  type StorytellerSetupStep,
} from "@/lib/setup";
import { t, type Lang } from "@/lib/i18n";
import PhoneForm from "../PhoneForm";
import InvitePanel from "../InvitePanel";

// Per-storyteller onboarding (Option B). One thing per screen, so adding the
// second storyteller is as guided as the first — the family wizard at /setup
// hands off here once the family has its first opted-in storyteller.
//
// The step is DERIVED from the storyteller's own row each render, so this is
// resumable by construction: leave mid-flow, come back, land where you were.
// Admin-only; RLS (st_write) is the real boundary.

const TITLES: Record<StorytellerSetupStep, string> = {
  number: "Add their mobile number",
  invite: "Send them their invite",
  stopped: "They've opted out of texts",
  ready: "All set",
};

export default async function StorytellerSetupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const active = await getActiveMembership();
  if (!active) redirect("/onboarding");

  const sb = await supabaseServer();
  // RLS-scoped: a storyteller from another family resolves to nothing.
  const { data: st } = await sb
    .from("storytellers")
    .select("id, name, phone, language, consent_state")
    .eq("id", id)
    .eq("family_id", active.family_id)
    .maybeSingle();
  if (!st) notFound();

  if (!roleAtLeast(active.role, "admin")) {
    return (
      <main className="mx-auto max-w-xl px-5 py-10 sm:px-7">
        <p className="text-sm text-ink/55">Only owners and admins can set up a storyteller.</p>
        <Link href={`/storytellers/${st.id}`} className="link mt-4 inline-block text-sm">
          Back to {st.name}
        </Link>
      </main>
    );
  }

  const step = deriveStorytellerSetupStep({
    hasPhone: !!st.phone?.trim(),
    consentState: st.consent_state,
  });

  // Mint the invite fresh (stateless token) only when there's a number to point
  // it at and they haven't already opted in.
  const stLang: Lang = st.language === "es" ? "es" : "en";
  const link =
    step === "invite" && st.phone?.trim()
      ? await buildConsentLink(st.id, active.family_id, st.phone.trim(), stLang)
      : null;
  const inviteMessage = link
    ? t(stLang, "copy_paste_block", {
        name: st.name.trim().split(/\s+/)[0] || st.name,
        link,
      })
    : null;

  const stepNo = ST_STEP_NO[step];

  return (
    <main className="mx-auto max-w-xl px-5 py-8 sm:px-7">
      <Link href={`/storytellers/${st.id}`} className="text-sm font-semibold text-ink/50 hover:text-ink">
        ← {st.name}
      </Link>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.08em] text-ink/45">
        Setting up {st.name}
      </p>
      <h1 className="mt-1.5 font-serif text-3xl font-semibold tracking-tight">{TITLES[step]}</h1>

      {/* Progress: three stops, the last one being their own opt-in. */}
      <ol className="mt-5 flex items-center gap-2" aria-label={`Step ${stepNo} of ${ST_STEP_TOTAL}`}>
        {Array.from({ length: ST_STEP_TOTAL }, (_, i) => i + 1).map((n) => (
          <li
            key={n}
            aria-current={n === stepNo ? "step" : undefined}
            className={`h-2 flex-1 rounded-full ${
              n < stepNo ? "bg-brand" : n === stepNo ? "bg-brand/60" : "bg-line"
            }`}
          />
        ))}
      </ol>

      {sp.saved === "phone" && (
        <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
          Number saved. 📱
        </p>
      )}
      {sp.error === "phone" && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          That doesn&apos;t look like a phone number. Use the full number, e.g. +1 602 555 4471.
        </p>
      )}

      <div className="card mt-6 p-6">
        {step === "number" && (
          <>
            <p className="max-w-prose text-sm leading-relaxed text-ink/65">
              Where should we text {st.name} their recording link? They&apos;ll confirm
              this number themselves before we send anything.
            </p>
            <div className="mt-4">
              <PhoneForm
                storytellerId={st.id}
                storytellerName={st.name}
                phone={st.phone}
                from="setup"
              />
            </div>
          </>
        )}

        {(step === "invite" || step === "stopped") && (
          <>
            <InvitePanel
              storytellerId={st.id}
              storytellerName={st.name}
              consentState={st.consent_state}
              message={inviteMessage}
            />
            {step === "invite" && (
              <p className="mt-5 border-t border-line pt-4 text-sm text-ink/60">
                Waiting on {st.name}. This page updates once they tap the link and opt
                in — nothing is sent to them until they do.
              </p>
            )}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-ink/55">
                Wrong number?
              </summary>
              <div className="mt-3">
                <PhoneForm
                  storytellerId={st.id}
                  storytellerName={st.name}
                  phone={st.phone}
                  from="setup"
                />
              </div>
            </details>
          </>
        )}

        {step === "ready" && (
          <>
            <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
              ✓ {st.name} opted in — story texts are on.
            </p>
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-ink/65">
              They&apos;re ready to record. Two things worth doing next:
            </p>
            <div className="mt-4 space-y-2.5">
              <NextStep
                href={`/storytellers/${st.id}?open=schedule`}
                title="Set their schedule"
                sub="Reminders only go out on the days you pick — without a schedule, nothing is sent automatically."
              />
              <NextStep
                href="/settings"
                title="Record your voice"
                sub="If you're their interviewer, they'll hear the questions in your voice."
              />
            </div>
          </>
        )}
      </div>

      <Link
        href={`/storytellers/${st.id}`}
        className="mt-5 inline-block text-sm font-semibold text-ink/55 hover:text-ink"
      >
        {step === "ready" ? `Go to ${st.name}'s page →` : "Finish this later"}
      </Link>
    </main>
  );
}

function NextStep({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-line px-4 py-3 transition hover:border-brand/40 hover:bg-brand/5"
    >
      <span className="text-sm font-semibold text-ink">{title}</span>
      <span className="mt-0.5 block text-xs leading-relaxed text-ink/55">{sub}</span>
    </Link>
  );
}
