import { redirect } from "next/navigation";
import Link from "next/link";
import { getActiveMembership } from "@/lib/auth";
import { loadBookStorytellers } from "@/lib/book";

// The Book (TODO 7.1). The keepsake is per-storyteller, so this is a chooser:
// one storyteller jumps straight to their book; several show calm cards. RLS
// scopes the list to the active family.
export default async function BookPage() {
  const active = await getActiveMembership();
  if (!active) redirect("/onboarding");

  const storytellers = await loadBookStorytellers(active.family_id);
  if (storytellers.length === 1) redirect(`/book/${storytellers[0].id}`);

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-7">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">The keepsake</h1>
      <p className="mt-1.5 text-sm text-ink/55">
        Choose whose book to arrange. Everything marked &ldquo;in the book&rdquo; gathers
        into chapters here.
      </p>

      {storytellers.length === 0 ? (
        <div className="card mt-7 px-4 py-10 text-center text-sm text-ink/50">
          No storytellers yet.
        </div>
      ) : (
        <ul className="mt-7 grid gap-3 sm:grid-cols-2">
          {storytellers.map((s) => (
            <li key={s.id}>
              <Link
                href={`/book/${s.id}`}
                className="card flex items-center justify-between p-5 transition hover:shadow-md"
              >
                <span className="font-serif text-xl">{s.name}</span>
                <span className="text-sm text-ink/50">
                  {s.storyCount} {s.storyCount === 1 ? "story" : "stories"} in the book
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
