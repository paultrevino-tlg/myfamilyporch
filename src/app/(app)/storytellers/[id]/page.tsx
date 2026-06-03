import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/auth";
import { loadStories, type Story, type StoryFollowUp } from "@/lib/stories";

// Per-storyteller detail page. RLS scopes every read to the member's families;
// we additionally pin to the active family + this storyteller id. Read-only by
// design: a compact config summary at the top links out to the pages that own
// each setting, and this elder's answers are listed below (editing stays on
// /stories — one source of truth).

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
const DAY_LABEL: Record<string, string> = {
  SU: "Sun",
  MO: "Mon",
  TU: "Tue",
  WE: "Wed",
  TH: "Thu",
  FR: "Fri",
  SA: "Sat",
};
const DAY_ORDER = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

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

// "10:00:00" → "10:00 AM" (the storyteller's local send time).
function fmtTime(t: string | null): string | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  const am = h < 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${am ? "AM" : "PM"}`;
}

// PostgREST embeds a to-one relation as an object at runtime but the generated
// types widen it to an array — normalize either shape (same gotcha as auth.ts).
function one<T>(rel: unknown): T | null {
  if (Array.isArray(rel)) return (rel[0] as T) ?? null;
  return (rel as T) ?? null;
}

export default async function StorytellerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const active = await getActiveMembership();
  if (!active) redirect("/onboarding");

  const { id } = await params;
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  // The storyteller, with the current member's own relationship (filtered by
  // user_id so other members' edges stay out) + the linked cloned voice. The
  // nested voice_profiles embed defeats PostgREST's static type inference, so
  // we type the row explicitly below.
  const { data: stData } = await sb
    .from("storytellers")
    .select(
      "id,name,pronouns,birth_year,language,phone," +
        "storyteller_relationships(address_term,kind,asker_relation,is_interviewer,voice_profiles(label))"
    )
    .eq("family_id", active.family_id)
    .eq("id", id)
    .eq("storyteller_relationships.user_id", user.id)
    .maybeSingle();

  // Not in this family (or doesn't exist) → 404, never leak another tenant.
  if (!stData) notFound();
  const st = stData as unknown as {
    id: string;
    name: string;
    pronouns: string;
    birth_year: number | null;
    language: string;
    phone: string | null;
    storyteller_relationships: unknown;
  };

  const rel = one<{
    address_term: string | null;
    kind: string | null;
    asker_relation: string | null;
    is_interviewer: boolean | null;
    voice_profiles: unknown;
  }>(st.storyteller_relationships);
  const voice = rel ? one<{ label: string }>(rel.voice_profiles) : null;

  // Schedule + active-link count + this elder's answers, in parallel.
  const [schedRes, linkRes, stories] = await Promise.all([
    sb
      .from("schedules")
      .select("days_of_week,send_time_local,paused")
      .eq("family_id", active.family_id)
      .eq("storyteller_id", id)
      .maybeSingle(),
    sb
      .from("storyteller_tokens")
      .select("id", { count: "exact", head: true })
      .eq("family_id", active.family_id)
      .eq("storyteller_id", id)
      .is("revoked_at", null),
    loadStories(active.family_id, id),
  ]);

  const sched = schedRes.data;
  const linkCount = linkRes.count ?? 0;

  const scheduleSummary = (() => {
    if (!sched) return "Not scheduled yet";
    if (sched.paused) return "Paused";
    const days = ((sched.days_of_week as string[] | null) ?? [])
      .slice()
      .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
      .map((d) => DAY_LABEL[d] ?? d)
      .join(" & ");
    const time = fmtTime(sched.send_time_local as string | null);
    return [days || "No days set", time].filter(Boolean).join(" · ");
  })();

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl">{st.name}</h1>
          <p className="mt-1 text-sm text-ink/60">
            {PRONOUN_LABEL[st.pronouns] ?? st.pronouns}
            {st.birth_year ? ` · b. ${st.birth_year}` : ""}
            {` · ${st.language === "es" ? "Español" : "English"}`}
            {rel?.is_interviewer ? " · you interview" : ""}
          </p>
        </div>
        <Link href="/dashboard" className="text-sm text-ink/60 underline">
          ← Dashboard
        </Link>
      </div>

      {/* Configuration summary — read-only; each row links to the page that
          owns that setting. */}
      <section className="mt-8 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-lg">Setup</h2>
          <Link href="/storytellers" className="text-sm text-ink/60 underline">
            Edit details
          </Link>
        </div>

        <SummaryRow
          label="You call them"
          value={rel?.address_term ?? "—"}
          sub={
            rel?.kind
              ? `${KIND_LABEL[rel.kind] ?? rel.kind}${
                  rel.asker_relation ? ` · you're their ${rel.asker_relation}` : ""
                }`
              : undefined
          }
          href="/storytellers"
        />
        <SummaryRow
          label="Phone"
          value={st.phone?.trim() ? st.phone : "Not set"}
          sub="Where the story texts go"
          href="/settings"
        />
        <SummaryRow
          label="Your voice"
          value={voice ? `✓ Cloned${voice.label ? ` · ${voice.label}` : ""}` : "Not set up"}
          sub={`What ${st.name} hears asking the questions`}
          href="/storytellers"
          good={!!voice}
        />
        <SummaryRow
          label="Recording link"
          value={
            linkCount > 0
              ? `${linkCount} active link${linkCount === 1 ? "" : "s"}`
              : "None yet"
          }
          sub="The magic link the storyteller opens"
          href="/storytellers"
        />
        <SummaryRow
          label="Schedule"
          value={scheduleSummary}
          sub="When we reach out"
          href="/schedule"
        />
        <SummaryRow
          label="Topics"
          value="Steer what we ask about"
          sub="Focus, ease off, or avoid"
          href="/topics"
        />
      </section>

      {/* This storyteller's answers. Read-only here — review/edit/in-book live
          on /stories (one source of truth). */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-lg">{st.name}&apos;s stories</h2>
          <Link href="/stories" className="text-sm text-ink/60 underline">
            Manage in Stories
          </Link>
        </div>
        <div className="mt-3 space-y-3">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
          {stories.length === 0 && (
            <p className="rounded-lg border px-3 py-4 text-sm text-ink/50">
              No stories yet — they&apos;ll appear here once {st.name} starts
              recording.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

// One read-only setup row: label + value, optional sub, with an edit link.
function SummaryRow({
  label,
  value,
  sub,
  href,
  good,
}: {
  label: string;
  value: string;
  sub?: string;
  href: string;
  good?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3">
      <div>
        <div className="font-medium text-sm">{label}</div>
        {sub && <div className="text-xs text-ink/50">{sub}</div>}
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-sm ${good ? "text-emerald-700" : "text-ink/70"}`}>
          {value}
        </span>
        <Link href={href} className="text-xs text-ink/50 underline">
          Edit
        </Link>
      </div>
    </div>
  );
}

