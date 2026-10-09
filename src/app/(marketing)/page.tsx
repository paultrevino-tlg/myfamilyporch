import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "./_components/Container";
import { Section } from "./_components/Section";
import { EmailCapture } from "./_components/EmailCapture";
import { Photo, type PhotoName } from "./_components/Photo";
import { PRIMARY_CTA, GIFT_HREF } from "./_components/nav";
import { JsonLd } from "./_components/JsonLd";
import { pageMeta } from "@/lib/seo";
import { organizationLd } from "@/lib/jsonld";
import { TIERS, GIFT, FAQ, formatPrice, type PricingTier } from "@/lib/pricing";

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

// --- Shared pieces ---------------------------------------------------------

// The editorial section head: a small margin label beside (desktop) or above
// (phone) a display line, set in the narrow measure on the right.
function SectionHead({
  label,
  title,
  size = "lg",
  children,
}: {
  label: string;
  title: ReactNode;
  size?: "lg" | "md";
  children?: ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_36rem] lg:gap-20">
      <p className="marginalia rise">{label}</p>
      <div className="rise">
        <h2 className={`display ${size === "lg" ? "display-lg" : "display-md"}`}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

// A full-bleed photographic plate between sections, with a quiet caption.
function Plate({
  name,
  alt,
  caption,
  position = "50% 50%",
}: {
  name: PhotoName;
  alt: string;
  caption: string;
  position?: string;
}) {
  return (
    <figure className="rise relative overflow-hidden">
      <Photo
        name={name}
        alt={alt}
        className="h-[clamp(20rem,58vh,40rem)] w-full object-cover"
        // Inline so each plate can frame its own subject in the crop.
        style={{ objectPosition: position }}
      />
      {/* Low scrim so the caption reads over bright parts of any photo. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[rgba(44,34,27,.7)] to-transparent"
      />
      <figcaption className="absolute bottom-5 left-6 text-[0.8rem] uppercase tracking-[0.16em] text-cream [text-shadow:0_1px_12px_rgba(44,34,27,.8)]">
        {caption}
      </figcaption>
    </figure>
  );
}

// Level-meter bars; heights in %, each bar on its own sway delay.
function Bars({ heights, className }: { heights: number[]; className: string }) {
  return (
    <span aria-hidden className={`vu flex items-end ${className}`}>
      {heights.map((h, i) => (
        <i
          key={i}
          className="block rounded-sm bg-brand"
          style={{ height: `${h}%`, animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </span>
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
      <ol className="mt-12 border-t border-line">
        {STEPS.map((s) => (
          <li
            key={s.n}
            className="rise grid grid-cols-[auto_1fr] gap-x-6 border-b border-line py-9 transition-[background-color,padding] duration-500 ease-porch hover:bg-surface2 hover:pl-5 lg:grid-cols-[6rem_1fr] lg:gap-x-10"
          >
            <span aria-hidden className="font-serif text-[clamp(2.5rem,2rem+2vw,4rem)] font-light leading-[0.8] text-brand">
              {s.n}
            </span>
            <div>
              <h3 className="font-serif text-[clamp(1.35rem,1.2rem+0.6vw,1.8rem)] font-medium leading-tight">
                {s.title}
              </h3>
              <p className="mt-2 max-w-[44rem] text-ink/80">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

// --- Why voice matters -----------------------------------------------------
// A pull quote on a paper band, with the sound-wave / porch-railing motif.

const WAVE = [6, 10, 15, 9, 19, 25, 17, 28, 21, 13, 23, 11, 16, 8, 5, 12, 20, 26, 14, 7];

function WhyVoice() {
  return (
    <Section className="bg-surface2">
      <div className="grid gap-14 lg:grid-cols-[36rem_1fr] lg:gap-20">
        <div className="rise">
          <p className="eyebrow">Why voice</p>
          <blockquote className="mt-5 max-w-[22ch] font-serif text-[clamp(1.7rem,1.1rem+2.6vw,3.4rem)] font-light italic leading-[1.16] tracking-[-0.015em]">
            “…and your grandfather walked the whole way home in the rain, just so he
            could say he&apos;d done it.”
          </blockquote>
          <Bars heights={WAVE.map((h) => h * 3.4)} className="mt-10 h-14 gap-1 opacity-75 [&>i]:w-[5px]" />
          <p className="mt-8 text-[0.85rem] uppercase tracking-[0.16em] text-brand">
            Margaret, 78 — recorded on a Sunday afternoon
          </p>
        </div>
        <div className="rise">
          <h2 className="display display-md">A transcript can&apos;t laugh. Their voice can.</h2>
          <p className="mt-6 text-ink/85">
            The way they pause, the catch in their throat at the good part, the way
            they say your name — that&apos;s the part you&apos;ll miss most. We keep
            the real recording, not just the words.
          </p>
          <ul className="mt-8">
            {[
              "It’s their actual voice — saved, not summarized.",
              "Nothing to learn: answer a prompt out loud, that’s it.",
              "Works for the least tech-comfortable elder in the family.",
            ].map((t) => (
              <li key={t} className="flex gap-4 border-t border-ink/15 py-3.5">
                <span aria-hidden className="flex-none text-brand">—</span>
                {t}
              </li>
            ))}
          </ul>
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
      <div className="mt-12 border-t border-line">
        {KEEPSAKE.map((k) => (
          <div
            key={k.title}
            className="rise grid gap-x-12 gap-y-3 border-b border-line py-9 transition-colors duration-500 ease-porch hover:bg-surface2 md:grid-cols-[1fr_1.35fr] md:items-start"
          >
            <h3 className="font-serif text-[clamp(1.35rem,1.2rem+0.6vw,1.8rem)] font-medium leading-tight">
              {k.title}
            </h3>
            <p className="text-ink/80">{k.body}</p>
          </div>
        ))}
      </div>
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

function Tier({ tier }: { tier: PricingTier }) {
  return (
    <div
      className={[
        "rise grid items-baseline gap-x-10 gap-y-4 border-b border-line py-9 transition-[background-color,padding] duration-500 ease-porch hover:bg-surface2 lg:grid-cols-[16rem_1fr_auto] lg:hover:pl-5",
        tier.recommended ? "bg-surface2 lg:pl-5" : "",
      ].join(" ")}
    >
      <div>
        {tier.recommended && (
          <span className="mb-1.5 block text-[0.7rem] uppercase tracking-[0.2em] text-brand">
            Most popular
          </span>
        )}
        <h3 className="font-serif text-[clamp(1.35rem,1.2rem+0.6vw,1.8rem)] font-medium leading-tight">
          {tier.name}
        </h3>
        <p className="text-[0.95rem] text-ink/70">{tier.tagline}</p>
      </div>
      <ul className="text-[0.98rem] text-ink/80">
        {tier.features.map((f) => (
          <li key={f} className="py-0.5">
            {f}
          </li>
        ))}
      </ul>
      <div className="lg:text-right">
        <div className="font-serif text-[clamp(2rem,1.6rem+1.6vw,3rem)] font-light leading-none">
          {formatPrice(tier.price)}{" "}
          <small className="font-sans text-[0.8rem] font-normal uppercase tracking-[0.14em] text-ink/70">
            / year
          </small>
        </div>
        {tier.monthly !== undefined && (
          <p className="mt-1 text-sm text-ink/70">or {formatPrice(tier.monthly)} / month</p>
        )}
        <Link href="/pricing" className="link mt-3 inline-block text-sm">
          {tier.cta} →
        </Link>
      </div>
    </div>
  );
}

function PricingPreview() {
  return (
    <Section>
      <SectionHead label="Pricing" title="Simple plans. Keep everything, forever.">
        <p className="lede mt-6 text-ink/85">
          Cancel any time — your stories, recordings, and book are always yours to
          download and keep.
        </p>
      </SectionHead>

      <div className="mt-12 border-t-2 border-ink">
        {TIERS.map((tier) => (
          <Tier key={tier.id} tier={tier} />
        ))}
      </div>

      <div className="on-dark rise mt-12 grid items-center gap-x-12 gap-y-6 bg-ink p-[clamp(2rem,5vw,3.5rem)] text-cream md:grid-cols-[1fr_auto]">
        <div>
          <p className="eyebrow text-honey">
            {GIFT.name} · {formatPrice(GIFT.price)} one-time
          </p>
          <h3 className="mt-2.5 font-serif text-[clamp(1.35rem,1.2rem+0.6vw,1.8rem)] font-medium leading-tight">
            {GIFT.tagline}
          </h3>
          <p className="mt-2 max-w-[40rem] text-cream/75">{GIFT.features.join(" · ")}</p>
        </div>
        <Link href={GIFT_HREF} className="btn-line-cream justify-self-start px-7 py-3.5 font-serif text-base font-medium">
          Give it as a gift
        </Link>
      </div>

      <p className="mt-10">
        <Link href="/pricing" className="link text-base">
          See full pricing, the gift option &amp; add-ons →
        </Link>
      </p>
    </Section>
  );
}

// --- FAQ -------------------------------------------------------------------
// Native <details> on hairline rows — accessible, keyboard-friendly, zero JS.

function Faq() {
  return (
    <Section id="faq" className="bg-surface2">
      <SectionHead label="FAQ" title="Questions families ask." />
      <div className="mt-12 border-t border-ink/15">
        {FAQ.map((item) => (
          <details key={item.q} className="group border-b border-ink/15 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-baseline gap-8 py-6 font-serif text-[clamp(1.1rem,1rem+0.5vw,1.4rem)] transition-colors duration-300 hover:text-brand">
              {item.q}
              <span
                aria-hidden
                className="ml-auto text-[1.4rem] text-brand transition-transform duration-500 ease-porch group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="max-w-[52rem] pb-7 text-ink/80">{item.a}</p>
          </details>
        ))}
      </div>
      <p className="mt-10">
        <Link href="/faq" className="link text-base">
          Read the full FAQ →
        </Link>
      </p>
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
// Porch motif (brief §5): a warm porch-light glow behind the umber band.

function Closing() {
  return (
    <section className="on-dark relative overflow-hidden bg-ink py-[clamp(4.5rem,9vh,8.5rem)] text-cream">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[30%] left-[12%] h-[44rem] w-[44rem] rounded-full bg-[radial-gradient(circle,rgba(217,150,47,.38),transparent_62%)] blur-[18px]"
      />
      <Container className="relative">
        <h2 className="display display-lg rise max-w-[16ch]">
          The stories are still here. Start with one question.
        </h2>
        <p className="lede rise mt-5 max-w-[34rem] text-cream/75">
          It takes a few minutes to set up, and there&apos;s no better day than
          today to begin.
        </p>
        <div className="rise mt-8 flex flex-wrap gap-3.5">
          <Link href={PRIMARY_CTA.href} className="btn-cream px-7 py-3.5 font-serif text-base font-medium">
            {PRIMARY_CTA.label}
          </Link>
          <Link href="/pricing" className="btn-line-cream px-7 py-3.5 font-serif text-base font-medium">
            See pricing
          </Link>
        </div>
      </Container>
    </section>
  );
}
