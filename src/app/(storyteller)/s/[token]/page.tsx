// Token-scoped storyteller flow. No login. The token is validated server-side
// (see api/storyteller/*). This page renders the 7-screen voice flow.
// TODO 2.2/2.3: validate token, load storyteller + language, render flow.
export default async function StorytellerSession({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main className="flex min-h-screen items-center justify-center p-6 text-center">
      <div>
        <p className="text-ink/60 text-sm">storyteller session</p>
        <p className="mt-2 text-xs break-all text-ink/40">token: {token}</p>
        {/* TODO 2.3: prime mic → welcome → question (cloned voice) → record → AI follow-up → done */}
      </div>
    </main>
  );
}
