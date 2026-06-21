import Link from "next/link";
import { Container } from "../_components/Container";
import { Section } from "../_components/Section";
import { PRIMARY_CTA } from "../_components/nav";
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
    <Container>
      <section className="mx-auto max-w-2xl py-12 text-center sm:py-20">
        <span className="chip bg-accent/10 text-accent">
          A letter from the founder
        </span>
        <h1 className="mt-4 font-serif text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          It started with a Father&apos;s Day gift I couldn&apos;t find.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink/65">
          My Family Porch began at home, on a Sunday morning, with one simple
          wish: that my dad could just <em>tell</em> us the stories of his life.
        </p>
      </section>
    </Container>
  );
}

// --- Letter ----------------------------------------------------------------

function Letter() {
  return (
    <Section className="border-t border-line bg-surface2/50">
      <div className="mx-auto max-w-2xl">
        {/* Photo: founder + his dad, the first storyteller. */}
        <figure className="mb-12">
          <div className="card overflow-hidden p-2 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element -- static marketing page, no next/image in this codebase */}
            <img
              src="/founder-and-dad.jpg"
              alt="Paul Trevino smiling next to his dad, the first storyteller, in a sunlit kitchen."
              width={1158}
              height={1544}
              className="h-auto w-full rounded-xl"
            />
          </div>
          <figcaption className="mt-3 text-center text-sm text-ink/60">
            My dad — and my very first storyteller.
          </figcaption>
        </figure>

        <div className="space-y-5 text-lg leading-relaxed text-ink/80">
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
          <p className="font-serif text-xl font-semibold text-ink/90">
            I love you, Dad.
          </p>
        </div>

        {/* Signature */}
        <p className="mt-8 font-serif text-2xl font-semibold text-ink">Paul</p>
        <p className="mt-1 text-sm text-ink/60">Founder, My Family Porch</p>
      </div>
    </Section>
  );
}

// --- Final CTA band --------------------------------------------------------
// Porch motif (matches /about): a warm porch-light glow behind a calm, dark band.

function FinalCta() {
  return (
    <Section bleed className="pb-20">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-ink px-8 py-16 text-center text-white shadow-lg sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 -translate-y-1/3 rounded-full bg-gradient-to-b from-[#FCD34D]/35 to-transparent blur-3xl" />
          <div className="relative">
            <h2 className="mx-auto max-w-xl font-serif text-3xl font-semibold leading-tight sm:text-4xl">
              Start your family&apos;s porch today.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-white/70">
              The stories are worth keeping — and the best day to begin is today.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={PRIMARY_CTA.href}
                className="btn-primary px-7 py-3.5 text-base"
              >
                {PRIMARY_CTA.label}
              </Link>
              <Link
                href="/how-it-works"
                className="btn px-7 py-3.5 text-base text-white/90 ring-1 ring-white/25 hover:bg-white/10"
              >
                See how it works
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
