import { redirect } from "next/navigation";
import Link from "next/link";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";
import {
  loadOverview,
  loadSignals,
  loadStorytellerStats,
  type RecentStory,
  type Signal,
} from "@/lib/overview";
import { dismissInsight, applyScheduleSuggestion } from "./actions";
import PlayAudioButton from "../PlayAudioButton";
import StorytellerGrid from "../StorytellerGrid";
import VerifyPhoneBanner from "../VerifyPhoneBanner";

// A calm relative day for the status cards / Lately list ("Today", "Fri",
// "12 days ago") — never a raw timestamp on the elder-adjacent surface.
function relDay(iso: string): string {
  const then = new Date(iso);
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return then.toLocaleDateString("en-US", { weekday: "short" });
  return `${days} days ago`;
}

// Time-of-day for a signal's sub line ("9:42 AM") — pairs with relDay above.
function timeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

// "14:30" → "2:30 PM" for the suggestion button/copy (the signal's payload
// stores the suggested send time as "HH:MM").
function hhmmLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(h)) return hhmm;
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m || 0).padStart(2, "0")} ${period}`;
}

// "2 min 14 sec" — matches the prototype's spoken-length phrasing.
function formatDuration(sec: number | null): string | null {
  if (!sec || sec < 1) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m} min ${s} sec` : `${s} sec`;
}

// Overview. RLS scopes everything to the member's families automatically;
// the active-family cookie just picks which one this page focuses on.
export default async function Dashboard() {
  const active = await getActiveMembership();
  // No family yet → send the member through onboarding (TODO 1.2).
  if (!active) redirect("/onboarding");

  const overview = await loadOverview(active.family_id);
  const storytellerStats = await loadStorytellerStats(active.family_id);
  const signals = await loadSignals(active.family_id);
  const canDismiss = roleAtLeast(active.role, "admin");

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">
            How&apos;s everyone doing?
          </h1>
          <p className="mt-2 text-sm text-ink/55">
            {active.name} · you&apos;re {active.role === "owner" ? "the owner" : `an ${active.role}`}
          </p>
        </div>
        <Link href="/storytellers/new" className="btn-primary">
          <span aria-hidden>＋</span> Add storyteller
        </Link>
      </div>

      {/* Member SMS opt-in nudge (consent-flow.md): renders only until the
          signed-in member has verified their number for this family. */}
      <VerifyPhoneBanner familyId={active.family_id} />

      {/* Signals at the top of Overview (TODO 6.2/6.3/6.4): mic-failed is acute
          (rose), schedule-suggestion is a positive recommendation (blue),
          engaging-less is a quiet nudge to reach out (slate). Any member sees
          them; only admins get the action controls. */}
      {signals.length > 0 && (
        <section className="mt-7 space-y-3">
          {signals.map((s) =>
            s.type === "mic_failed" ? (
              <SignalAlert key={s.id} signal={s} canDismiss={canDismiss} />
            ) : s.type === "schedule_suggestion" ? (
              <ScheduleSuggestionCard key={s.id} signal={s} canAct={canDismiss} />
            ) : s.type === "engagement_drop" ? (
              <EngagementDropCard key={s.id} signal={s} canAct={canDismiss} />
            ) : null,
          )}
        </section>
      )}

      {/* Storytellers first: one card per elder with their own metrics, the
          whole thing a link into their config + answers hub. */}
      <SectionHead title="Storytellers" href="/storytellers/new" cta="Add storyteller" />
      <StorytellerGrid stats={storytellerStats} />

      <SectionHead title="Lately" href="/stories" cta="Review stories" />
      <ul className="space-y-2.5">
        {overview.recent.map((story) => (
          <RecentRow key={story.id} story={story} />
        ))}
        {overview.recent.length === 0 && (
          <li className="card px-4 py-8 text-center text-sm text-ink/50">
            No stories yet — they&apos;ll appear here once {active.name} starts recording.
          </li>
        )}
      </ul>

    </main>
  );
}

function SectionHead({ title, href, cta }: { title: string; href: string; cta: string }) {
  return (
    <div className="mb-3.5 mt-9 flex items-center justify-between px-1">
      <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-ink/45">{title}</h2>
      <Link href={href} className="text-sm font-semibold text-brand hover:underline">
        {cta} →
      </Link>
    </div>
  );
}

// One "Lately" row. Audio plays via a short-lived signed URL minted by
// /api/stories/audio after a membership check (TODO 5.2).
function RecentRow({ story }: { story: RecentStory }) {
  const duration = formatDuration(story.durationSec);
  const meta = [relDay(story.createdAt), duration, story.followUps > 0 && `${story.followUps} follow-up${story.followUps > 1 ? "s" : ""}`]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="card px-4 py-3.5">
      <div className="flex items-center gap-2">
        <PlayAudioButton answerId={story.id} hasAudio={story.hasAudio} className="-ml-1 shrink-0" />
        <Link
          href={`/storytellers/${story.storytellerId}#story-${story.id}`}
          className="font-semibold leading-snug hover:underline"
        >
          {story.question ?? "Untitled story"}
        </Link>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink/50">
        {story.category && <span className="chip bg-accent/10 text-accent">{story.category}</span>}
        <span className="font-medium text-ink/60">{story.storyteller}</span>
        {meta && <span>· {meta}</span>}
      </div>
    </li>
  );
}

