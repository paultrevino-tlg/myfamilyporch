import Link from "next/link";
import { Container } from "../_components/Container";
import { Section } from "../_components/Section";
import { PRIMARY_CTA } from "../_components/nav";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "How it works",
  description:
    "How My Family Porch works: set it up for a loved one in minutes, they answer gentle voice prompts over a normal phone, and their stories become a keepsake your whole family can hear and keep forever.",
  path: "/how-it-works",
});

// Dedicated /how-it-works page (Phase 8.6) — the expanded version of the home
// section (brief §4). Server-rendered, static, no JS island. Reuses the shell's
// Section/Container + the app brand tokens. The home anchor /#how-it-works still
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
    <Container>
      <section className="mx-auto max-w-2xl py-12 text-center sm:py-20">
        <span className="chip bg-brand/10 text-brand">How it works</span>
        <h1 className="mt-4 font-serif text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          You do the easy setup. They just talk.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink/65">
          My Family Porch turns the conversation you keep meaning to have into
          something that actually happens — and lasts. Here&apos;s exactly how it
          goes, from the day you set it up to the keepsake your family keeps.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href={PRIMARY_CTA.href} className="btn-primary px-6 py-3 text-base">
            {PRIMARY_CTA.label}
          </Link>
          <Link href="/pricing" className="btn-ghost px-6 py-3 text-base">
            See pricing
          </Link>
        </div>
      </section>
    </Container>
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
    <Section className="border-t border-line bg-surface2/50">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-serif text-3xl font-semibold sm:text-4xl">
          Three steps, start to keepsake.
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-ink/65">
          The hard part — remembering to ask, and saving it before it&apos;s gone
          — is the part we handle.
        </p>
      </div>
      <div className="mx-auto mt-14 max-w-3xl space-y-8">
        {STEPS.map((s) => (
          <div key={s.n} className="card flex flex-col gap-5 p-7 sm:flex-row sm:p-8">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-sky2 font-serif text-xl font-semibold text-white shadow-sm">
              {s.n}
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold sm:text-2xl">
                {s.title}
              </h3>
              <p className="mt-2 text-lg leading-relaxed text-ink/80">{s.lead}</p>
              <p className="mt-3 leading-relaxed text-ink/65">{s.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// --- What makes it gentle --------------------------------------------------

const GENTLE: { icon: string; title: string; body: string }[] = [
  {
    icon: "📞",
    title: "No app to learn",
    body: "It works over a normal phone. Nothing to download, no password to remember — they answer a prompt out loud, and that's the whole experience.",
  },
  {
    icon: "🌅",
    title: "Unhurried, never pushy",
    body: "Prompts arrive gently, one at a time. There's no timer, no scolding, no dead-end if they miss one — the next warm nudge simply comes around again.",
  },
  {
    icon: "🔊",
    title: "It's their actual voice",
    body: "We keep the real recording — the pauses, the laugh, the way they say your name — not just a transcript. That's the part you'll treasure most.",
  },
];

function WhatMakesItGentle() {
  return (
    <Section>
      <div className="mx-auto max-w-2xl text-center">
        <span className="chip bg-accent/10 text-accent">Built for elders</span>
        <h2 className="mt-4 font-serif text-3xl font-semibold sm:text-4xl">
          Gentle enough for the least techy person you love.
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-ink/65">
          The whole experience is designed around the person answering — large,
          calm, forgiving, and voice-first.
        </p>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {GENTLE.map((g) => (
          <div key={g.title} className="card flex flex-col p-7">
            <div className="text-3xl" aria-hidden>
              {g.icon}
            </div>
            <h3 className="mt-4 font-serif text-lg font-semibold">{g.title}</h3>
            <p className="mt-2 leading-relaxed text-ink/65">{g.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

// --- What you get (recap, links to home detail) ----------------------------

function WhatYouGet() {
  return (
    <Section className="bg-surface2/50">
      <div className="grid items-center gap-10 sm:grid-cols-2">
        <div>
          <span className="chip bg-brand/10 text-brand">What you get</span>
          <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
            A keepsake, not just a pile of recordings.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink/65">
            {/* TODO: confirm final keepsake format with owner (brief §13). */}
            Their stories come back to you in the ways your family will actually
            use — to listen, to read, to share, and to keep.
          </p>
          <ul className="mt-6 space-y-3 text-ink/75">
            {[
              "Every story in their voice, gathered into one private collection.",
              "A beautiful book you can hear — with voice QR codes on the page.",
              "Shared with the whole family: siblings, kids, and grandkids.",
              "Download everything, any time — it's yours, not ours.",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <span aria-hidden className="mt-1 shrink-0 text-brand">
                  ✓
                </span>
                <span className="leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>
          <p className="mt-7">
            <Link href="/#what-you-get" className="link text-base">
              See the keepsake in detail →
            </Link>
          </p>
        </div>

        <div className="card relative overflow-hidden p-8 shadow-lg">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-gradient-to-br from-brand/15 to-sky2/15 blur-2xl" />
          <div className="text-xs font-bold uppercase tracking-widest text-accent">
            From the book
          </div>
          <p className="mt-3 font-serif text-xl font-semibold leading-relaxed text-ink/85">
            “We didn&apos;t have much, but we had that porch, and on summer nights
            the whole street would end up on it.”
          </p>
          {/* Sound-wave / porch-railing motif (brief §5). */}
          <div className="mt-7 flex h-12 items-end gap-1" aria-hidden>
            {[4, 8, 13, 7, 17, 23, 15, 27, 19, 11, 21, 9, 15, 6, 4].map((h, i) => (
              <span
                key={i}
                className="w-1.5 rounded-full bg-gradient-to-t from-brand to-sky2"
                style={{ height: `${h * 4}%` }}
              />
            ))}
          </div>
          <div className="mt-3 text-sm font-semibold text-ink/65">
            Scan the page, hear them tell it.
          </div>
        </div>
      </div>
    </Section>
  );
}

// --- Privacy reassurance ---------------------------------------------------

function Privacy() {
  return (
    <Section>
      <div className="mx-auto max-w-2xl text-center">
        <span className="chip bg-accent/10 text-accent">Private by design</span>
        <h2 className="mt-4 font-serif text-3xl font-semibold sm:text-4xl">
          Your family&apos;s stories stay your family&apos;s.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-ink/65">
          Recordings are kept private and family-isolated — visible only to the
          family members you invite. They&apos;re never sold, and they&apos;re
          always yours to download and take with you.
        </p>
        <p className="mt-6">
          <Link href="/privacy" className="link text-base">
            Read how recordings are protected →
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
              Ready when you are. So are their stories.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-white/70">
              Setup takes a few minutes, and the first question can go out today.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={PRIMARY_CTA.href}
                className="btn-primary px-7 py-3.5 text-base"
              >
                {PRIMARY_CTA.label}
              </Link>
              <Link
                href="/faq"
                className="btn px-7 py-3.5 text-base text-white/90 ring-1 ring-white/25 hover:bg-white/10"
              >
                Read the FAQ
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
