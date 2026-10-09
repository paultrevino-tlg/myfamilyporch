import Link from "next/link";
import { Section } from "../_components/Section";
import {
  PageIntro,
  SectionHead,
  Lede,
  NumberedRows,
  Rows,
  PullQuote,
  MoreLink,
  ClosingBand,
} from "../_components/Editorial";
import { pageMeta } from "@/lib/seo";
import { GIFT, formatPrice } from "@/lib/pricing";

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
    <PageIntro
      label="A gift that lasts"
      title="The gift that keeps their voice."
      actions={[
        { href: GIFT_BUY_HREF, label: "Give it as a gift" },
        { href: "/how-it-works", label: "See how it works" },
      ]}
      photo={{
        name: "gift",
        alt: "A hardcover book wrapped in kraft paper and twine on a weathered porch table beside a wicker chair, in late golden light.",
      }}
    >
      For the parent or grandparent who has everything, give something they
      can&apos;t buy: their own life stories, in their own voice, kept for the
      whole family. A birthday, Mother&apos;s or Father&apos;s Day, the holidays,
      a milestone anniversary — there&apos;s no wrong time to start.
    </PageIntro>
  );
}

// --- Why it's a meaningful gift --------------------------------------------

function WhyMeaningful() {
  return (
    <Section className="bg-surface2">
      <div className="grid gap-14 lg:grid-cols-[1fr_36rem] lg:gap-20">
        <div>
          <p className="eyebrow rise mb-5">Why it matters</p>
          <PullQuote
            quote={<>“I didn&apos;t know I needed to hear his voice again until I could.”</>}
            cite="A keepsake you can hear, not just hold"
          />
        </div>
        <div className="rise">
          <h2 className="display display-md">
            Not another thing. The one gift they&apos;ll want to leave behind.
          </h2>
          <div className="mt-6 space-y-4 text-ink/85">
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
      <SectionHead label="How gifting works" title="Simple to give. Effortless for them.">
        <Lede>You handle the setup; they just talk. The gentle part is the point.</Lede>
      </SectionHead>
      <NumberedRows items={GIFT_STEPS} />
    </Section>
  );
}

// --- Perfect for -----------------------------------------------------------

const OCCASIONS = [
  "Birthdays",
  "Mother's Day",
  "Father's Day",
  "The holidays",
  "Milestone anniversaries",
  "Just because",
];

// The occasions as a ruled list of serif lines, two columns from tablet up.
function PerfectFor() {
  return (
    <Section className="bg-surface2">
      <SectionHead label="When to give it" title="Perfect for the moments that matter." />
      <ul className="mt-12 grid border-t border-ink/15 sm:grid-cols-2 sm:gap-x-12">
        {OCCASIONS.map((o) => (
          <li
            key={o}
            className="rise border-b border-ink/15 py-5 font-serif text-[clamp(1.15rem,1rem+0.7vw,1.65rem)] font-light"
          >
            {o}
          </li>
        ))}
      </ul>
    </Section>
  );
}

// --- What they receive -----------------------------------------------------

const INCLUDED: { title: string; body: string }[] = [
  {
    title: "Their voice, preserved",
    body: "Every story is recorded — the pauses, the laugh, the way they say your name — and kept in their own voice.",
  },
  {
    title: "Written stories",
    body: "Each recording is transcribed into readable stories, organized by chapter, ready to revisit any time.",
  },
  {
    title: "Photos that belong with them",
    body: "Add family photos alongside the stories so the memory and the moment live together.",
  },
  {
    title: "A book you can hear",
    body: "A keepsake book with voice QR codes — scan a page and hear the story read in their own voice.",
  },
];

function WhatTheyReceive() {
  return (
    <Section>
      <SectionHead label="What's inside the gift" title="A keepsake the whole family keeps.">
        <Lede>
          {/* TODO: confirm keepsake format (brief §13). */}
          Far more than a card — a living archive plus a book they can hold.
        </Lede>
      </SectionHead>
      <Rows items={INCLUDED} />
      {/* Price stated here, not only on /pricing — a gift buyer arriving from a
          search or a shared link shouldn't have to leave to learn the number.
          Rendered from lib/pricing so it can't drift from the pricing page. */}
      <div className="rise mt-12 border-t-2 border-ink pt-8">
        <p className="font-serif text-[clamp(2rem,1.6rem+1.6vw,3rem)] font-light leading-none">
          {formatPrice(GIFT.price)}{" "}
          <small className="font-sans text-[0.8rem] font-normal uppercase tracking-[0.14em] text-ink/70">
            one-time · {GIFT.months} months + the printed book
          </small>
        </p>
        <p className="mt-3 text-ink/80">
          It never auto-renews, so you&apos;re not signing them up for anything.
        </p>
        <p className="mt-6">
          <Link href="/pricing" className="link text-base">
            Compare all plans →
          </Link>
        </p>
      </div>
    </Section>
  );
}

// --- Reassurance -----------------------------------------------------------

function Reassurance() {
  return (
    <Section className="bg-surface2">
      <SectionHead label="No tech worries" title="Made for the least techy person you love." size="md">
        <Lede>
          The person you&apos;re gifting it to doesn&apos;t need a smartphone, an
          app, or any setup of their own — just the ability to answer a text and
          talk. And the recordings stay private to your family: yours to keep,
          and never sold.
        </Lede>
        <MoreLink href="/privacy">Read how we protect your recordings →</MoreLink>
      </SectionHead>
    </Section>
  );
}

// --- Closing band ----------------------------------------------------------

function FinalCta() {
  return (
    <ClosingBand
      title="Give them a reason to tell the story."
      actions={[
        { href: GIFT_BUY_HREF, label: "Give it as a gift" },
        { href: "/pricing", label: "See pricing" },
      ]}
    >
      The best time to start was years ago. The next best time is today.
    </ClosingBand>
  );
}
