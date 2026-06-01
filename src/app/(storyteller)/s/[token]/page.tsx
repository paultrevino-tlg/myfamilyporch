import { validateStorytellerToken } from "@/lib/storyteller/token";
import SessionFlow from "./SessionFlow";

// Token-scoped storyteller flow. No login — the token in the URL is validated
// server-side (HMAC → storyteller_tokens). On a valid link we hand the resolved
// session to the client state machine (SessionFlow, TODO 2.3); on a dead link
// we fail soft and point to a human — never scold, never strand.
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
      // Dead link → the storyteller's language is unknown, so this copy stays
      // English by design (lang="en"). The live flow renders per-storyteller (2.6).
      <main lang="en" className="flex min-h-screen items-center justify-center p-6 text-center">
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

  return (
    <SessionFlow
      token={token}
      name={session.name}
      language={session.language}
    />
  );
}
