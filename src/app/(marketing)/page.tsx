import Link from "next/link";
import { Container } from "./_components/Container";
import { Section } from "./_components/Section";
import { EmailCapture } from "./_components/EmailCapture";
import { Photo } from "./_components/Photo";
import {
  SectionHead,
  Plate,
  Bars,
  NumberedRows,
  Rows,
  Checks,
  PullQuote,
  FaqList,
  MoreLink,
  ClosingBand,
} from "./_components/Editorial";
import { PricingLedger, GiftBand } from "./_components/PricingLedger";
import { PRIMARY_CTA, GIFT_HREF } from "./_components/nav";
import { JsonLd } from "./_components/JsonLd";
import { pageMeta } from "@/lib/seo";
import { organizationLd } from "@/lib/jsonld";
import { GIFT, FAQ } from "@/lib/pricing";

export const metadata = pageMeta({
  title: "My Family Porch",
  description:
    "My Family Porch records a loved one's life stories through short, AI-guided voice interviews — gentle to use, and kept as a keepsake your whole family can hear.",
  path: "/",
});

// Public landing (Phase 8.2), laid out as Porchlight (design direction 1):
// warm photographic editorial — a full-bleed golden-hour hero, narrow measure,
// hairline rules, nothing floats. Sections: hero · the-problem-gently ·
// how-it-works · why-voice-matters · what-you-get · social proof · pricing
// preview · FAQ · not-ready · closing band. Section ids match nav.ts +
// SiteFooter anchors exactly (#how-it-works · #what-you-get · #stories · #faq)
// so no links dead-end. Server-rendered: the FAQ accordion is native <details>,
// the reveal-on-scroll is CSS-only (.rise). Pricing + FAQ copy is read from
// lib/pricing (single source of truth, shared w/ /pricing).

export default function Home() {
  return (
    <>
      <JsonLd data={organizationLd()} />
      <Hero />
      <Problem />
      <Plate
        name="storyteller"
        alt="An older man on a porch step in golden light, phone in hand, mid-story."
        caption="No app, no screens — they just talk"
        position="50% 35%"
      />
      <HowItWorks />
      <WhyVoice />
      <Plate
        name="book"
        alt="A printed hardcover book of family stories open on an oak table in late sun, voice QR codes in the margins."
        caption="A book you can hear — scan a page, hear the story"
      />
      <WhatYouGet />
      <SocialProof />
      <PricingPreview />
      <Faq />
      <NotReady />
      <Closing />
    </>
  );
}

// --- Hero ------------------------------------------------------------------
// Full-bleed golden hour; the header floats over it (HeaderShell), so the hero
// pulls up under the 4rem bar.

