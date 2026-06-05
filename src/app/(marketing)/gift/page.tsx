import Link from "next/link";
import { Container } from "../_components/Container";
import { Section } from "../_components/Section";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Give the gift of their stories",
  description:
    "My Family Porch is the gift that keeps a loved one's voice — perfect for a birthday, Mother's or Father's Day, the holidays, or a milestone anniversary. Set it up in minutes; their stories become a keepsake the whole family keeps forever.",
  path: "/gift",
});

// Dedicated gifting landing page (Phase 8.7). Gifting is a primary use case and
// the brief's secondary audience (gift-givers — birthdays, Mother's/Father's
// Day, holidays, milestones; brief §1, §4, §7). Server-rendered, static, no JS
// island. The actual gift purchase + redemption (Stripe checkout → redeemable
// code) is Phase 9.7 — until then the buy CTA routes to the existing /signup
// seam so there's no dead button (marketing rule). Repoint when 9.7 lands.
const GIFT_BUY_HREF = "/signup"; // TODO(9.7): repoint to the dedicated gift checkout (mints a redeemable code/link)

export default function GiftPage() {
  return (
    <>
      <Hero />
      <WhyMeaningful />
      <HowGiftingWorks />
      <PerfectFor />
      <WhatTheyReceive />
      <Reassurance />
      <FinalCta />
    </>
  );
}

// --- Hero ------------------------------------------------------------------

function Hero() {
  return (
    <Container>
      <section className="mx-auto max-w-2xl py-12 text-center sm:py-20">
        <span className="chip bg-accent/10 text-accent">A gift that lasts</span>
        <h1 className="mt-4 font-serif text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          The gift that keeps their voice.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink/65">
          For the parent or grandparent who has everything, give something they
          can&apos;t buy: their own life stories, in their own voice, kept for the
          whole family. A birthday, Mother&apos;s or Father&apos;s Day, the
          holidays, a milestone anniversary — there&apos;s no wrong time to start.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href={GIFT_BUY_HREF} className="btn-primary px-7 py-3.5 text-base">
            Give it as a gift
          </Link>
          <Link
            href="/how-it-works"
            className="btn px-7 py-3.5 text-base ring-1 ring-line hover:bg-surface2"
          >
            See how it works
          </Link>
        </div>
      </section>
    </Container>
  );
}

// --- Why it's a meaningful gift --------------------------------------------

function WhyMeaningful() {
  return (
    <Section className="border-t border-line bg-surface2/50">
      <div className="grid items-center gap-10 sm:grid-cols-2">
        <div>
          <span className="chip bg-brand/10 text-brand">Why it matters</span>
          <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
            Not another thing. The one gift they&apos;ll want to leave behind.
          </h2>
          <div className="mt-5 space-y-4 text-lg leading-relaxed text-ink/70">
            <p>
              Most gifts get unwrapped and forgotten. This one gives your loved
              one a reason to tell the stories they&apos;ve been meaning to — the
              way they met, the house they grew up in, the year everything
              changed — and it hands those stories back to everyone who loves them.
            </p>
            <p>
              It&apos;s a gift to them and to the whole family at once: they feel
              heard, and you get to keep the sound of them telling it.
            </p>
          </div>
        </div>

        <div className="card relative overflow-hidden p-8 shadow-lg">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-gradient-to-br from-[#FCD34D]/25 to-accent/10 blur-2xl" />
          <p className="font-serif text-2xl font-semibold leading-relaxed text-ink/85">
            “I didn&apos;t know I needed to hear his voice again until I could.”
          </p>
          {/* Sound-wave / porch-railing motif (brief §5). */}
          <div className="mt-7 flex h-12 items-end gap-1" aria-hidden>
            {[6, 10, 15, 9, 19, 25, 17, 28, 21, 13, 23, 11, 16, 8, 5].map((h, i) => (
              <span
                key={i}
                className="w-1.5 rounded-full bg-gradient-to-t from-brand to-sky2"
                style={{ height: `${h * 4}%` }}
              />
            ))}
          </div>
          <div className="mt-3 text-sm font-semibold text-ink/65">
            A keepsake you can hear, not just hold.
          </div>
        </div>
      </div>
    </Section>
  );
}

// --- How gifting works -----------------------------------------------------
// Honest + intentionally vague on redemption mechanics — the gift purchase &
// redemption flow is Phase 9.7 (TODO: confirm gift-flow details, brief §13).

const GIFT_STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "1",
    title: "Set it up in minutes",
    body: "Give the gift, then add the loved one whose stories you want to keep — their name, language, and a phone number. It takes just a few minutes, and you can do it on their behalf.",
  },
  {
    n: "2",
    title: "They get gentle prompts and just talk",
    body: "Each week, a warm question arrives by text. They answer by simply speaking — no app to learn, no smartphone required. It feels like a grandchild asking, not a form to fill out.",
  },
  {
    n: "3",
    title: "The whole family keeps the keepsake",
    body: "Their answers become a growing archive of recordings, written stories, and photos — and a keepsake book you can hold. Everyone you invite can listen, anytime, forever.",
  },
];

