import { Section } from "../_components/Section";
import { PRIMARY_CTA } from "../_components/nav";
import {
  PageIntro,
  SectionHead,
  Lede,
  NumberedRows,
  Rows,
  Checks,
  PullQuote,
  MoreLink,
  ClosingBand,
} from "../_components/Editorial";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "How it works",
  description:
    "How My Family Porch works: set it up for a loved one in minutes, they answer gentle voice prompts over a normal phone, and their stories become a keepsake your whole family can hear and keep forever.",
  path: "/how-it-works",
});

// Dedicated /how-it-works page (Phase 8.6) — the expanded version of the home
// section (brief §4). Server-rendered, static, no JS island. Porchlight layout
// from the shared editorial blocks. The home anchor /#how-it-works still
// scrolls within the landing page; this page is the longer-form walkthrough the
// header nav now points to.

export default function HowItWorksPage() {
  return (
    <>
      <Intro />
      <Steps />
      <WhatMakesItGentle />
      <WhatYouGet />
      <Privacy />
      <FinalCta />
    </>
  );
}

// --- Intro -----------------------------------------------------------------

function Intro() {
  return (
    <PageIntro
      label="How it works"
      title="You do the easy setup. They just talk."
      actions={[PRIMARY_CTA, { href: "/pricing", label: "See pricing" }]}
      photo={{
        name: "phone",
        alt: "An older woman's hands holding a simple phone at a worn kitchen table in low golden light, a cup of coffee beside her.",
        caption: "A normal phone. Nothing to install.",
      }}
    >
      My Family Porch turns the conversation you keep meaning to have into
      something that actually happens — and lasts. Here&apos;s exactly how it
      goes, from the day you set it up to the keepsake your family keeps.
    </PageIntro>
  );
}

// --- The three steps, expanded ---------------------------------------------
// TODO: confirm prompt cadence with owner (brief §13) — copy stays vague ("every
// so often", "later") until the real weekly/biweekly cadence is locked.

const STEPS: { n: string; title: string; lead: string; detail: string }[] = [
  {
    n: "1",
    title: "Set it up for your loved one — in minutes",
    lead: "Add the person whose stories you want to keep, and choose the topics you'd love to hear about.",
    detail:
      "You pick what matters to your family — childhood, how they met, the years nobody talks about anymore — or let our guided library lead the way. There's nothing for your loved one to install or sign up for. You do this part once, from your phone or computer.",
  },
  {
    n: "2",
    title: "They get a gentle prompt — and simply answer",
    lead: "Every so often a warm, one-at-a-time question arrives. They answer out loud, in their own time.",
    detail:
      "The prompts are designed to feel like a grandchild asking, not a form to fill out. There's no app to learn, no screen to figure out, no timer counting down — it works over a normal phone. If they're not in the mood today, that's fine; the next gentle nudge comes around later.",
  },
  {
    n: "3",
    title: "Their voice becomes a keepsake you keep forever",
    lead: "Each answer is transcribed and saved into a growing collection of stories — in their actual voice.",
    detail:
      "Stories gather automatically into a private, beautifully laid-out collection your whole family can listen to and read. Over weeks and months it grows into a real keepsake — a book you can hear, with voice QR codes — that's yours to download and keep, whatever happens next.",
  },
];

function Steps() {
  return (
    <Section>
      <SectionHead label="Start to keepsake" title="Three steps, start to keepsake.">
        <Lede>
          The hard part — remembering to ask, and saving it before it&apos;s gone
          — is the part we handle.
        </Lede>
      </SectionHead>
      <NumberedRows
        items={STEPS.map((s) => ({
          n: s.n,
          title: s.title,
          body: (
            <>
              <p className="text-lg text-ink">{s.lead}</p>
              <p>{s.detail}</p>
            </>
          ),
        }))}
      />
    </Section>
  );
}

// --- What makes it gentle --------------------------------------------------

const GENTLE: { title: string; body: string }[] = [
  {
    title: "No app to learn",
    body: "It works over a normal phone. Nothing to download, no password to remember — they answer a prompt out loud, and that's the whole experience.",
  },
  {
    title: "Unhurried, never pushy",
    body: "Prompts arrive gently, one at a time. There's no timer, no scolding, no dead-end if they miss one — the next warm nudge simply comes around again.",
  },
  {
    title: "It's their actual voice",
    body: "We keep the real recording — the pauses, the laugh, the way they say your name — not just a transcript. That's the part you'll treasure most.",
  },
];

function WhatMakesItGentle() {
  return (
    <Section className="bg-surface2">
      <SectionHead label="Built for elders" title="Gentle enough for the least techy person you love.">
        <Lede>
          The whole experience is designed around the person answering — large,
          calm, forgiving, and voice-first.
        </Lede>
      </SectionHead>
      <Rows items={GENTLE} />
    </Section>
  );
}

// --- What you get (recap, links to home detail) ----------------------------

function WhatYouGet() {
  return (
    <Section>
      <div className="grid gap-14 lg:grid-cols-[36rem_1fr] lg:gap-20">
        <div>
          <p className="eyebrow rise mb-5">From the book</p>
          <PullQuote
            quote={<>“We didn&apos;t have much, but we had that porch, and on summer nights the whole street would end up on it.”</>}
            cite="Scan the page, hear them tell it"
          />
        </div>
        <div className="rise">
          <p className="marginalia">What you get</p>
          <h2 className="display display-md mt-4">A keepsake, not just a pile of recordings.</h2>
          <p className="mt-6 text-ink/85">
            {/* TODO: confirm final keepsake format with owner (brief §13). */}
            Their stories come back to you in the ways your family will actually
            use — to listen, to read, to share, and to keep.
          </p>
          <Checks
            items={[
              "Every story in their voice, gathered into one private collection.",
              "A beautiful book you can hear — with voice QR codes on the page.",
              "Shared with the whole family: siblings, kids, and grandkids.",
              "Download everything, any time — it's yours, not ours.",
            ]}
          />
          <MoreLink href="/#what-you-get">See the keepsake in detail →</MoreLink>
        </div>
      </div>
    </Section>
  );
}

// --- Privacy reassurance ---------------------------------------------------

function Privacy() {
  return (
    <Section className="bg-surface2">
      <SectionHead label="Private by design" title="Your family&apos;s stories stay your family&apos;s." size="md">
        <Lede>
          Recordings are kept private and family-isolated — visible only to the
          family members you invite. They&apos;re never sold, and they&apos;re
          always yours to download and take with you.
        </Lede>
        <MoreLink href="/privacy">Read how recordings are protected →</MoreLink>
      </SectionHead>
    </Section>
  );
}

// --- Closing band ----------------------------------------------------------

function FinalCta() {
  return (
    <ClosingBand
      title="Ready when you are. So are their stories."
      actions={[PRIMARY_CTA, { href: "/faq", label: "Read the FAQ" }]}
    >
      Setup takes a few minutes, and the first question can go out today.
    </ClosingBand>
  );
}
