import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";
import { buildConsentLink } from "@/lib/consent/storyteller";
import {
  deriveStorytellerSetupStep,
  ST_STEP_NO,
  ST_STEPS,
  type StorytellerSetupStep,
} from "@/lib/setup";
import { loadStorytellerSchedule } from "@/lib/schedule";
import { t, type Lang } from "@/lib/i18n";
import PhoneForm from "../PhoneForm";
import InvitePanel from "../InvitePanel";
import ScheduleEditor from "../ScheduleEditor";

// Per-storyteller onboarding (Option B). One thing per screen, so adding the
// second storyteller is as guided as the first — the family wizard at /setup
// hands off here once the family has its first opted-in storyteller.
//
// The step is DERIVED from the storyteller's own row each render, so this is
// resumable by construction: leave mid-flow, come back, land where you were.
// Admin-only; RLS (st_write) is the real boundary.

const TITLES: Record<StorytellerSetupStep, string> = {
  number: "Add their mobile number",
  schedule: "Choose when we reach out",
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

  // Needed both to derive the step (a missing row means the cron never nudges
  // them) and to render the editor on the schedule step.
  const schedule = await loadStorytellerSchedule(active.family_id, st.id);

  const step = deriveStorytellerSetupStep({
    hasPhone: !!st.phone?.trim(),
    hasSchedule: !!schedule?.saved,
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

      {/* Your three steps, then the hand-off. The last stop is the storyteller's
          own tap — shown dashed and labelled so it never reads as a step you
          failed to finish (same "you / them" split as the family wizard). */}
      <ol className="mt-5 flex items-end gap-2" aria-label={`Step ${stepNo} of ${ST_STEPS.length}, then their opt-in`}>
        {ST_STEPS.map((s, i) => {
          const n = i + 1;
          return (
            <li key={s.key} className="flex-1" aria-current={n === stepNo ? "step" : undefined}>
              <div
                className={`h-2 rounded-full ${
                  n < stepNo ? "bg-brand" : n === stepNo ? "bg-brand/60" : "bg-line"
                }`}
              />
              <span
                className={`mt-1.5 block text-[11px] font-semibold ${
                  n <= stepNo ? "text-ink/70" : "text-ink/35"
                }`}
              >
                {s.label}
              </span>
            </li>
          );
        })}
        <li className="flex-1">
          <div
            className={`h-2 rounded-full border border-dashed ${
              step === "ready" ? "border-brand bg-brand/30" : "border-line"
            }`}
          />
          <span className="mt-1.5 block text-[11px] font-semibold text-ink/35">
            They opt in
          </span>
        </li>
      </ol>

      {sp.saved === "phone" && (
        <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
          Number saved. 📱
        </p>
      )}
      {sp.saved === "schedule" && (
        <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
          Schedule saved. 🗓️
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

        {step === "schedule" && schedule && (
          <>
            <p className="max-w-prose text-sm leading-relaxed text-ink/65">
              Pick the mornings we&apos;ll text {st.name} their recording link. This
              comes before the invite on purpose — their welcome text promises
              we&apos;ll reach out, and without a schedule nothing would ever be sent.
            </p>
            <div className="mt-4">
              <ScheduleEditor st={schedule} canManage from="setup" />
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
            {/* The last step is the storyteller's own tap, which the member can't
                perform — so this is where THEIR part of the flow ends. Without an
                explicit finish, the invite screen is a dead end. */}
            {step === "invite" && (
              <>
                <p className="mt-5 border-t border-line pt-4 text-sm text-ink/60">
                  That&apos;s everything on your side. Once {st.name} taps the link and
                  says yes, they&apos;re set up — you&apos;ll get a text, and this page
                  updates on its own. Nothing is sent to them until they do.
                </p>
                <Link href={`/storytellers/${st.id}`} className="btn-primary mt-4 inline-block">
                  I&apos;ve sent it — done
                </Link>
              </>
            )}
            {step === "stopped" && (
              <Link href={`/storytellers/${st.id}`} className="btn-primary mt-5 inline-block">
                Back to {st.name}&apos;s page
              </Link>
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
              Their number, schedule, and consent are all in place — reminders will go
              out on the days you picked. Two optional things worth doing:
            </p>
            <div className="mt-4 space-y-2.5">
              <NextStep
                href="/settings"
                title="Record your voice"
                sub="If you're their interviewer, they'll hear the questions in your voice instead of reading them."
              />
              <NextStep
                href={`/storytellers/${st.id}?open=topics`}
                title="Steer their topics"
                sub="Focus on what matters to your family, or quietly avoid subjects that don't. Fine by default."
              />
            </div>
          </>
        )}
      </div>

      {/* Secondary escape only where there's no primary action yet — once the
          card carries its own button, a second link just competes with it. */}
      {(step === "number" || step === "ready") && (
        <Link
          href={`/storytellers/${st.id}`}
          className="mt-5 inline-block text-sm font-semibold text-ink/55 hover:text-ink"
        >
          {step === "ready" ? `Go to ${st.name}'s page →` : "Finish this later"}
        </Link>
      )}
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
