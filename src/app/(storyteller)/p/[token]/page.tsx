import type { Metadata } from "next";
import { readPlayToken } from "@/lib/book/play-token";
import { loadPublicStory } from "@/lib/book/public-story";
import { t, type Lang } from "@/lib/i18n";
import AutoPlayAudio from "./AutoPlayAudio";

// Public voice-QR play page (TODO 7.2). The destination of a story's QR code in
// the printed keepsake — scanned by anyone holding the book, with NO login. The
// play token (printed into the QR) is validated server-side; a forged/dead token
// fails soft to a calm screen (never a stack trace, never a login wall). Lives in
// the (storyteller) route group to inherit the large, low-vision elder fonts.
// Rendered in the storyteller's own language — the recording's language.

export const metadata: Metadata = { robots: { index: false } }; // unguessable link, keep it out of search

function DeadLink({ lang }: { lang: Lang }) {
  return (
    <main
      lang={lang}
      className="flex min-h-screen items-center justify-center p-6 text-center"
    >
      <div className="max-w-sm">
        <p className="font-serif text-2xl">{t(lang, "play_dead_title")}</p>
        <p className="mt-3 text-lg text-ink/60">{t(lang, "play_dead_sub")}</p>
      </div>
    </main>
  );
}

export default async function VoiceQrPlayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const answerId = await readPlayToken(token);
  // Dead/forged token → language unknown, so the calm screen stays English.
  if (!answerId) return <DeadLink lang="en" />;

  const story = await loadPublicStory(answerId);
  if (!story) return <DeadLink lang="en" />;

  const lang = story.language;
  const name = story.storytellerName;

  return (
    <main lang={lang} className="mx-auto min-h-screen max-w-xl px-5 py-10 sm:px-7">
      <div className="text-center">
        <div className="text-sm uppercase tracking-[0.18em] text-accent">
          {t(lang, "play_kicker")}
        </div>
        <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight">
          {t(lang, "play_in_voice", { name })}
        </h1>
      </div>

      {/* The story itself. */}
      <section className="mt-8 rounded-2xl border border-line bg-paper px-5 py-6 shadow-sm">
        {story.question && (
          <h2 className="font-serif text-xl leading-snug">{story.question}</h2>
        )}
        {story.hasAudio ? (
          <AutoPlayAudio
            className="mt-4 w-full"
            src={`/api/p/audio?t=${encodeURIComponent(token)}`}
          />
        ) : (
          <p className="mt-4 text-base text-ink/50">{t(lang, "play_no_audio")}</p>
        )}
        {story.transcript && (
          <p className="mt-4 text-lg leading-relaxed text-ink/75">{story.transcript}</p>
        )}
      </section>

      {/* The follow-up thread — the rest of the conversation. */}
      {story.followUps.length > 0 && (
        <section className="mt-7">
          <h3 className="text-sm uppercase tracking-[0.14em] text-ink/45">
            {t(lang, "play_more")}
          </h3>
          <ul className="mt-3 space-y-4">
            {story.followUps.map((f) => (
              <li
                key={f.id}
                className="rounded-2xl border border-line bg-paper px-5 py-4 shadow-sm"
              >
                {f.hasAudio && (
                  <audio
                    controls
                    preload="none"
                    className="w-full"
                    src={`/api/p/audio?t=${encodeURIComponent(token)}&a=${f.id}`}
                  />
                )}
                {f.transcript && (
                  <p className="mt-3 text-lg leading-relaxed text-ink/75">{f.transcript}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
