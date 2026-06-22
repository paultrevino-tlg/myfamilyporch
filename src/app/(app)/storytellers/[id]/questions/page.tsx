import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getActiveMembership } from "@/lib/auth";
import {
  loadStorytellerQuestions,
  type QuestionCategory,
  type LibraryQuestion,
} from "@/lib/questions";

// The full question library for one storyteller (the "show all questions"
// view linked from the Topics box). Read-only for every member — RLS scopes
// the reads; the active-family + storyteller-id pin keeps it to this elder.
// Coverage view (Topics) stays on the detail page; this lists every question.
export default async function QuestionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const active = await getActiveMembership();
  if (!active) redirect("/onboarding");

  const { id } = await params;
  const lib = await loadStorytellerQuestions(active.family_id, id);

  // Not in this family (or doesn't exist) → 404, never leak another tenant.
  if (!lib) notFound();

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-7">
      <Link
        href={`/storytellers/${lib.id}`}
        className="text-sm font-semibold text-ink/50 hover:text-ink"
      >
        ← Back to {lib.name}
      </Link>

      <div className="mt-3">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          All questions for {lib.name}
        </h1>
        <p className="mt-1.5 text-sm text-ink/55">
          Every question in the library
          {lib.language === "es" ? " (Español)" : ""} — what {lib.name} has
          already answered, and what we haven&apos;t asked yet.{" "}
          <span className="font-medium text-ink/70">
            {lib.answered} of {lib.total} asked
          </span>
          .
        </p>
      </div>

      <div className="mt-7 space-y-8">
        {lib.categories.map((cat) => (
          <CategoryBlock key={cat.category} category={cat} />
        ))}
        {lib.total === 0 && (
          <div className="card px-4 py-10 text-center text-sm text-ink/50">
            No question library for this language yet.
          </div>
        )}
      </div>
    </main>
  );
}

function CategoryBlock({ category }: { category: QuestionCategory }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.06em] text-ink/45">
          {category.category}
        </h2>
        <span className="text-xs font-medium text-ink/45">
          {category.answered} of {category.total} asked
        </span>
      </div>
      <ul className="space-y-2">
        {category.questions.map((q) => (
          <QuestionRow key={q.id} question={q} />
        ))}
      </ul>
    </section>
  );
}

function QuestionRow({ question }: { question: LibraryQuestion }) {
  return (
    <li className="card flex items-start gap-3 p-4">
      <span
        aria-hidden
        className={`mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full text-xs font-bold ${
          question.answered
            ? "bg-emerald-100 text-emerald-700"
            : "border border-line text-ink/30"
        }`}
      >
        {question.answered ? "✓" : ""}
      </span>
      <div className="min-w-0">
        <p className="text-sm leading-relaxed text-ink/80">{question.text}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <span className={question.answered ? "text-emerald-700" : "text-ink/45"}>
            {question.answered ? "Asked" : "Not yet asked"}
          </span>
          {question.custom && (
            <span className="chip bg-accent/10 text-accent">Your question</span>
          )}
        </div>
      </div>
    </li>
  );
}