function HowGiftingWorks() {
  return (
    <Section>
      <div className="mx-auto max-w-2xl text-center">
        <span className="chip bg-accent/10 text-accent">How gifting works</span>
        <h2 className="mt-4 font-serif text-3xl font-semibold sm:text-4xl">
          Simple to give. Effortless for them.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-ink/65">
          You handle the setup; they just talk. The gentle part is the point.
        </p>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {GIFT_STEPS.map((s) => (
          <div key={s.n} className="card flex flex-col p-7">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-brand to-sky2 font-serif text-lg font-semibold text-white shadow-sm">
              {s.n}
            </div>
            <h3 className="mt-4 font-serif text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 leading-relaxed text-ink/65">{s.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

// --- Perfect for -----------------------------------------------------------

const OCCASIONS: { icon: string; label: string }[] = [
  { icon: "🎂", label: "Birthdays" },
  { icon: "💐", label: "Mother's Day" },
  { icon: "🎣", label: "Father's Day" },
  { icon: "🎄", label: "The holidays" },
  { icon: "💍", label: "Milestone anniversaries" },
  { icon: "🤍", label: "Just because" },
];

function PerfectFor() {
  return (
    <Section className="bg-surface2/50">
      <div className="mx-auto max-w-2xl text-center">
        <span className="chip bg-brand/10 text-brand">When to give it</span>
        <h2 className="mt-4 font-serif text-3xl font-semibold sm:text-4xl">
          Perfect for the moments that matter.
        </h2>
      </div>
      <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
        {OCCASIONS.map((o) => (
          <div
            key={o.label}
            className="card flex flex-col items-center gap-2 p-6 text-center"
          >
            <span className="text-3xl" aria-hidden>
              {o.icon}
            </span>
            <span className="font-semibold text-ink/80">{o.label}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

// --- What they receive -----------------------------------------------------

const INCLUDED: { icon: string; title: string; body: string }[] = [
  {
    icon: "🎙️",
    title: "Their voice, preserved",
    body: "Every story is recorded — the pauses, the laugh, the way they say your name — and kept in their own voice.",
  },
  {
    icon: "📖",
    title: "Written stories",
    body: "Each recording is transcribed into readable stories, organized by chapter, ready to revisit any time.",
  },
  {
    icon: "📸",
    title: "Photos that belong with them",
    body: "Add family photos alongside the stories so the memory and the moment live together.",
  },
  {
    icon: "📚",
    title: "A book you can hear",
    body: "A keepsake book with voice QR codes — scan a page and hear the story read in their own voice.",
  },
];

function WhatTheyReceive() {
  return (
    <Section>
      <div className="mx-auto max-w-2xl text-center">
        <span className="chip bg-accent/10 text-accent">What&apos;s inside the gift</span>
        <h2 className="mt-4 font-serif text-3xl font-semibold sm:text-4xl">
          A keepsake the whole family keeps.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-ink/65">
          {/* TODO: confirm keepsake format (brief §13). */}
          Far more than a card — a living archive plus a book they can hold.
        </p>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {INCLUDED.map((it) => (
          <div key={it.title} className="card flex items-start gap-4 p-7">
            <span className="text-3xl" aria-hidden>
              {it.icon}
            </span>
            <div>
              <h3 className="font-serif text-lg font-semibold">{it.title}</h3>
              <p className="mt-1.5 leading-relaxed text-ink/65">{it.body}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-10 text-center">
        <Link href="/pricing" className="link text-base">
          See gift pricing →
        </Link>
      </p>
    </Section>
  );
}

// --- Reassurance -----------------------------------------------------------

function Reassurance() {
  return (
    <Section className="bg-surface2/50">
      <div className="mx-auto max-w-2xl text-center">
        <span className="chip bg-brand/10 text-brand">No tech worries</span>
        <h2 className="mt-4 font-serif text-3xl font-semibold sm:text-4xl">
          Made for the least techy person you love.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-ink/65">
          The person you&apos;re gifting it to doesn&apos;t need a smartphone, an
          app, or any setup of their own — just the ability to answer a text and
          talk. And the recordings stay private to your family: yours to keep,
          and never sold.
        </p>
        <p className="mt-6">
          <Link href="/privacy" className="link text-base">
            Read how we protect your recordings →
          </Link>
        </p>
      </div>
    </Section>
  );
}

// --- Final CTA band --------------------------------------------------------
// Porch motif (brief §5): a warm porch-light glow behind a calm, dark band.

function FinalCta() {
  return (
    <Section bleed className="pb-20">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-ink px-8 py-16 text-center text-white shadow-lg sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 -translate-y-1/3 rounded-full bg-gradient-to-b from-[#FCD34D]/35 to-transparent blur-3xl" />
          <div className="relative">
            <h2 className="mx-auto max-w-xl font-serif text-3xl font-semibold leading-tight sm:text-4xl">
              Give them a reason to tell the story.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-white/70">
              The best time to start was years ago. The next best time is today.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={GIFT_BUY_HREF}
                className="btn-primary px-7 py-3.5 text-base"
              >
                Give it as a gift
              </Link>
              <Link
                href="/pricing"
                className="btn px-7 py-3.5 text-base text-white/90 ring-1 ring-white/25 hover:bg-white/10"
              >
                See pricing
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
