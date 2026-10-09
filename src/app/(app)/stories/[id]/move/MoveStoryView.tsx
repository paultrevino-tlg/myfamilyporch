import Link from "next/link";
import type { MoveContext } from "@/lib/reassign";
import { reassignStory } from "../../actions";

// The Move page body (TODO 5.9), split from page.tsx so it renders from a
// MoveContext alone. One radio list, one confirm — no client JS.

const ERRORS: Record<string, string> = {
  pick: "Choose one of the questions below to move the story to.",
  taken: "That question was just answered by another story. Pick a different one.",
  save: "Something went wrong saving the move. Nothing changed — please try again.",
};

export default function MoveStoryView({ move, error: errorKey }: { move: MoveContext; error?: string }) {
  const error = ERRORS[errorKey ?? ""];
  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-7">
      <Link href="/stories" className="text-sm font-semibold text-brand hover:underline">
        ← Back to stories
      </Link>
      <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight">Move to a different question</h1>
      <p className="mt-1.5 text-sm text-ink/70">
        When {move.storytellerName} answered something other than what was asked, point the
        story at the question it really answers.
      </p>

      <section className="card mt-6 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.06em] text-ink/55">Currently filed under</p>
        <h2 className="mt-1.5 font-serif text-xl">{move.currentQuestion ?? "Untitled story"}</h2>
        {move.transcript && (
          <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-ink/70">
            {move.transcript}
          </p>
        )}
        <ul className="mt-4 space-y-1.5 rounded-xl bg-surface2 px-3.5 py-2.5 text-sm text-ink/80">
          {move.frees && <li>That question goes back in the queue and can be asked again in a future session.</li>}
          {move.fromLibrary && !move.frees && (
            <li>Another story also answers that question, so it stays answered.</li>
          )}
          <li>Its follow-up conversation, recording, photos and book setting move with it.</li>
        </ul>
      </section>

      {error && (
        <p role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
          {error}
        </p>
      )}

      {move.options.length === 0 ? (
        <p className="card mt-6 px-5 py-8 text-center text-sm text-ink/70">
          Every question in {move.storytellerName}&apos;s library already has a story, so there&apos;s
          nowhere to move this one.
        </p>
      ) : (
        <form action={reassignStory} className="mt-6">
          <input type="hidden" name="answer_id" value={move.answerId} />
          <p className="text-sm text-ink/70">
            Questions {move.storytellerName} hasn&apos;t answered yet, by topic:
          </p>
          <div className="mt-4 space-y-6">
            {move.options.map((cat) => (
              <fieldset key={cat.category} className="card p-5">
                <legend className="px-1 text-xs font-bold uppercase tracking-[0.06em] text-ink/55">
                  {cat.category}
                </legend>
                <div className="space-y-1">
                  {cat.questions.map((q) => (
                    <label
                      key={q.id}
                      className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-surface2 has-[:checked]:bg-brand/10"
                    >
                      <input type="radio" name="prompt_id" value={q.id} required className="mt-1 accent-brand" />
                      <span className="leading-snug">{q.text}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          {/* Sticky so the confirm stays reachable under a long list on a phone. */}
          <div className="sticky bottom-0 -mx-5 mt-6 border-t border-line bg-paper/95 px-5 py-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
            <button type="submit" className="btn-primary w-full py-3 text-base sm:w-auto sm:px-8">
              Move story
            </button>
            <Link href="/stories" className="ml-0 mt-3 block text-center text-sm font-semibold text-ink/70 hover:underline sm:ml-4 sm:mt-0 sm:inline">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </main>
  );
}
