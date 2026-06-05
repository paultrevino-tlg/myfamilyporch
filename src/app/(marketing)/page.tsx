import Link from "next/link";
import { Container } from "./_components/Container";
import { Section } from "./_components/Section";
import { EmailCapture } from "./_components/EmailCapture";
import { PRIMARY_CTA } from "./_components/nav";
import { JsonLd } from "./_components/JsonLd";
import { pageMeta } from "@/lib/seo";
import { organizationLd } from "@/lib/jsonld";
import { TIERS, FAQ, formatPrice, type PricingTier } from "@/lib/pricing";

export const metadata = pageMeta({
  title: "My Family Porch",
  description:
    "My Family Porch records a loved one's life stories through short, AI-guided voice interviews — gentle to use, and kept as a keepsake your whole family can hear.",
  path: "/",
});

// Public landing (Phase 8.2). The marketing shell (8.1) provides nav + footer;
// this page renders every home section: hero · the-problem-gently · how-it-works
// · why-voice-matters · what-you-get · social proof · pricing preview · FAQ ·
// final CTA band. Section ids match nav.ts + SiteFooter anchors exactly
// (#how-it-works · #what-you-get · #stories · #faq) so no links dead-end.
// Server-rendered, no JS island: the FAQ accordion is native <details>. Pricing
// + FAQ copy is read from lib/pricing (single source of truth, shared w/ 8.3).
// The "porch" motif (brief §5) is threaded as a warm porch-light glow on the
// final CTA band + the hero's sound-wave railing — one ownable detail, not a
// generic gradient.

export default function Home() {
  return (
    <>
      <JsonLd data={organizationLd()} />
      <Hero />
      <Problem />
      <HowItWorks />
      <WhyVoice />
      <WhatYouGet />
      <SocialProof />
      <PricingPreview />
      <Faq />
      <NotReady />
      <FinalCta />
    </>
  );
}

// --- Not ready yet? (email capture) ----------------------------------------
// For visitors who aren't ready to start (brief §6/§7). The only place the
// email-capture island lives — this is where not-ready visitors land. The
// island hydrates client-side; the page itself stays statically prerendered.

function NotReady() {
  return (
    <Section className="bg-surface2/50">
      <div className="mx-auto mb-8 max-w-xl text-center">
        <p className="chip">No pressure</p>
        <h2 className="mt-4 font-serif text-3xl font-semibold sm:text-4xl">
          Not ready yet? Stay on the porch with us.
        </h2>
        <p className="mt-3 text-lg leading-relaxed text-ink/70">
          Leave your name and email and we&apos;ll send a gentle note when the
          time feels right. No spam, ever.
        </p>
      </div>
      <EmailCapture />
    </Section>
  );
}

// --- Hero ------------------------------------------------------------------