function Hero() {
  return (
    <>
      <div className="relative -mt-16">
        <div className="relative h-[min(94vh,54rem)] min-h-[36rem] overflow-hidden">
          <Photo
            name="porch"
            priority
            alt="Late afternoon sun across a weathered porch railing and an empty wicker rocking chair."
            className="breathe h-full w-full object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-[rgba(44,34,27,.82)] via-[rgba(44,34,27,.36)] to-[rgba(44,34,27,.12)]"
          />
        </div>
        <div className="on-dark absolute inset-x-0 bottom-[clamp(2.5rem,7vh,5.5rem)] text-cream">
          <Container>
            {/* Pale honey: plain honey is ~3.5:1 over the photo, too faint for 12px. */}
            <p className="eyebrow text-[#F0C27A]">For families</p>
            <h1 className="display display-xl mb-5 mt-3 max-w-[15ch]">
              Their stories, in their own voice.
            </h1>
            <p className="lede max-w-xl text-cream/90">
              My Family Porch records a loved one&apos;s life stories through short,
              AI-guided voice interviews — gentle to use, and kept as a keepsake your
              whole family can hear.
            </p>
            <div className="mt-8 flex flex-wrap gap-3.5">
              <Link href={PRIMARY_CTA.href} className="btn-cream px-7 py-3.5 font-serif text-base font-medium">
                {PRIMARY_CTA.label}
              </Link>
              <Link href="/#how-it-works" className="btn-line-cream px-7 py-3.5 font-serif text-base font-medium">
                See how it works
              </Link>
            </div>
          </Container>
        </div>
      </div>

      {/* The listening slip: overlaps the photograph, offset right. */}
      <Container>
        <div className="rise relative z-[5] -mt-10 w-full border-t-[3px] border-brand bg-paper px-7 pb-6 pt-7 sm:ml-auto sm:-mt-28 sm:w-[30rem] sm:px-8 sm:pt-8">
          <p className="eyebrow">A question for you</p>
          <p className="mb-4 mt-2 font-serif text-[1.6rem] leading-tight">What was your first home like?</p>
          <p className="flex items-center gap-3 text-[0.95rem] font-bold text-brand">
            <Bars heights={[35, 70, 45, 90, 55]} className="h-[1.1rem] gap-[3px] [&>i]:w-[3px]" />
            Listening…
          </p>
          <p className="mt-2 text-[0.95rem] text-ink/70">
            Take your time — there&apos;s no rush, and no wrong answer.
          </p>
          <div className="mt-6 flex border-t border-line pt-4">
            {[
              ["31", "stories"],
              ["12", "topics"],
              ["2", "voices"],
            ].map(([v, k]) => (
              <div key={k} className="flex-1 border-r border-line pr-4 last:border-r-0 [&:not(:first-child)]:pl-4">
                <b className="block font-serif text-[2.4rem] font-normal leading-none text-brand">{v}</b>
                <span className="text-[0.72rem] uppercase tracking-[0.18em] text-ink/70">{k}</span>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </>
  );
}

// --- The problem, gently ---------------------------------------------------

function Problem() {
  return (
    <Section>
      <SectionHead label="Why now" title="There are stories we always mean to ask about.">
        <p className="lede mt-7 text-ink/85">
          How they met. The house they grew up in. The job nobody talks about
          anymore. We tell ourselves we&apos;ll sit down and ask one day — and then
          the chance quietly slips away. My Family Porch is that conversation, made
          easy enough to actually happen, and saved before it&apos;s gone.
        </p>
      </SectionHead>
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
    <Section id="how-it-works">
      <SectionHead label="How it works" title="Three simple steps.">
        <p className="lede mt-6 text-ink/85">
          You do the easy setup. They just answer the phone. We keep the stories.
        </p>
      </SectionHead>
      <NumberedRows items={STEPS} />
    </Section>
  );
}

// --- Why voice matters -----------------------------------------------------
// A pull quote on a paper band, with the sound-wave / porch-railing motif.

function WhyVoice() {
  return (
    <Section className="bg-surface2">
      <div className="grid gap-14 lg:grid-cols-[36rem_1fr] lg:gap-20">
        <div>
          <p className="eyebrow rise mb-5">Why voice</p>
          <PullQuote
            quote={<>“…and your grandfather walked the whole way home in the rain, just so he could say he&apos;d done it.”</>}
            cite="Margaret, 78 — recorded on a Sunday afternoon"
          />
        </div>
        <div className="rise">
          <h2 className="display display-md">A transcript can&apos;t laugh. Their voice can.</h2>
          <p className="mt-6 text-ink/85">
            The way they pause, the catch in their throat at the good part, the way
            they say your name — that&apos;s the part you&apos;ll miss most. We keep
            the real recording, not just the words.
          </p>
          <Checks
            items={[
              "It’s their actual voice — saved, not summarized.",
              "Nothing to learn: answer a prompt out loud, that’s it.",
              "Works for the least tech-comfortable elder in the family.",
            ]}
          />
        </div>
      </div>
    </Section>
  );
}

// --- What you get ----------------------------------------------------------
// Asymmetric editorial pairs on hairline rows — not a card grid.

const KEEPSAKE: { title: string; body: string }[] = [
  {
    title: "Every story, in their voice",
    body: "Listen back any time to the real recordings — gathered into one warm, private collection.",
  },
  {
    title: "A book you can hear",
    body: "A beautifully laid-out digital book (PDF) of their stories, with voice QR codes — scan a page, hear the story.",
  },
  {
    title: "Shared with the whole family",
    body: "Invite siblings, kids, and grandkids to read and listen together. One porch, the whole family on it.",
  },
  {
    title: "Yours to keep, forever",
    body: "Download everything — every recording, transcript, and the book — in one click, any time. It’s your family’s, not ours.",
  },
];

function WhatYouGet() {
  return (
    <Section id="what-you-get">
      {/* TODO: confirm final keepsake format with owner (brief §13). */}
      <SectionHead label="What you get" title="A keepsake, not just a recording.">
        <p className="lede mt-6 text-ink/85">
          Their stories come back to you in the ways your family will actually use.
        </p>
      </SectionHead>
      <Rows items={KEEPSAKE} />
    </Section>
  );
}

// --- Social proof ----------------------------------------------------------
// Staggered quotes on a paper band, no cards.
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
    <Section id="stories" className="bg-surface2">
      <SectionHead label="Stories" title="Families are already keeping their stories." />
      <div className="mt-12 grid gap-14 lg:grid-cols-3 lg:gap-12">
        {TESTIMONIALS.map((t, i) => (
          <figure key={t.name} className={`rise ${["", "lg:mt-16", "lg:mt-32"][i]}`}>
            <blockquote className="border-l-2 border-brand pl-6 font-serif text-[1.3rem] font-light leading-snug">
              “{t.quote}”
            </blockquote>
            <figcaption className="mt-5 pl-6 text-[0.9rem]">
              <b className="block">{t.name}</b>
              <span className="text-ink/70">{t.relation}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}

// --- Pricing preview -------------------------------------------------------
// A ruled ledger, not cards, read from lib/pricing. The full pricing page
// (/pricing) is the destination; the gift sits on an umber band below.

function PricingPreview() {
  return (
    <Section>
      <SectionHead label="Pricing" title="Simple plans. Keep everything, forever.">
        <p className="lede mt-6 text-ink/85">
          Cancel any time — your stories, recordings, and book are always yours to
          download and keep.
        </p>
      </SectionHead>

      <PricingLedger ctaHref="/pricing" />
      <GiftBand heading={GIFT.tagline} cta={{ href: GIFT_HREF, label: "Give it as a gift" }} />

      <MoreLink href="/pricing">See full pricing, the gift option &amp; add-ons →</MoreLink>
    </Section>
  );
}

// --- FAQ -------------------------------------------------------------------
// Native <details> on hairline rows — accessible, keyboard-friendly, zero JS.

function Faq() {
  return (
    <Section id="faq" className="bg-surface2">
      <SectionHead label="FAQ" title="Questions families ask." />
      <FaqList items={FAQ} />
      <MoreLink href="/faq">Read the full FAQ →</MoreLink>
    </Section>
  );
}

// --- Not ready yet? (email capture) ----------------------------------------
// For visitors who aren't ready to start (brief §6/§7). The only place the
// email-capture island lives. The island hydrates client-side; the page itself
// stays statically prerendered.

function NotReady() {
  return (
    <Section>
      <SectionHead label="No pressure" title="Not ready yet? Stay on the porch with us." size="md">
        <p className="lede mt-5 text-ink/85">
          Leave your name and email and we&apos;ll send a gentle note when the time
          feels right. No spam, ever.
        </p>
        <div className="mt-8 [&>*]:mx-0">
          <EmailCapture />
        </div>
      </SectionHead>
    </Section>
  );
}

// --- Closing band ----------------------------------------------------------

function Closing() {
  return (
    <ClosingBand
      title="The stories are still here. Start with one question."
      actions={[PRIMARY_CTA, { href: "/pricing", label: "See pricing" }]}
    >
      It takes a few minutes to set up, and there&apos;s no better day than today
      to begin.
    </ClosingBand>
  );
}
