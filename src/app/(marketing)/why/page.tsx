import { Section } from "../_components/Section";
import { PRIMARY_CTA } from "../_components/nav";
import { PageIntro, ClosingBand } from "../_components/Editorial";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Our why",
  description:
    "Why I built My Family Porch: it started with a Father's Day gift I couldn't find, and the wish that my dad could simply tell us the stories of his life. A first-person letter from founder Paul Trevino.",
  path: "/why",
});

// Founder's letter (personal, first-person) — distinct from /about ("Our story",
// the brand-voice page). Static server component, no JS island, matching the
// rest of the marketing shell. The photo is a plain <img> (this codebase uses
// no next/image for marketing) served from /public so the page stays static on
// Workers.

export default function WhyPage() {
  return (
    <>
      <Intro />
      <Letter />
      <FinalCta />
    </>
  );
}

// --- Intro -----------------------------------------------------------------

function Intro() {
  return (
    <PageIntro label="A letter from the founder" title="It started with a Father&apos;s Day gift I couldn&apos;t find.">
      My Family Porch began at home, on a Sunday morning, with one simple wish:
      that my dad could just <em>tell</em> us the stories of his life.
    </PageIntro>
  );
}

// --- Letter ----------------------------------------------------------------

function Letter() {
  return (
    <Section className="bg-surface2">
      {/* Photo beside the letter on desktop (it stays in view while reading),
          above it on phones; the letter keeps the narrow measure. */}
      <div className="grid gap-12 lg:grid-cols-[1fr_36rem] lg:gap-20">
        <figure className="rise lg:sticky lg:top-24 lg:self-start">
          {/* eslint-disable-next-line @next/next/no-img-element -- static marketing page, no next/image in this codebase */}
          <img
            src="/founder-and-dad.jpg"
            alt="Paul Trevino smiling next to his dad, the first storyteller, in a sunlit kitchen."
            width={1158}
            height={1544}
            className="h-auto w-full max-w-md"
          />
          <figcaption className="mt-4 text-[0.8rem] uppercase tracking-[0.16em] text-ink/70">
            My dad — and my very first storyteller.
          </figcaption>
        </figure>

        <div className="rise">
          <div className="space-y-5 text-lg leading-relaxed text-ink/85">
            <p>
              One Sunday morning a few weeks ago, my wife and I were sitting on the
              sofa, and I was trying to figure out what to get my dad for
              Father&apos;s Day. Amazon had sent me one of those gift-idea emails,
              so I started scrolling through it.
            </p>
            <p>
              I came across one of those books — the kind with prompts where my dad
              could write down the answers about his life and the things he&apos;s
              seen.
            </p>
            <p>
              My dad has lived a long, full life: exciting chapters, real
              accomplishments, and hard seasons he fought through and came out the
              other side of. Capturing those stories sounded wonderful. But with his
              health, sitting down to write it all out by hand would be a lot to ask.
            </p>
            <p>
              Then it hit me: wouldn&apos;t it be better if he could just{" "}
              <em>tell</em> us a story?
            </p>
            <p>
              He has a cell phone, and he knows how to use it. So why not make
              sharing his memories as easy as talking on the phone?
            </p>
            <p>
              With everything AI can do now, that&apos;s finally possible. My dad can
              talk with me — tell me the stories of his life — and let our AI gently
              ask the follow-up questions that draw out all those little details that
              made his life so interesting.
            </p>
            <p>And just like that, the idea was born.</p>
            <p>
              Are there other companies that do something like this? A few. But a
              handful of things make us different: it&apos;s voice-first, so
              there&apos;s nothing to write down. It&apos;s built around real AI that
              listens and asks better questions. It&apos;s <em>my own voice</em>{" "}
              guiding my dad through his stories. And you don&apos;t have to keep
              paying us forever to hold onto your loved one&apos;s memories —
              they&apos;re yours to keep.
            </p>
            <p>
              So, Dad — you inspired this. You&apos;re the reason this company
              exists. And you are our very first storyteller.
            </p>
            <p>
              Today is Father&apos;s Day. I love you. And I can&apos;t wait to sit on
              the porch, listen to your stories, and share them with your grandkids
              and the rest of our family.
            </p>
            <p className="pt-3 font-serif text-[2.2rem] italic leading-tight text-ink">
              I love you, Dad.
            </p>
          </div>

          {/* Signature */}
          <p className="mt-8 font-serif text-2xl text-ink">Paul</p>
          <p className="mt-1 text-[0.85rem] uppercase tracking-[0.16em] text-ink/70">Founder, My Family Porch</p>
        </div>
      </div>
    </Section>
  );
}

// --- Closing band ----------------------------------------------------------

function FinalCta() {
  return (
    <ClosingBand
      title="Start your family&apos;s porch today."
      actions={[PRIMARY_CTA, { href: "/how-it-works", label: "See how it works" }]}
    >
      The stories are worth keeping — and the best day to begin is today.
    </ClosingBand>
  );
}
