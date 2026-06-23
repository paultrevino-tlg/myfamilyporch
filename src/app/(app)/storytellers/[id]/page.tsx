import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";
import { loadStories, type Story, type StoryFollowUp } from "@/lib/stories";
import PlayAudioButton from "../../PlayAudioButton";
import ExportPanel, { type ExportJob } from "./ExportPanel";
import {
  loadStorytellerSchedule,
  DAY_CODES,
  TIMEZONES,
  type DayCode,
  type StorytellerSchedule,
  type EngagementSensitivity,
} from "@/lib/schedule";
import {
  loadStorytellerTopics,
  type StorytellerTopics,
  type TopicRow,
  type TopicPreference,
} from "@/lib/topics";
import { decryptToken } from "@/lib/storyteller/crypto";
import { loadFamilyMembers } from "@/lib/members";
import {
  updateStoryteller,
  setInterviewer,
  createRecordingLink,
  revokeRecordingLinks,
  sendNudge,
  translateAllStories,
  deleteStoryteller,
} from "../actions";
import { setStorytellerPhone } from "../../settings/actions";
import { saveSchedule, askNow } from "../../schedule/actions";
import { setTopicPreference } from "../../topics/actions";

// Per-storyteller hub. RLS scopes every read to the member's families; we also
// pin to the active family + this storyteller id. This is the single place to
// configure one storyteller: each setting is an expandable box whose body holds
// the real inline editor (admins) or a calm read-only summary (viewers). Their
// answers are listed below (review/edit stays on /stories — one source of truth).

const PRONOUN_LABEL: Record<string, string> = {
  he_him: "he/him",
  she_her: "she/her",
  they_them: "they/them",
};
const KIND_LABEL: Record<string, string> = {
  any: "Any",
  parent: "Parent",
  grandparent: "Grandparent",
  aunt_uncle: "Aunt / Uncle",
  sibling: "Sibling",
  spouse: "Spouse",
  other: "Other",
};
const KINDS = Object.keys(KIND_LABEL);
const PREF_LABEL: Record<TopicPreference, string> = {
  ease_off: "Ease off",
  focus: "Focus next",
  avoid: "Avoid",
};
const SENSITIVITY_LABEL: Record<EngagementSensitivity, string> = {
  gentle: "Gentle",
  standard: "Standard",
  sensitive: "Sensitive",
};
const DAY_LABEL: Record<DayCode, string> = {
  SU: "Su",
  MO: "Mo",
  TU: "Tu",
  WE: "We",
  TH: "Th",
  FR: "Fr",
  SA: "Sa",
};
const inputCls = "mt-1 input";

// A calm relative day ("Today", "Fri", "12 days ago") — never a raw timestamp.
function relDay(iso: string): string {
  const then = new Date(iso);
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return then.toLocaleDateString("en-US", { weekday: "short" });
  return `${days} days ago`;
}