// One story, read-only: question, meta, transcript, audio, follow-up thread.
function StoryCard({ story }: { story: Story }) {
  const duration = formatDuration(story.durationSec);
  const meta = [relDay(story.createdAt), duration].filter(Boolean).join(" · ");
  return (
    <article className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium text-base">
          {story.question ?? "Untitled story"}
        </h3>
        {story.inBook && (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
            In the book
          </span>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink/50">
        {story.category && (
          <span className="rounded-full bg-ink/5 px-2 py-0.5 text-ink/60">
            {story.category}
          </span>
        )}
        {meta && <span>{meta}</span>}
      </div>
      {story.transcript && (
        <p className="mt-3 border-ink/10 border-l-2 pl-3 text-sm text-ink/70">
          {story.transcript}
        </p>
      )}
      {story.hasAudio && (
        <audio
          controls
          preload="none"
          src={`/api/stories/audio?answer=${story.id}`}
          className="mt-2 w-full"
        />
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
      {followUp.question && (
        <div className="text-sm text-ink/60">↳ {followUp.question}</div>
      )}
      {followUp.transcript && (
        <p className="mt-1 text-sm text-ink/70">{followUp.transcript}</p>
      )}
      {followUp.hasAudio && (
        <audio
          controls
          preload="none"
          src={`/api/stories/audio?answer=${followUp.id}`}
          className="mt-2 w-full"
        />
      )}
    </div>
  );
}
