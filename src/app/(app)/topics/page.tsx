import { redirect } from "next/navigation";
import Link from "next/link";
import { getActiveMembership, roleAtLeast } from "@/lib/auth";
import {
  loadTopics,
  type StorytellerTopics,
  type TopicRow,
  type TopicPreference,
} from "@/lib/topics";
import { setTopicPreference } from "./actions";

// Topics steering (TODO 5.3). "Set the weight, not a script": Focus biases a
// category to the front, Ease off sinks it, Avoid leaves it alone. The AI still
// chases whatever the elder opens — this only nudges which corners we lead
// toward. RLS scopes reads to the family; only admins can steer.
export default async function TopicsPage() {
  const active = await getActiveMembership();
  if (!active) redirect("/onboarding");

  const canManage = roleAtLeast(active.role, "admin");
  const storytellers = await loadTopics(active.family_id);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl">What should we ask about?</h1>
          <p className="mt-1 text-sm text-ink/60">
            Nudge where the AI leans next. It still follows whatever thread your
            storyteller opens.
          </p>
        </div>
        <Link href="/dashboard" className="text-sm text-ink/60 underline">
          Back to overview
        </Link>
      </div>

      {storytellers.length === 0 && (
        <p className="mt-8 rounded-2xl border bg-white/40 px-4 py-8 text-center text-sm text-ink/50">
          No storytellers yet.{" "}
          <Link href="/storytellers" className="underline">
            Add one
          </Link>
          .
        </p>
      )}

      {storytellers.map((st) => (
        <StorytellerTopicsBlock key={st.id} st={st} canManage={canManage} />
      ))}
    </main>
  );
}

function StorytellerTopicsBlock({
  st,
  canManage,
}: {
  st: StorytellerTopics;
  canManage: boolean;
}) {
  return (
    <section className="mt-8">
      <h2 className="font-medium text-lg">{st.name}</h2>
      <ul className="mt-3 space-y-2">
        {st.topics.map((t) => (
          <TopicRowItem
            key={t.category}
            storytellerId={st.id}
            topic={t}
            canManage={canManage}
          />
        ))}
      </ul>
    </section>
  );
}

const PREF_LABEL: Record<TopicPreference, string> = {
  ease_off: "Ease off",
  focus: "Focus next",
  avoid: "Avoid",
};

function coverageLabel(t: TopicRow): string {
  if (t.explored === 0) return "untouched";
  return `${t.explored} of ${t.available} explored`;
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
    topic.available > 0
      ? Math.min(100, Math.round((topic.explored / topic.available) * 100))
      : 0;

  return (
    <li className="rounded-2xl border bg-white/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[12rem] flex-1">
          <div className="font-medium text-sm">{topic.category}</div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full bg-ink/40" style={{ width: `${pct}%` }} />
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
                  <button
                    type="submit"
                    className={segClass(pref, selected)}
                    aria-pressed={selected}
                  >
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

// Segmented-control button styling; Avoid gets a red emphasis when selected.
function segClass(pref: TopicPreference, selected: boolean): string {
  const base = "rounded-full border px-3 py-1 text-xs whitespace-nowrap";
  if (!selected) return `${base} text-ink/60 hover:bg-ink/5`;
  if (pref === "avoid") return `${base} border-red-700 bg-red-700 text-white`;
  return `${base} border-ink bg-ink text-white`;
}