function formatDuration(sec: number | null): string | null {
  if (!sec || sec < 1) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m} min ${s} sec` : `${s} sec`;
}

// "10:00" → "10:00 AM" for the read-only / pill display.
function prettyTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function tzLabel(tz: string): string {
  return TIMEZONES.find((z) => z.value === tz)?.label ?? tz;
}

function daysSummary(days: DayCode[]): string {
  if (days.length === 0) return "No days set";
  if (days.length === 7) return "Every day";
  return DAY_CODES.filter((d) => days.includes(d))
    .map((d) => DAY_LABEL[d])
    .join(" · ");
}

export default async function StorytellerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; sent?: string; export?: string; translated?: string }>;
}) {
  const active = await getActiveMembership();
  if (!active) redirect("/onboarding");

  const { id } = await params;
  const sp = await searchParams;
  const canManage = roleAtLeast(active.role, "admin");
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: stData } = await sb
    .from("storytellers")
    .select("id,name,pronouns,birth_year,language,phone")
    .eq("family_id", active.family_id)
    .eq("id", id)
    .maybeSingle();

  // Not in this family (or doesn't exist) → 404, never leak another tenant.
  if (!stData) notFound();
  const st = stData as {
    id: string;
    name: string;
    pronouns: string;
    birth_year: number | null;
    language: string;
    phone: string | null;
  };

  // Who interviews this storyteller (voice-per-member): the single is_interviewer
  // relationship, plus the family roster (with each member's voice status) for the
  // picker. The interviewer lends their own cloned voice.
  const [{ data: interviewerRel }, members] = await Promise.all([
    sb
      .from("storyteller_relationships")
      .select("user_id, address_term, kind, asker_relation")
      .eq("storyteller_id", id)
      .eq("family_id", active.family_id)
      .eq("is_interviewer", true)
      .maybeSingle(),
    loadFamilyMembers(active.family_id),
  ]);
  const interviewer = interviewerRel
    ? members.find((m) => m.userId === interviewerRel.user_id) ?? null
    : null;

  // Recording links, schedule, topics, this elder's answers, and the latest
  // export job (7.6) — in parallel. The export read is RLS-scoped (exp_select).
  const [tokenRes, schedule, topics, stories, exportRes] = await Promise.all([
    sb
      .from("storyteller_tokens")
      .select("created_at,last_used_at,token_enc")
      .eq("family_id", active.family_id)
      .eq("storyteller_id", id)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
    loadStorytellerSchedule(active.family_id, id),
    loadStorytellerTopics(active.family_id, id),
    loadStories(active.family_id, id),
    sb
      .from("exports")
      .select("id, status, expires_at")
      .eq("family_id", active.family_id)
      .eq("storyteller_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const exportJob: ExportJob = exportRes.data
    ? {
        id: exportRes.data.id,
        status: exportRes.data.status,
        expiresAt: exportRes.data.expires_at,
      }
    : null;

  // Rebuild the shareable /s/<token> URL from the encrypted-at-rest copy of the
  // newest link (same logic the old list page used).
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  let linkCount = 0;
  let lastUsed: string | null = null;
  let linkUrl: string | null = null;
  for (const t of tokenRes.data ?? []) {
    linkCount += 1;
    if (t.last_used_at && (!lastUsed || t.last_used_at > lastUsed)) lastUsed = t.last_used_at;
    if (!linkUrl && t.token_enc) {
      const raw = await decryptToken(t.token_enc);
      if (raw) linkUrl = `${origin}/s/${raw}`;
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-7">
      <Link href="/dashboard" className="text-sm font-semibold text-ink/50 hover:text-ink">
        ← Dashboard
      </Link>
      <div className="mt-3 flex items-center gap-4">
        <div className="grid h-14 w-14 flex-none place-items-center rounded-full bg-gradient-to-br from-brand to-brand2 text-lg font-bold text-white">
          {(st.name.trim()[0] ?? "·").toUpperCase()}
        </div>
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">{st.name}</h1>
          <p className="mt-1 text-sm text-ink/55">
            {PRONOUN_LABEL[st.pronouns] ?? st.pronouns}
            {st.birth_year ? ` · b. ${st.birth_year}` : ""}
            {` · ${st.language === "es" ? "Español" : "English"}`}
            {interviewer ? ` · ${interviewer.name} interviews` : ""}
          </p>
        </div>
      </div>

      {/* Banners surfaced by the inline editors' redirects. */}
      {sp.saved === "phone" && <Banner tone="green">Phone number saved. 📱</Banner>}
      {sp.saved === "schedule" && <Banner tone="green">Schedule saved. 🗓️</Banner>}
      {sp.saved === "interviewer" && <Banner tone="green">Interviewer saved. 🎙</Banner>}
      {sp.error === "interviewer" && (
        <Banner tone="red">Pick a family member and what {st.name} is called.</Banner>
      )}
      {sp.error === "phone" && (
        <Banner tone="red">
          That doesn&apos;t look like a phone number. Use the full number, e.g. +1 602 555 4471.
        </Banner>
      )}
      {sp.error === "consent" && (
        <Banner tone="red">
          Please check the consent box to confirm this person agreed to receive reminder texts.
        </Banner>
      )}
      {sp.error === "link" && (
        <Banner tone="red">
          Couldn&apos;t create the recording link. The storyteller-token secret may not be configured.
        </Banner>
      )}
      {(sp.sent === "nudge" || sp.sent === "asked") && <Banner tone="green">We sent the question. 💬</Banner>}
      {(sp.sent === "nudge_no-phone" || sp.sent === "asked_no-phone") && (
        <Banner tone="amber">No nudge sent — no phone number on file. Add one in Phone below.</Banner>
      )}
      {(sp.sent === "nudge_no-link" || sp.sent === "asked_no-link") && (
        <Banner tone="amber">
          No nudge sent — couldn&apos;t build a recording link. The storyteller-token secret may not be configured.
        </Banner>
      )}
      {(sp.sent === "nudge_failed" || sp.sent === "asked_failed") && (
        <Banner tone="red">Couldn&apos;t send it. The SMS provider may not be configured.</Banner>
      )}
      {sp.export === "preparing" && (
        <Banner tone="green">Preparing your download — we&apos;ll email you when it&apos;s ready. 📦</Banner>
      )}
      {sp.export === "error" && (
        <Banner tone="red">Couldn&apos;t start the export. Please try again.</Banner>
      )}
      {sp.translated === "done" && <Banner tone="green">Translated {st.name}&apos;s stories. 🌐</Banner>}
      {sp.translated === "none" && (
        <Banner tone="green">Every story is already translated. 🌐</Banner>
      )}
      {sp.translated === "failed" && (
        <Banner tone="red">Couldn&apos;t translate. The AI provider may not be configured.</Banner>
      )}

      {/* Setup — one expandable box per setting, each with that storyteller's
          own configuration inline. */}
      <section className="mt-8 space-y-2">
        <h2 className="text-lg font-semibold">Setup</h2>

        {/* Details ---------------------------------------------------------- */}
        <ConfigBox
          label="Details"
          value={`${PRONOUN_LABEL[st.pronouns] ?? st.pronouns} · ${
            st.birth_year ? `b. ${st.birth_year} · ` : ""
          }${st.language === "es" ? "Español" : "English"}`}
        >
          {canManage ? (
            <form action={updateStoryteller} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={st.id} />
              <label className="flex flex-col text-sm">
                <span className="text-ink/60">Name</span>
                <input name="name" required defaultValue={st.name} className={inputCls} />
              </label>
              <label className="flex flex-col text-sm">
                <span className="text-ink/60">Pronouns</span>
                <select name="pronouns" defaultValue={st.pronouns} className={inputCls}>
                  <option value="she_her">she/her</option>
                  <option value="he_him">he/him</option>
                  <option value="they_them">they/them</option>
                </select>
              </label>
              <label className="flex flex-col text-sm">
                <span className="text-ink/60">Birth year</span>
                <input
                  name="birth_year"
                  inputMode="numeric"
                  placeholder="1948"
                  defaultValue={st.birth_year ?? ""}
                  className={`${inputCls} w-24`}
                />
              </label>
              <label className="flex flex-col text-sm">
                <span className="text-ink/60">Language</span>
                <select name="language" defaultValue={st.language} className={inputCls}>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </label>
              <SaveButton />
            </form>
          ) : (
            <ViewerNote />
          )}
        </ConfigBox>

        {/* Interviewer + voice (voice-per-member) --------------------------- */}
        <ConfigBox
          label="Interviewer"
          value={interviewer ? interviewer.name : "Not set"}
          sub={
            interviewerRel?.address_term
              ? `Calls ${st.name} “${interviewerRel.address_term}”`
              : "Who asks the questions"
          }
        >
          {canManage ? (
            <>
              <form action={setInterviewer} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="storyteller_id" value={st.id} />
                <label className="flex flex-col text-sm">
                  <span className="text-ink/60">Who asks the questions?</span>
                  <select
                    name="user_id"
                    defaultValue={interviewerRel?.user_id ?? ""}
                    required
                    className={inputCls}
                  >
                    <option value="" disabled>
                      Choose a family member…
                    </option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name}
                        {m.email ? ` (${m.email})` : ""}
                        {m.hasVoice ? " · 🎙" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col text-sm">
                  <span className="text-ink/60">They call {st.name}</span>
                  <input
                    name="address_term"
                    required
                    placeholder="Dad, Grandma, Uncle Joe"
                    defaultValue={interviewerRel?.address_term ?? ""}
                    className={inputCls}
                  />
                </label>
                <label className="flex flex-col text-sm">
                  <span className="text-ink/60">Relationship</span>
                  <select name="kind" defaultValue={interviewerRel?.kind ?? "other"} className={inputCls}>
                    {KINDS.map((k) => (
                      <option key={k} value={k}>
                        {KIND_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col text-sm">
                  <span className="text-ink/60">They are {st.name}&apos;s…</span>
                  <input
                    name="asker_relation"
                    placeholder="son, niece"
                    defaultValue={interviewerRel?.asker_relation ?? ""}
                    className={inputCls}
                  />
                </label>
                <SaveButton />
              </form>

              {/* The interviewer lends their cloned voice (managed in Settings). */}
              <div className="mt-4 border-t pt-3 text-sm">
                {!interviewer ? (
                  <p className="text-ink/60">
                    Pick who interviews {st.name}. They&apos;ll hear the questions in that
                    person&apos;s cloned voice.
                  </p>
                ) : interviewer.hasVoice ? (
                  <p className="text-ink/70">
                    🎙 {st.name} will hear questions in{" "}
                    <span className="font-medium">{interviewer.name}</span>&apos;s voice.
                  </p>
                ) : (
                  <p className="text-amber-800">
                    {interviewer.name} hasn&apos;t recorded a voice yet — they can add it in{" "}
                    <Link href="/settings" className="font-semibold underline">
                      Settings → My voice
                    </Link>
                    . Until then, {st.name} sees the question as text.
                  </p>
                )}
              </div>
            </>
          ) : (
            <ViewerNote />
          )}
        </ConfigBox>

        {/* Phone ------------------------------------------------------------ */}
        <ConfigBox label="Phone" value={st.phone?.trim() ? st.phone : "Not set"} sub="Where the story texts go">
          {canManage ? (
            <form action={setStorytellerPhone} className="space-y-3">
              <input type="hidden" name="storyteller_id" value={st.id} />
              <div className="flex items-end gap-2">
                <label className="flex flex-col text-sm">
                  <span className="text-ink/60">Phone</span>
                  <input
                    type="tel"
                    name="phone"
                    defaultValue={st.phone ?? ""}
                    placeholder="+1 602 555 4471"
                    className={inputCls}
                  />
                </label>
                <SaveButton />
              </div>
              {/* A2P 10DLC consent (TODO 4.3). Required to save a number; the
                  wording is mirrored on the public /sms opt-in page. */}
              <label className="flex max-w-prose items-start gap-2 text-xs leading-relaxed text-ink/60">
                <input
                  type="checkbox"
                  name="consent"
                  defaultChecked={!!st.phone?.trim()}
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <span>
                  I confirm {st.name} has agreed to receive recurring automated
                  reminder text messages from My Family Porch about recording
                  their life stories. Message frequency varies (typically a few
                  per week or fewer). Message and data rates may apply. Reply
                  STOP to cancel, HELP for help. See our{" "}
                  <a href="/sms" target="_blank" className="underline">
                    SMS terms
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" target="_blank" className="underline">
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>
            </form>
          ) : (
            <ViewerNote />
          )}
        </ConfigBox>

        {/* Recording link --------------------------------------------------- */}
        <ConfigBox
          label="Recording link"
          value={linkCount > 0 ? `${linkCount} active link${linkCount === 1 ? "" : "s"}` : "None yet"}
          sub="The magic link the storyteller opens"
        >
          <div className="text-sm">
            <p className="text-ink/60">
              {linkCount > 0
                ? `${linkCount} active link${linkCount === 1 ? "" : "s"}` +
                  (lastUsed
                    ? ` · last opened ${new Date(lastUsed).toLocaleDateString()}`
                    : " · not opened yet")
                : "No recording link yet"}
            </p>

            {canManage && (
              <div className="mt-3 flex flex-wrap gap-2">
                {st.phone?.trim() && (
                  <form action={sendNudge}>
                    <input type="hidden" name="storyteller_id" value={st.id} />
                    <button type="submit" className="btn-ghost">
                      Send a nudge
                    </button>
                  </form>
                )}
                <form action={createRecordingLink}>
                  <input type="hidden" name="storyteller_id" value={st.id} />
                  <button type="submit" className="btn-primary">
                    {linkCount > 0 ? "New link" : "Create recording link"}
                  </button>
                </form>
                {linkCount > 0 && (
                  <form action={revokeRecordingLinks}>
                    <input type="hidden" name="storyteller_id" value={st.id} />
                    <button type="submit" className="btn-ghost text-red-600">
                      Revoke links
                    </button>
                  </form>
                )}
              </div>
            )}

            {linkUrl && (
              <div className="mt-3 rounded-xl border border-line bg-surface2 p-3">
                <p className="text-ink/60">Recording link for {st.name}:</p>
                <code className="mt-1 block break-all text-ink">{linkUrl}</code>
              </div>
            )}
            {linkCount > 0 && !linkUrl && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
                {canManage
                  ? `This link predates shareable URLs. Tap “New link” to get a copyable URL for ${st.name}.`
                  : `An admin can create a shareable link for ${st.name}.`}
              </div>
            )}
          </div>
        </ConfigBox>

        {/* Schedule --------------------------------------------------------- */}
        <ConfigBox
          label="Schedule"
          value={schedule ? (schedule.paused ? "Paused" : daysSummary(schedule.days)) : "Not scheduled yet"}
          sub={schedule && !schedule.paused ? `${prettyTime(schedule.sendTimeLocal)} · ${tzLabel(schedule.timezone)}` : "When we reach out"}
        >
          {schedule ? (
            <ScheduleEditor st={schedule} canManage={canManage} />
          ) : (
            <ViewerNote />
          )}
        </ConfigBox>

        {/* Topics ----------------------------------------------------------- */}
        <ConfigBox
          label="Topics"
          value={
            topics
              ? `${topics.topics.filter((t) => t.preference).length} steered · ${topics.topics.length} categories`
              : "—"
          }
          sub="Focus, ease off, or avoid"
        >
          {topics ? (
            <>
              {/* Drill from category coverage into the full question library. */}
              <div className="mb-4 border-b border-line pb-3">
                <Link
                  href={`/storytellers/${st.id}/questions`}
                  className="text-sm font-semibold text-brand hover:underline"
                >
                  Show all questions →
                </Link>
              </div>
              <TopicsEditor st={topics} canManage={canManage} />
            </>
          ) : (
            <ViewerNote />
          )}
        </ConfigBox>

        {/* Download everything (7.6) — every member can export their own
            content; ownership is never gated. */}
        <ConfigBox
          label="Download everything"
          value={
            exportJob?.status === "ready" &&
            !(exportJob.expiresAt && new Date(exportJob.expiresAt).getTime() < Date.now())
              ? "Ready"
              : exportJob?.status === "queued" || exportJob?.status === "preparing"
                ? "Preparing…"
                : "Your data"
          }
          sub="Audio, transcripts & book"
        >
          <ExportPanel storytellerId={st.id} job={exportJob} />
        </ConfigBox>

        {/* Remove ----------------------------------------------------------- */}
        {canManage && (
          <details className="rounded-xl border border-red-200 bg-red-50/40 px-4 py-3.5">
            <summary className="cursor-pointer text-sm font-semibold text-red-600">Remove {st.name}</summary>
            <form action={deleteStoryteller} className="mt-3">
              <input type="hidden" name="id" value={st.id} />
              <p className="text-sm text-ink/60">
                This deletes {st.name} and all of their stories, recordings, and schedule. This
                can&apos;t be undone.
              </p>
              <button type="submit" className="btn-danger mt-3">
                Remove storyteller
              </button>
            </form>
          </details>
        )}
      </section>

      {/* This storyteller's answers. Read-only here — review/edit/in-book live
          on /stories (one source of truth). */}
      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{st.name}&apos;s stories</h2>
          <div className="flex items-center gap-3">
            {/* Translate the whole archive into the other language (extends 7.4,
                both directions). Only offered when something still needs it. */}
            {canManage && stories.some(needsTranslation) && (
              <form action={translateAllStories}>
                <input type="hidden" name="storyteller_id" value={st.id} />
                <button type="submit" className="btn-ghost text-sm">
                  Translate to {st.language === "es" ? "English" : "Spanish"}
                </button>
              </form>
            )}
            <Link href="/stories" className="text-sm font-semibold text-brand hover:underline">
              Manage in Stories →
            </Link>
          </div>
        </div>
        <div className="mt-3 space-y-3">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
          {stories.length === 0 && (
            <p className="rounded-lg border px-3 py-4 text-sm text-ink/50">
              No stories yet — they&apos;ll appear here once {st.name} starts recording.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

// One expandable setup box: summary shows label + current value; the body holds
// the inline editor (children).
function ConfigBox({
  label,
  value,
  sub,
  children,
}: {
  label: string;
  value: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="card px-4 py-3.5">
      <summary className="flex cursor-pointer items-center justify-between gap-4">
        <span>
          <span className="text-sm font-semibold">{label}</span>
          {sub && <span className="block text-xs text-ink/50">{sub}</span>}
        </span>
        <span className="text-sm font-medium text-ink/70">{value}</span>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

function ViewerNote() {
  return <p className="text-sm text-ink/50">Only owners and admins can change this.</p>;
}

function SaveButton() {
  return (
    <button type="submit" className="btn-ink">
      Save
    </button>
  );
}

function Banner({ tone, children }: { tone: "green" | "amber" | "red"; children: React.ReactNode }) {
  const cls =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-red-200 bg-red-50 text-red-700";
  return <p className={`mt-4 rounded-xl border p-3 text-sm font-medium ${cls}`}>{children}</p>;
}

// Inline schedule editor (admins) / read-only summary (viewers). Mirrors the
// old /schedule block; saveSchedule + askNow redirect back to this hub.
function ScheduleEditor({ st, canManage }: { st: StorytellerSchedule; canManage: boolean }) {
  const dayset = new Set(st.days);

  if (!canManage) {
    return (
      <dl className="space-y-2 text-sm">
        <ScheduleRow label="Days">{daysSummary(st.days)}</ScheduleRow>
        <ScheduleRow label="Time">{prettyTime(st.sendTimeLocal)}</ScheduleRow>
        <ScheduleRow label="Timezone">{tzLabel(st.timezone)}</ScheduleRow>
        <ScheduleRow label="Questions per session">{st.questionsPer === 1 ? "1" : "1–2"}</ScheduleRow>
        <ScheduleRow label="Quiet hours">
          {st.quietAfter ? `After ${prettyTime(st.quietAfter)}` : "Not set"}
        </ScheduleRow>
        {st.paused && <ScheduleRow label="Status">Paused</ScheduleRow>}
        <ScheduleRow label="“Recording less” alert">
          {st.engagementEnabled ? `On · ${SENSITIVITY_LABEL[st.engagementSensitivity]}` : "Off"}
        </ScheduleRow>
        <ScheduleRow label="Better-time suggestion">
          {st.scheduleSuggestionEnabled ? "On" : "Off"}
        </ScheduleRow>
      </dl>
    );
  }

  return (
    <>
      <form action={saveSchedule} className="space-y-5">
        <input type="hidden" name="storyteller_id" value={st.id} />

        <div>
          <div className="font-medium text-sm">Days</div>
          <p className="text-xs text-ink/50">The text arrives these mornings.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DAY_CODES.map((d) => {
              const on = dayset.has(d);
              return (
                <label
                  key={d}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
                    on ? "border-ink bg-ink text-white" : "text-ink/60 hover:bg-ink/5"
                  }`}
                >
                  <input type="checkbox" name="days" value={d} defaultChecked={on} className="sr-only" />
                  {DAY_LABEL[d]}
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex flex-col text-sm">
            <span className="font-medium">Time</span>
            <span className="text-xs text-ink/50">In their local time.</span>
            <input
              type="time"
              name="send_time_local"
              defaultValue={st.sendTimeLocal}
              className="mt-1 input"
            />
          </label>

          <label className="flex flex-col text-sm">
            <span className="font-medium">Timezone</span>
            <span className="text-xs text-ink/50">Where they are.</span>
            <select
              name="timezone"
              defaultValue={st.timezone}
              className="mt-1 input"
            >
              {!TIMEZONES.some((z) => z.value === st.timezone) && (
                <option value={st.timezone}>{st.timezone}</option>
              )}
              {TIMEZONES.map((z) => (
                <option key={z.value} value={z.value}>
                  {z.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col text-sm">
            <span className="font-medium">Questions per session</span>
            <span className="text-xs text-ink/50">Kept short on purpose.</span>
            <select
              name="questions_per"
              defaultValue={String(st.questionsPer)}
              className="mt-1 input"
            >
              <option value="1">1</option>
              <option value="2">1–2</option>
            </select>
          </label>

          <label className="flex flex-col text-sm">
            <span className="font-medium">Quiet hours</span>
            <span className="text-xs text-ink/50">Never ring after this.</span>
            <input
              type="time"
              name="quiet_after"
              defaultValue={st.quietAfter ?? ""}
              className="mt-1 input"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="paused" defaultChecked={st.paused} className="h-4 w-4 rounded border" />
          <span>
            <span className="font-medium">Pause everything</span>
            <span className="text-ink/50"> — if they&apos;re traveling or unwell.</span>
          </span>
        </label>

        {/* Check-in alerts (TODO 6.5) — the adaptive signals are opt-out/tunable;
            mic-failed always surfaces (it's an acute technical fault). */}
        <div className="border-t border-line pt-4">
          <div className="text-sm font-medium">Check-in alerts</div>
          <p className="text-xs text-ink/50">
            Quiet, optional heads-ups about how {st.name} is doing. Paused storytellers are
            never flagged.
          </p>

          <div className="mt-3 space-y-3">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="signal_engagement_enabled"
                defaultChecked={st.engagementEnabled}
                className="mt-0.5 h-4 w-4 rounded border"
              />
              <span>
                <span className="font-medium">Tell me if they&apos;re recording less than usual</span>
                <span className="block text-ink/50">
                  A gentle nudge to reach out — compared only to their own pace, never a diagnosis.
                </span>
              </span>
            </label>

            <label className="ml-6 flex flex-col text-sm">
              <span className="font-medium">How sensitive</span>
              <span className="text-xs text-ink/50">
                Gentle flags only a big drop; sensitive flags a smaller one.
              </span>
              <select
                name="signal_engagement_sensitivity"
                defaultValue={st.engagementSensitivity}
                className="mt-1 input w-44"
              >
                <option value="gentle">Gentle</option>
                <option value="standard">Standard</option>
                <option value="sensitive">Sensitive</option>
              </select>
            </label>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="signal_schedule_suggestion_enabled"
                defaultChecked={st.scheduleSuggestionEnabled}
                className="mt-0.5 h-4 w-4 rounded border"
              />
              <span>
                <span className="font-medium">Suggest a better time</span>
                <span className="block text-ink/50">
                  If {st.name} tends to record at a different hour than we reach out.
                </span>
              </span>
            </label>
          </div>
        </div>

        <SaveButton />
      </form>

      {/* "Ask now" posts on its own, outside the Save form. */}
      <form action={askNow} className="mt-4 border-t border-line pt-4">
        <input type="hidden" name="storyteller_id" value={st.id} />
        <button
          type="submit"
          className="rounded-full border border-ink px-4 py-1.5 text-sm font-semibold hover:bg-ink/5"
        >
          Ask now
        </button>
        <span className="ml-3 text-xs text-ink/50">
          Send a question right away, outside the schedule.
        </span>
      </form>
    </>
  );
}

function ScheduleRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink/50">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

// Inline topics steering (admins) / read-only coverage (viewers). setTopicPreference
// revalidates this hub.
function TopicsEditor({ st, canManage }: { st: StorytellerTopics; canManage: boolean }) {
  return (
    <ul className="space-y-2">
      {st.topics.map((t) => (
        <TopicRowItem key={t.category} storytellerId={st.id} topic={t} canManage={canManage} />
      ))}
      {st.topics.length === 0 && (
        <li className="text-sm text-ink/50">No topic library for this language yet.</li>
      )}
    </ul>
  );
}

function coverageLabel(t: TopicRow): string {
  if (t.explored === 0) return "untouched";
  return `${t.explored} of ${t.available} explored`;
}

function segClass(pref: TopicPreference, selected: boolean): string {
  const base = "rounded-full border px-3 py-1 text-xs whitespace-nowrap";
  if (!selected) return `${base} text-ink/60 hover:bg-ink/5`;
  if (pref === "avoid") return `${base} border-red-700 bg-red-700 text-white`;
  return `${base} border-ink bg-ink text-white`;
}

function TopicRowItem({
  storytellerId,
  topic,
  canManage,
}: {
  storytellerId: string;
  topic: TopicRow;
  canManage: boolean;
}) {
  const pct =
    topic.available > 0 ? Math.min(100, Math.round((topic.explored / topic.available) * 100)) : 0;

  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[12rem] flex-1">
          <div className="text-sm font-semibold">{topic.category}</div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 text-xs text-ink/50">{coverageLabel(topic)}</div>
        </div>

        {canManage ? (
          <div className="flex gap-1">
            {(["ease_off", "focus", "avoid"] as TopicPreference[]).map((pref) => {
              const selected = topic.preference === pref;
              return (
                <form key={pref} action={setTopicPreference}>
                  <input type="hidden" name="storyteller_id" value={storytellerId} />
                  <input type="hidden" name="category" value={topic.category} />
                  {/* Re-tapping the active choice clears it back to neutral. */}
                  <input type="hidden" name="preference" value={selected ? "" : pref} />
                  <button type="submit" className={segClass(pref, selected)} aria-pressed={selected}>
                    {PREF_LABEL[pref]}
                  </button>
                </form>
              );
            })}
          </div>
        ) : (
          topic.preference && (
            <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs text-ink/60">
              {PREF_LABEL[topic.preference]}
            </span>
          )
        )}
      </div>
    </li>
  );
}

// The cached translation in the OTHER language, behind a toggle so the elder's
// own words stay primary: a Spanish story shows its English reading, an English
// story its Spanish. Nothing until an admin has generated it.
function Translation({
  lang,
  transcriptEn,
  transcriptEs,
}: {
  lang: string;
  transcriptEn: string | null;
  transcriptEs: string | null;
}) {
  const translated = lang === "es" ? transcriptEn : lang === "en" ? transcriptEs : null;
  if (!translated) return null;
  const label = lang === "es" ? "English translation" : "Spanish translation";
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs font-semibold text-accent hover:underline">
        {label}
      </summary>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink/55">{translated}</p>
    </details>
  );
}

