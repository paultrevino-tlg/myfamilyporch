import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveMembership, getFamilies, roleAtLeast } from "@/lib/auth";
import { loadOverview, type RecentStory } from "@/lib/overview";
import { createInvitation, switchFamily } from "../actions";

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
  const canManage = roleAtLeast(active.role, "admin");
  const sb = await supabaseServer();
  const overview = await loadOverview(active.family_id);

  const { data: storytellers } = await sb
    .from("storytellers")
    .select("id,name,language")
    .eq("family_id", active.family_id);

  const { data: invitations } = await sb
    .from("invitations")
    .select("email,role,accepted_at,expires_at")
    .eq("family_id", active.family_id)
    .order("created_at", { ascending: false });

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

      {/* Overview: status cards + recent stories (TODO 5.1). The 3 signal
          alerts land in Phase 6; audio playback on Lately is 5.2. */}
      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card
          label="Last session"
          good={overview.lastSessionFresh}
          value={overview.lastSessionAt ? relDay(overview.lastSessionAt) : "—"}
          sub={overview.lastSessionFresh ? "✓" : overview.lastSessionAt ? "" : "none yet"}
        />
        <Card
          label="This week"
          value={String(overview.thisWeekCount)}
          sub={overview.weeklyTarget != null ? `of ${overview.weeklyTarget}` : ""}
        />
        <Card label="Stories saved" value={String(overview.storiesSaved)} />
        <Card
          label="Topics touched"
          value={String(overview.topicsTouched)}
          sub={overview.topicsTotal ? `/ ${overview.topicsTotal}` : ""}
        />
      </section>

      <section className="mt-8">
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

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-lg">Storytellers</h2>
          <div className="flex gap-4">
            <Link href="/topics" className="text-sm text-ink/60 underline">
              Topics
            </Link>
            <Link href="/storytellers" className="text-sm text-ink/60 underline">
              Manage storytellers
            </Link>
          </div>
        </div>
        <ul className="mt-3 space-y-2">
          {(storytellers ?? []).map((s) => (
            <li key={s.id} className="rounded-lg border px-3 py-2 text-sm">
              {s.name}
              <span className="text-ink/50">
                {" · "}
                {s.language === "es" ? "Español" : "English"}
              </span>
            </li>
          ))}
          {(storytellers ?? []).length === 0 && (
            <li className="text-sm text-ink/50">
              No storytellers yet.{" "}
              <Link href="/storytellers" className="underline">
                Add one
              </Link>
              .
            </li>
          )}
        </ul>
      </section>

      {/* Family access (TODO 1.3). Full Settings surface lands in Phase 5.5. */}
      <section className="mt-10 border-t pt-6">
        <h2 className="font-medium text-lg">Family access</h2>
        <p className="text-sm text-ink/60">Who can see {active.name}&apos;s stories.</p>

        {canManage && (
          <form action={createInvitation} className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col text-sm">
              <span className="text-ink/60">Email</span>
              <input
                type="email"
                name="email"
                required
                placeholder="relative@example.com"
                className="mt-1 rounded-lg border px-3 py-2 text-base"
              />
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-ink/60">Role</span>
              <select name="role" defaultValue="viewer" className="mt-1 rounded-lg border px-3 py-2 text-base">
                <option value="viewer">Viewer — can listen &amp; read</option>
                <option value="admin">Admin — can steer &amp; invite</option>
              </select>
            </label>
            <button type="submit" className="rounded-lg bg-ink px-4 py-2 font-medium text-white">
              Send invite
            </button>
          </form>
        )}

        <ul className="mt-4 space-y-2">
          {(invitations ?? []).map((inv, i) => {
            const status = inv.accepted_at
              ? "Accepted"
              : new Date(inv.expires_at) < new Date()
                ? "Expired"
                : "Pending";
            return (
              <li key={i} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <span>
                  {inv.email} <span className="text-ink/50">· {inv.role}</span>
                </span>
                <span className="text-ink/60">{status}</span>
              </li>
            );
          })}
          {(invitations ?? []).length === 0 && (
            <li className="text-sm text-ink/50">No invitations yet.</li>
          )}
        </ul>
      </section>
    </main>
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
