import { redirect } from "next/navigation";
import Link from "next/link";
import { getActiveMembership, getFamilies } from "@/lib/auth";
import {
  loadOverview,
  loadSignals,
  loadStorytellerStats,
  type RecentStory,
  type Signal,
  type StorytellerStat,
} from "@/lib/overview";
import { switchFamily } from "../actions";
import { dismissInsight } from "./actions";
import { roleAtLeast } from "@/lib/auth";

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

  const families = await getFamilies();
  const overview = await loadOverview(active.family_id);
  const storytellerStats = await loadStorytellerStats(active.family_id);
  const signals = await loadSignals(active.family_id);
  const canDismiss = roleAtLeast(active.role, "admin");

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl">How&apos;s everyone doing?</h1>
          <p className="mt-1 text-sm text-ink/60">
            {active.name} · you&apos;re {active.role === "owner" ? "the owner" : `an ${active.role}`}
          </p>
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" className="text-sm text-ink/60 underline">
            Sign out
          </button>
        </form>
      </div>

      {/* Family switcher — only when the member belongs to more than one. */}
      {families.length > 1 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink/60">Family:</span>
          {families.map((f) => (
            <form key={f.family_id} action={switchFamily}>
              <input type="hidden" name="family_id" value={f.family_id} />
              <button
                type="submit"
                disabled={f.family_id === active.family_id}
                className={`rounded-full border px-3 py-1 text-sm ${
                  f.family_id === active.family_id
                    ? "border-ink bg-ink text-white"
                    : "text-ink/70 hover:bg-ink/5"
                }`}
              >
                {f.name}
              </button>
            </form>
          ))}
        </div>
      )}

      {/* Signals at the top of Overview (TODO 6.2): the mic-failed alert is
          acute/red-tone. Any member sees it; only admins can dismiss it. */}
      {signals.length > 0 && (
        <section className="mt-8 space-y-3">
          {signals
            .filter((s) => s.type === "mic_failed")
            .map((s) => (
              <SignalAlert key={s.id} signal={s} canDismiss={canDismiss} />
            ))}
        </section>
      )}

      {/* Storytellers first: one block per elder with their own metrics, the
          whole thing a link into their config + answers hub. */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-lg">Storytellers</h2>
          <Link href="/storytellers/new" className="text-sm text-ink/60 underline">
            Add storyteller
          </Link>
        </div>
        <div className="mt-3 space-y-3">
          {storytellerStats.map((s) => (
            <StorytellerBlock key={s.id} stat={s} />
          ))}
          {storytellerStats.length === 0 && (
            <p className="text-sm text-ink/50">
              No storytellers yet.{" "}
              <Link href="/storytellers/new" className="underline">
                Add one
              </Link>
              .
            </p>
          )}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-lg">Lately</h2>
          <Link href="/stories" className="text-sm text-ink/60 underline">
            Review stories
          </Link>
        </div>
        <ul className="mt-3 space-y-2">
          {overview.recent.map((story) => (
            <RecentRow key={story.id} story={story} />
          ))}
          {overview.recent.length === 0 && (
            <li className="rounded-lg border px-3 py-4 text-sm text-ink/50">
              No stories yet — they&apos;ll appear here once {active.name} starts
              recording.
            </li>
          )}
        </ul>
      </section>

      {/* Family access now lives on Settings (TODO 5.5) — one source of truth. */}
      <section className="mt-10 border-t pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium text-lg">Family access</h2>
            <p className="text-sm text-ink/60">Who can see {active.name}&apos;s stories.</p>
          </div>
          <Link href="/settings" className="text-sm text-ink/60 underline">
            Manage in Settings
          </Link>
        </div>
      </section>
    </main>
  );
}

// One storyteller's block on the dashboard: their name + the same four status
// cards, the whole thing a link into their detail page.
function StorytellerBlock({ stat }: { stat: StorytellerStat }) {
  return (
    <Link
      href={`/storytellers/${stat.id}`}
      className="block rounded-xl border p-4 transition hover:bg-ink/[0.03]"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-base">{stat.name}</h3>
        <span className="text-sm text-ink/50">
          {stat.language === "es" ? "Español" : "English"} ›
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card
          label="Last session"
          good={stat.lastSessionFresh}
          value={stat.lastSessionAt ? relDay(stat.lastSessionAt) : "—"}
          sub={stat.lastSessionFresh ? "✓" : stat.lastSessionAt ? "" : "none yet"}
        />
        <Card
          label="This week"
          value={String(stat.thisWeekCount)}
          sub={stat.weeklyTarget != null ? `of ${stat.weeklyTarget}` : ""}
        />
        <Card label="Stories saved" value={String(stat.storiesSaved)} />
        <Card
          label="Topics touched"
          value={String(stat.topicsTouched)}
          sub={stat.topicsTotal ? `/ ${stat.topicsTotal}` : ""}
        />
      </div>
    </Link>
  );
}

// A single status card. `good` tints the value (recent activity is reassuring).
function Card({
  label,
  value,
  sub,
  good,
}: {
  label: string;
  value: string;
  sub?: string;
  good?: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-white/40 p-4">
      <div className="font-semibold text-xs uppercase tracking-wide text-ink/50">
        {label}
      </div>
      <div className={`mt-2 font-serif text-3xl leading-none ${good ? "text-emerald-700" : "text-ink"}`}>
        {value}
        {sub && <span className="ml-1 align-baseline text-base text-ink/40">{sub}</span>}
      </div>
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
    <li className="rounded-lg border px-3 py-3">
      <div className="font-medium text-sm">
        {story.question ?? "Untitled story"}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink/50">
        {story.category && (
          <span className="rounded-full bg-ink/5 px-2 py-0.5 text-ink/60">
            {story.category}
          </span>
        )}
        <span>{story.storyteller}</span>
        {meta && <span>· {meta}</span>}
      </div>
      {story.hasAudio && (
        <audio
          controls
          preload="none"
          src={`/api/stories/audio?answer=${story.id}`}
          className="mt-2 w-full"
        />
      )}
    </li>
  );
}

// The mic-failed signal (TODO 6.2) — acute/red tone per the prototype's `.alert`.
// Surfaced to every member; only admins get the Dismiss control (RLS ins_write
// is the real guard). The matching admin SMS already fired when the signal was
// recorded (TODO 2.4/5.5), so this banner just makes it visible and clearable.
function SignalAlert({
  signal,
  canDismiss,
}: {
  signal: Signal;
  canDismiss: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
      <span className="text-xl leading-none" aria-hidden>
        ⚠️
      </span>
      <div className="flex-1">
        <div className="font-medium text-sm text-amber-900">
          {signal.storytellerName}&apos;s microphone didn&apos;t go through.
        </div>
        <div className="mt-0.5 text-xs text-amber-800/80">
          {relDay(signal.createdAt)} at {timeOfDay(signal.createdAt)} · they may
          need to allow the microphone on their device. We also texted the family.
        </div>
      </div>
      {canDismiss && (
        <form action={dismissInsight}>
          <input type="hidden" name="insight_id" value={signal.id} />
          <button
            type="submit"
            className="rounded-lg border border-amber-300 px-3 py-1 text-xs text-amber-900 hover:bg-amber-100"
          >
            Dismiss
          </button>
        </form>
      )}
    </div>
  );
}