function Hero() {
  return (
    <Container>
      <section className="grid items-center gap-10 py-12 sm:grid-cols-2 sm:py-20">
        <div>
          <span className="chip bg-brand/10 text-brand">For families</span>
          <h1 className="mt-4 font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Their stories, in their&nbsp;own voice.
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-ink/65">
            My Family Porch records a loved one&apos;s life stories through short,
            AI-guided voice interviews — gentle to use, and kept as a keepsake your
            whole family can hear.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={PRIMARY_CTA.href} className="btn-primary px-6 py-3 text-base">
              {PRIMARY_CTA.label}
            </Link>
            <Link href="/#how-it-works" className="btn-ghost px-6 py-3 text-base">
              See how it works
            </Link>
          </div>
        </div>

        <div className="card relative overflow-hidden p-7 shadow-lg">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-brand/20 to-sky2/20 blur-2xl" />
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-[#6366F1] to-sky2 text-2xl shadow-sm">
              🏡
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-accent">A question for you</div>
              <div className="font-serif text-xl font-semibold">What was your first home like?</div>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-line bg-surface2 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-brand">
              <span className="flex items-end gap-0.5" aria-hidden>
                <i className="h-3 w-1 rounded-full bg-brand" />
                <i className="h-4 w-1 rounded-full bg-brand" />
                <i className="h-2 w-1 rounded-full bg-brand" />
                <i className="h-3.5 w-1 rounded-full bg-brand" />
              </span>
              Listening…
            </div>
            <p className="mt-2 text-sm text-ink/65">Take your time — there&apos;s no rush, and no wrong answer.</p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
            {[
              ["31", "stories"],
              ["12", "topics"],
              ["2", "voices"],
            ].map(([v, k]) => (
              <div key={k} className="rounded-xl border border-line bg-surface2 py-3">
                <div className="font-serif text-2xl font-semibold text-brand">{v}</div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-ink/65">{k}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Container>
  );
}

// --- The problem, gently ---------------------------------------------------

function Problem() {
  return (
    <Section className="border-t border-line">
      <div className="mx-auto max-w-2xl text-center">
        <span className="chip bg-accent/10 text-accent">Why now</span>
        <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
          There are stories we always mean to ask about.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-ink/65">
          How they met. The house they grew up in. The job nobody talks about
          anymore. We tell ourselves we&apos;ll sit down and ask one day — and then
          the chance quietly slips away. My Family Porch is that conversation, made
          easy enough to actually happen, and saved before it&apos;s gone.
        </p>
      </div>
    </Section>
  );
}

// --- How it works ----------------------------------------------------------

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "1",
    title: "Set it up in minutes",
    body: "Add your loved one and choose the topics you'd love to hear about. No app for them to install — it works over a normal phone.",
  },
  {
    n: "2",
    title: "They get gentle prompts — and just talk",
    body: "Every so often, a warm, AI-guided question arrives. They answer out loud, in their own time. No typing, no screens to figure out.",
  },
  {
    n: "3",
    title: "Their voice becomes a keepsake",
    body: "Each answer is transcribed and saved into a growing collection of stories your whole family can listen to and read — forever.",
  },
];

function HowItWorks() {
  return (
    <Section id="how-it-works" className="bg-surface2/50">
      <div className="mx-auto max-w-2xl text-center">
        <span className="chip bg-brand/10 text-brand">How it works</span>
        <h2 className="mt-4 font-serif text-3xl font-semibold sm:text-4xl">
          Three simple steps.
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-ink/65">
          You do the easy setup. They just answer the phone. We keep the stories.
        </p>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n} className="card flex flex-col p-7">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-brand to-sky2 font-serif text-lg font-semibold text-white shadow-sm">
              {s.n}
            </div>
            <h3 className="mt-5 font-serif text-xl font-semibold">{s.title}</h3>
            <p className="mt-2 leading-relaxed text-ink/65">{s.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

// --- Why voice matters -----------------------------------------------------

function WhyVoice() {
  return (
    <Section>
      <div className="grid items-center gap-10 sm:grid-cols-2">
        <div>
          <span className="chip bg-accent/10 text-accent">Why voice</span>
          <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
            A transcript can&apos;t laugh. Their voice can.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink/65">
            The way they pause, the catch in their throat at the good part, the way
            they say your name — that&apos;s the part you&apos;ll miss most. We keep
            the real recording, not just the words.
          </p>
          <ul className="mt-6 space-y-3 text-ink/75">
            {[
              "It’s their actual voice — saved, not summarized.",
              "Nothing to learn: answer a prompt out loud, that’s it.",
              "Works for the least tech-comfortable elder in the family.",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <span aria-hidden className="mt-1 shrink-0 text-brand">
                  ✓
                </span>
                <span className="leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card relative overflow-hidden p-8 shadow-lg">
          <div className="pointer-events-none absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-gradient-to-br from-accent/15 to-sky2/15 blur-2xl" />
          <p className="font-serif text-xl font-semibold leading-relaxed text-ink/85">
            “…and your grandfather walked the whole way home in the rain, just so he
            could say he&apos;d done it.”
          </p>
          {/* Sound-wave / porch-railing motif (brief §5). */}
          <div
            className="mt-7 flex h-12 items-end gap-1"
            aria-hidden
          >
            {[5, 9, 14, 8, 18, 24, 16, 28, 20, 12, 22, 10, 16, 7, 4].map((h, i) => (
              <span
                key={i}
                className="w-1.5 rounded-full bg-gradient-to-t from-brand to-sky2"
                style={{ height: `${h * 4}%` }}
              />
            ))}
          </div>
          <div className="mt-3 text-sm font-semibold text-ink/65">
            Margaret, 78 — recorded on a Sunday afternoon
          </div>
        </div>
      </div>
    </Section>
  );
}

// --- What you get ----------------------------------------------------------

const KEEPSAKE: { icon: string; title: string; body: string }[] = [
  {
    icon: "🔊",
    title: "Every story, in their voice",
    body: "Listen back any time to the real recordings — gathered into one warm, private collection.",
  },
  {
    icon: "📖",
    title: "A book you can hear",
    body: "A beautifully laid-out digital book (PDF) of their stories, with voice QR codes — scan a page, hear the story.",
  },
  {
    icon: "👪",
    title: "Shared with the whole family",
    body: "Invite siblings, kids, and grandkids to read and listen together. One porch, the whole family on it.",
  },
  {
    icon: "📦",
    title: "Yours to keep, forever",
    body: "Download everything — every recording, transcript, and the book — in one click, any time. It’s your family’s, not ours.",
  },
];

function WhatYouGet() {
  return (
    <Section id="what-you-get" className="bg-surface2/50">
      <div className="mx-auto max-w-2xl text-center">
        <span className="chip bg-brand/10 text-brand">What you get</span>
        <h2 className="mt-4 font-serif text-3xl font-semibold sm:text-4xl">
          A keepsake, not just a recording.
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-ink/65">
          {/* TODO: confirm final keepsake format with owner (brief §13). */}
          Their stories come back to you in the ways your family will actually use.
        </p>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {KEEPSAKE.map((k) => (
          <div key={k.title} className="card flex flex-col p-6">
            <div className="text-3xl" aria-hidden>
              {k.icon}
            </div>
            <h3 className="mt-4 font-serif text-lg font-semibold">{k.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink/65">{k.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

// --- Social proof ----------------------------------------------------------
// TODO: replace with real testimonials (name + relationship + photo) — brief §13.

const TESTIMONIALS: { quote: string; name: string; relation: string }[] = [
  {
    quote:
      "I set it up for my dad in five minutes. Now I have hours of him telling stories I’d never heard — in his voice. I’ll have that forever.",
    name: "Dana R.",
    relation: "Daughter, set it up for her father",
  },
  {
    quote:
      "My mom isn’t techy at all, but she just answers the phone and talks. The grandkids love hearing her tell it herself.",
    name: "Marcus T.",
    relation: "Son, recording his mother’s stories",
  },
  {
    quote:
      "We gave it to Grandma for her birthday. It turned into the best gift our whole family has ever shared.",
    name: "The Alvarez family",
    relation: "A gift for their grandmother",
  },
];

function SocialProof() {
  return (
    <Section id="stories">
      <div className="mx-auto max-w-2xl text-center">
        <span className="chip bg-accent/10 text-accent">Stories</span>
        <h2 className="mt-4 font-serif text-3xl font-semibold sm:text-4xl">
          Families are already keeping their stories.
        </h2>
      </div>
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <figure key={t.name} className="card flex flex-col p-7">
            <blockquote className="flex-1 leading-relaxed text-ink/80">
              “{t.quote}”
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <span
                aria-hidden
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand/20 to-sky2/20 font-serif text-lg font-semibold text-brand"
              >
                {t.name.charAt(0)}
              </span>
              <span>
                <span className="block font-semibold">{t.name}</span>
                <span className="block text-sm text-ink/65">{t.relation}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}

// --- Pricing preview -------------------------------------------------------
// Compact teaser from lib/pricing (single source of truth). The full pricing
// page (/pricing) is the destination; richer matrix/add-ons live there (8.3).

function PricingCard({ tier }: { tier: PricingTier }) {
  const highlighted = tier.recommended;
  return (
    <div
      className={[
        "card relative flex flex-col p-7",
        highlighted ? "ring-2 ring-brand shadow-lg" : "",
      ].join(" ")}
    >
      {highlighted && (
        <span className="chip absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white shadow-sm">
          Most popular
        </span>
      )}
      <h3 className="font-serif text-xl font-semibold">{tier.name}</h3>
      <p className="mt-1 text-sm text-ink/65">{tier.tagline}</p>
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="font-serif text-3xl font-semibold tracking-tight">
          {formatPrice(tier.price)}
        </span>
        <span className="text-sm font-medium text-ink/65">/ year</span>
      </div>
      <Link
        href="/pricing"
        className={[
          "mt-6 w-full px-6 py-3 text-base",
          highlighted ? "btn-primary" : "btn-ghost",
        ].join(" ")}
      >
        {tier.cta}
      </Link>
    </div>
  );
}

function PricingPreview() {
  return (
    <Section className="bg-surface2/50">
      <div className="mx-auto max-w-2xl text-center">
        <span className="chip bg-brand/10 text-brand">Pricing</span>
        <h2 className="mt-4 font-serif text-3xl font-semibold sm:text-4xl">
          Simple plans. Keep everything, forever.
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-ink/65">
          Cancel any time — your stories, recordings, and book are always yours to
          download and keep.
        </p>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-3 sm:items-stretch">
        {TIERS.map((tier) => (
          <PricingCard key={tier.id} tier={tier} />
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link href="/pricing" className="link text-base">
          See full pricing, the Lifetime option &amp; add-ons →
        </Link>
      </div>
    </Section>
  );
}

// --- FAQ -------------------------------------------------------------------
// Native <details> accordion — accessible, keyboard-friendly, zero JS.

function Faq() {
  return (
    <Section id="faq">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <span className="chip bg-accent/10 text-accent">FAQ</span>
          <h2 className="mt-4 font-serif text-3xl font-semibold sm:text-4xl">
            Questions families ask.
          </h2>
        </div>
        <div className="mt-10 space-y-3">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="card group p-0 [&_summary]:list-none"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 font-semibold">
                {item.q}
                <span
                  aria-hidden
                  className="shrink-0 text-xl text-brand transition group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="px-6 pb-5 leading-relaxed text-ink/70">{item.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-8 text-center">
          <Link href="/faq" className="font-semibold text-accent underline">
            Read the full FAQ →
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
          {/* porch-light glow */}
          <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 -translate-y-1/3 rounded-full bg-gradient-to-b from-[#FCD34D]/35 to-transparent blur-3xl" />
          <div className="relative">
            <h2 className="mx-auto max-w-xl font-serif text-3xl font-semibold leading-tight sm:text-4xl">
              The stories are still here. Start with one question.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-white/70">
              It takes a few minutes to set up, and there&apos;s no better day than
              today to begin.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={PRIMARY_CTA.href}
                className="btn-primary px-7 py-3.5 text-base"
              >
                {PRIMARY_CTA.label}
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
