import { redirect } from "next/navigation";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";
import { loadStories, type Story, type StoryFollowUp } from "@/lib/stories";
import { toggleInBook, editTranscript, deleteStory } from "./actions";
import PlayAudioButton from "../PlayAudioButton";

// A calm relative day ("Today", "Fri", "12 days ago") — never a raw timestamp
// on this elder-adjacent surface. (Mirrors the dashboard's helper.)
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

// Stories review (TODO 5.2). Listen in the elder's voice, read the transcript,
// fix anything, choose what goes in the book. RLS scopes everything to the
// member's families; viewers can hear + read, only admins edit / toggle.
export default async function StoriesPage() {
  const active = await getActiveMembership();
  if (!active) redirect("/onboarding");

  const canManage = roleAtLeast(active.role, "admin");
  const stories = await loadStories(active.family_id);

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-7">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">{active.name}&apos;s stories</h1>
        <p className="mt-1.5 text-sm text-ink/55">
          Listen in their voice, read the transcript
          {canManage ? ", fix anything, choose what goes in the book." : "."}
        </p>
      </div>

      <ul className="mt-7 space-y-4">
        {stories.map((story) => (
          <StoryCard key={story.id} story={story} canManage={canManage} />
        ))}
        {stories.length === 0 && (
          <li className="card px-4 py-10 text-center text-sm text-ink/50">
            No stories yet — they&apos;ll appear here once {active.name} starts
            recording.
          </li>
        )}
      </ul>
    </main>
  );
}

function StoryCard({ story, canManage }: { story: Story; canManage: boolean }) {
  const duration = formatDuration(story.durationSec);
  const meta = [relDay(story.createdAt), duration].filter(Boolean).join(" · ");

  return (
    <li className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PlayAudioButton answerId={story.id} hasAudio={story.hasAudio} className="-ml-1 shrink-0" />
          <h2 className="font-serif text-xl">{story.question ?? "Untitled story"}</h2>
        </div>
        {story.inBook &&
          (canManage ? null : (
            <span className="chip bg-emerald-100 text-emerald-700">✓ In the book</span>
          ))}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink/50">
        {story.category && <span className="chip bg-accent/10 text-accent">{story.category}</span>}
        <span className="font-medium text-ink/60">{story.storyteller}</span>
        {meta && <span>· {meta}</span>}
      </div>

      {story.transcript && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
          {story.transcript}
        </p>
      )}

      {/* The follow-up thread reads like a conversation under the opening answer. */}
      {story.followUps.length > 0 && (
        <div className="mt-4 space-y-3 border-l-2 border-ink/10 pl-4">
          {story.followUps.map((f) => (
            <FollowUp key={f.id} followUp={f} />
          ))}
        </div>
      )}

      {canManage && <StoryActions story={story} />}
    </li>
  );
}

function FollowUp({ followUp }: { followUp: StoryFollowUp }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <PlayAudioButton answerId={followUp.id} hasAudio={followUp.hasAudio} className="-ml-1 shrink-0" />
        {followUp.question && (
          <div className="text-sm text-ink/60">↳ {followUp.question}</div>
        )}
      </div>
      {followUp.transcript && (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
          {followUp.transcript}
        </p>
      )}
    </div>
  );
}

// Admin-only: toggle "in the book" and edit the transcript. Plain forms +
// server actions — no client JS needed; RLS enforces the admin boundary.
function StoryActions({ story }: { story: Story }) {
  return (
    <div className="mt-4 flex flex-wrap items-start gap-2 border-t border-line pt-4">
      <form action={toggleInBook}>
        <input type="hidden" name="answer_id" value={story.id} />
        <input type="hidden" name="in_book" value={story.inBook ? "false" : "true"} />
        <button
          type="submit"
          className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
            story.inBook
              ? "bg-emerald-600 text-white hover:brightness-110"
              : "border border-line text-ink/70 hover:bg-ink/5"
          }`}
        >
          {story.inBook ? "✓ In the book" : "Add to the book"}
        </button>
      </form>

      <details className="text-sm">
        <summary className="cursor-pointer rounded-full border border-line px-3.5 py-1.5 font-semibold text-ink/70 hover:bg-ink/5">
          ✎ Edit transcript
        </summary>
        <form action={editTranscript} className="mt-2 w-full">
          <input type="hidden" name="answer_id" value={story.id} />
          <textarea
            name="transcript"
            defaultValue={story.transcript ?? ""}
            rows={5}
            placeholder="What they said…"
            className="input w-full text-sm leading-relaxed"
          />
          <button type="submit" className="btn-ink mt-2 text-sm">
            Save transcript
          </button>
        </form>
      </details>

      {/* Delete erases the recording(s) too (5.2a). Tucked behind a disclosure
          so it's deliberate, not a one-tap mistake. */}
      <details className="text-sm">
        <summary className="cursor-pointer rounded-full border border-red-200 px-3.5 py-1.5 font-semibold text-red-700 hover:bg-red-50">
          Delete
        </summary>
        <form action={deleteStory} className="mt-2">
          <input type="hidden" name="answer_id" value={story.id} />
          <p className="text-ink/60">
            This permanently erases this story, its follow-ups, and the voice
            recordings. This can&apos;t be undone.
          </p>
          <button type="submit" className="btn-danger mt-2 text-sm">
            Delete this story
          </button>
        </form>
      </details>
    </div>
  );
}