// The mic-failed signal (TODO 6.2) — acute tone per the prototype's `.alert`.
// Surfaced to every member; only admins get the Dismiss control (RLS ins_write
// is the real guard). The matching admin SMS already fired when the signal was
// recorded (TODO 2.4/5.5), so this banner just makes it visible and clearable.
function SignalAlert({ signal, canDismiss }: { signal: Signal; canDismiss: boolean }) {
  return (
    <div className="flex items-start gap-3.5 rounded-2xl border border-rose-200 border-l-4 border-l-rose-500 bg-gradient-to-b from-rose-50 to-surface px-4 py-3.5 shadow-sm">
      <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-surface text-lg shadow-sm" aria-hidden>
        🎙️
      </span>
      <div className="flex-1">
        <div className="text-sm font-semibold text-rose-900">
          {signal.storytellerName}&apos;s microphone didn&apos;t go through.
        </div>
        <div className="mt-0.5 text-xs text-rose-800/75">
          {relDay(signal.createdAt)} at {timeOfDay(signal.createdAt)} · they may need to allow the
          microphone on their device. We also texted the family.
        </div>
      </div>
      {canDismiss && (
        <form action={dismissInsight}>
          <input type="hidden" name="insight_id" value={signal.id} />
          <button
            type="submit"
            className="self-center rounded-lg border border-rose-200 bg-surface px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-50"
          >
            Dismiss
          </button>
        </form>
      )}
    </div>
  );
}

// The schedule-suggestion signal (TODO 6.3) — a positive recommendation in the
// brand blue, distinct from the rose mic-failed alert (prototype `#ins-well`).
// "Recommend, never auto-change": admins get an explicit "Switch to {time}" (the
// only thing that shifts the nudge) and a "Keep current time" that just dismisses.
function ScheduleSuggestionCard({ signal, canAct }: { signal: Signal; canAct: boolean }) {
  const p = signal.payload;
  const bestLabel = typeof p.best_time_label === "string" ? p.best_time_label : null;
  const suggested = typeof p.suggested_send_time === "string" ? p.suggested_send_time : null;
  const current = typeof p.current_send_time === "string" ? p.current_send_time : null;
  const sample = typeof p.sample_size === "number" ? p.sample_size : null;

  return (
    <div className="flex items-start gap-3.5 rounded-2xl border border-brand/25 border-l-4 border-l-brand bg-gradient-to-b from-brand/5 to-surface px-4 py-3.5 shadow-sm">
      <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-surface text-lg shadow-sm" aria-hidden>
        💡
      </span>
      <div className="flex-1">
        <div className="text-sm font-semibold text-ink">
          {signal.storytellerName} records best around {bestLabel ?? "a different time"}.
        </div>
        <div className="mt-0.5 text-xs text-ink/65">
          {sample ? `Across ${sample} recent sessions, ` : ""}
          {current ? `their reminder goes out at ${hhmmLabel(current)}. ` : ""}
          Shifting it closer to when they actually record could make it even
          easier. We also texted the family.
        </div>
        {canAct && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {suggested && (
              <form action={applyScheduleSuggestion}>
                <input type="hidden" name="insight_id" value={signal.id} />
                <button type="submit" className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand/90">
                  Switch to {hhmmLabel(suggested)}
                </button>
              </form>
            )}
            <form action={dismissInsight}>
              <input type="hidden" name="insight_id" value={signal.id} />
              <button
                type="submit"
                className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-surface2"
              >
                Keep current time
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// The engaging-less signal (TODO 6.4) — a quiet, non-clinical nudge to reach out
// (prototype `#ins-quiet`, slate tone, distinct from the rose mic alert and the
// blue schedule suggestion). Never diagnoses; the point is to prompt a human
// call. Admins can step over to the schedule (to ease off / pause) or dismiss;
// viewers read-only. The gentle family SMS already fired when recorded.
function EngagementDropCard({ signal, canAct }: { signal: Signal; canAct: boolean }) {
  const p = signal.payload;
  const recent = typeof p.recent_label === "string" ? p.recent_label : null;
  const baseline = typeof p.baseline_label === "string" ? p.baseline_label : null;

  return (
    <div className="flex items-start gap-3.5 rounded-2xl border border-slate-200 border-l-4 border-l-slate-400 bg-gradient-to-b from-slate-50 to-surface px-4 py-3.5 shadow-sm">
      <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-surface text-lg shadow-sm" aria-hidden>
        💬
      </span>
      <div className="flex-1">
        <div className="text-sm font-semibold text-ink">
          {signal.storytellerName} has been recording a little less than usual lately.
        </div>
        <div className="mt-0.5 text-xs text-ink/65">
          {recent && baseline ? `About ${recent} this month, down from ${baseline}. ` : ""}
          Could well be nothing — might be a nice moment to give them a call. We sent
          you a quiet text too.
        </div>
        {canAct && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Link
              href="/schedule"
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-surface2"
            >
              Adjust schedule
            </Link>
            <form action={dismissInsight}>
              <input type="hidden" name="insight_id" value={signal.id} />
              <button
                type="submit"
                className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-surface2"
              >
                Dismiss
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