// True when any part of the story (opening answer or a follow-up) still lacks its
// other-language translation — drives whether the "Translate" button is offered.
function needsTranslation(story: Story): boolean {
  const missing = (lang: string, t: string | null, en: string | null, es: string | null) =>
    !!(t ?? "").trim() &&
    ((lang === "es" && !(en ?? "").trim()) || (lang === "en" && !(es ?? "").trim()));
  return (
    missing(story.lang, story.transcript, story.transcriptEn, story.transcriptEs) ||
    story.followUps.some((f) => missing(f.lang, f.transcript, f.transcriptEn, f.transcriptEs))
  );
}

// One story, read-only: question, meta, transcript, audio, follow-up thread.
function StoryCard({ story }: { story: Story }) {
  const duration = formatDuration(story.durationSec);
  const meta = [relDay(story.createdAt), duration].filter(Boolean).join(" · ");
  return (
    <article id={`story-${story.id}`} className="card scroll-mt-24 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <PlayAudioButton answerId={story.id} hasAudio={story.hasAudio} className="-ml-1 shrink-0" />
          <h3 className="text-base font-semibold">{story.question ?? "Untitled story"}</h3>
        </div>
        {story.inBook && (
          <span className="chip shrink-0 bg-emerald-100 text-emerald-700">In the book</span>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink/50">
        {story.category && <span className="chip bg-accent/10 text-accent">{story.category}</span>}
        {meta && <span>{meta}</span>}
      </div>
      {story.transcript && (
        <>
          <p className="mt-3 border-ink/10 border-l-2 pl-3 text-sm text-ink/70">{story.transcript}</p>
          <Translation lang={story.lang} transcriptEn={story.transcriptEn} transcriptEs={story.transcriptEs} />
        </>
      )}
      {story.followUps.length > 0 && (
        <div className="mt-3 space-y-3 border-ink/10 border-t pt-3">
          {story.followUps.map((f) => (
            <FollowUpRow key={f.id} followUp={f} />
          ))}
        </div>
      )}
    </article>
  );
}

function FollowUpRow({ followUp }: { followUp: StoryFollowUp }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <PlayAudioButton answerId={followUp.id} hasAudio={followUp.hasAudio} className="-ml-1 shrink-0" />
        {followUp.question && <div className="text-sm text-ink/60">↳ {followUp.question}</div>}
      </div>
      {followUp.transcript && (
        <>
          <p className="mt-1 text-sm text-ink/70">{followUp.transcript}</p>
          <Translation
            lang={followUp.lang}
            transcriptEn={followUp.transcriptEn}
            transcriptEs={followUp.transcriptEs}
          />
        </>
      )}
    </div>
  );
}
