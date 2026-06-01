import { validateStorytellerToken } from "@/lib/storyteller/token";

// Token-scoped storyteller flow. No login — the token in the URL is validated
// server-side (HMAC → storyteller_tokens). This page is the entry to the
// 7-screen voice flow. TODO 2.3 builds the full flow; for now it confirms the
// link is valid and welcomes the storyteller, or fails soft on a dead link.
export default async function StorytellerSession({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await validateStorytellerToken(token);

  // Forgiving dead-end: never scold, never strand — point to a human.
  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-center">
        <div className="max-w-sm">
          <p className="text-2xl">This link isn&apos;t active anymore</p>
          <p className="mt-3 text-lg text-ink/60">
            No worries at all. Ask your family to send you a fresh link, and
            we&apos;ll pick right back up.
          </p>
        </div>
      </main>
    );
  }

  const es = session.language === "es";
  return (
    <main className="flex min-h-screen items-center justify-center p-6 text-center">
      <div className="max-w-sm">
        <p className="text-lg text-ink/60">{es ? "Hola" : "Hello"}</p>
        <p className="mt-2 text-3xl font-semibold">{session.name}</p>
        <p className="mt-4 text-lg text-ink/70">
          {es
            ? "Es un buen momento para contar una historia."
            : "It's a good moment to tell a story."}
        </p>
        {/* TODO 2.3: prime mic → welcome → question (cloned voice) → record → AI follow-up → done */}
      </div>
    </main>
  );
}
