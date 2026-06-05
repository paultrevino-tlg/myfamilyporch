import Link from "next/link";
import { Container } from "../_components/Container";
import { Section } from "../_components/Section";
import { PRIMARY_CTA } from "../_components/nav";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Our story",
  description:
    "Why we built My Family Porch — and why the porch. The stories we always mean to ask about, the comfort of an unhurried conversation, and a promise to keep your family's recordings private and yours forever.",
  path: "/about",
});

// Dedicated brand-story page (Phase 8.6) — "/about" rather than "/stories"
// because the home /#stories anchor already names the testimonials section
// (brief §4). Server-rendered, static, no JS island. The emotional core (brief
// §1, §5): warmth, legacy, "don't let the stories disappear," the front porch.

export default function AboutPage() {
  return (
    <>
      <Intro />
      <WhyThePorch />
      <Mission />
      <Values />
      <WhoWeAre />
      <FinalCta />
    </>
  );
}

// --- Intro -----------------------------------------------------------------

function Intro() {
  return (
    <Container>
      <section className="mx-auto max-w-2xl py-12 text-center sm:py-20">
        <span className="chip bg-accent/10 text-accent">Our story</span>
        <h1 className="mt-4 font-serif text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          The conversations worth keeping happen on the porch.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink/65">
          My Family Porch began with a familiar regret: the stories we always
          meant to ask about, and the people who took them with them. We built it
          so those conversations actually happen — and so they last.
        </p>
      </section>
    </Container>
  );
}

// --- Why the porch ---------------------------------------------------------

function WhyThePorch() {
  return (
    <Section className="border-t border-line bg-surface2/50">
      <div className="grid items-center gap-10 sm:grid-cols-2">
        <div>
          <span className="chip bg-brand/10 text-brand">Why the porch</span>
          <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
            Where the good stories always came out.
          </h2>
          <div className="mt-5 space-y-4 text-lg leading-relaxed text-ink/70">
            <p>
              Think about where you heard your family&apos;s best stories. Odds are
              it wasn&apos;t a formal sit-down. It was the porch at golden hour —
              somebody in a rocking chair, no rush, the conversation wandering until
              it landed somewhere you&apos;d never heard before.
            </p>
            <p>
              The porch is unhurried. It&apos;s where an offhand question turns into
              the story of how they met, the house they grew up in, the year that
              changed everything. We named ourselves after that feeling because it
              is exactly what we&apos;re trying to keep.
            </p>
          </div>
        </div>

        <div className="card relative overflow-hidden p-8 shadow-lg">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-gradient-to-br from-[#FCD34D]/25 to-accent/10 blur-2xl" />
          <p className="font-serif text-2xl font-semibold leading-relaxed text-ink/85">
            “Pull up a chair. Stay a while. Tell me about it.”
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
            An invitation, not an interview.
          </div>
        </div>
      </div>
    </Section>
  );
}

// --- Mission ---------------------------------------------------------------

function Mission() {
  return (
    <Section>
      <div className="mx-auto max-w-2xl text-center">
        <span className="chip bg-accent/10 text-accent">Why we built it</span>
        <h2 className="mt-4 font-serif text-3xl font-semibold sm:text-4xl">
          Don&apos;t let the stories disappear.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-ink/65">
          Phones are full of photos and short of voices. We can picture our
          grandparents, but the sound of them telling a story — the pause, the
          laugh, the way they said your name — fades first. My Family Porch exists
          to catch that part, gently, while there&apos;s still time, and to hand it
          back to your family in a form they&apos;ll actually keep.
        </p>
      </div>
    </Section>
  );
}

// --- Values ----------------------------------------------------------------

const VALUES: { icon: string; title: string; body: string }[] = [
  {
    icon: "🤍",
    title: "Warm, never morbid",
    body: "This is a celebration, not a goodbye. Every prompt and page is designed to feel like a grandchild asking — heartfelt, never saccharine, never clinical.",
  },
  {
    icon: "🔒",
    title: "Private by default",
    body: "Recordings are family-isolated and visible only to the people you invite. They are never sold, and never used to train anything outside your family's keepsake.",
  },
  {
    icon: "📦",
    title: "Yours to keep",
    body: "The stories belong to your family, not to us. You can download every recording, transcript, and the book at any time — even if you cancel.",
  },
];

function Values() {
  return (
    <Section className="bg-surface2/50">
      <div className="mx-auto max-w-2xl text-center">
        <span className="chip bg-brand/10 text-brand">What we believe</span>
        <h2 className="mt-4 font-serif text-3xl font-semibold sm:text-4xl">
          A few things we won&apos;t compromise on.
        </h2>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {VALUES.map((v) => (
          <div key={v.title} className="card flex flex-col p-7">
            <div className="text-3xl" aria-hidden>
              {v.icon}
            </div>
            <h3 className="mt-4 font-serif text-lg font-semibold">{v.title}</h3>
            <p className="mt-2 leading-relaxed text-ink/65">{v.body}</p>
          </div>
        ))}
      </div>
      <p className="mt-10 text-center">
        <Link href="/privacy" className="link text-base">
          Read how we protect your recordings →
        </Link>
      </p>
    </Section>
  );
}

// --- Who we are ------------------------------------------------------------

function WhoWeAre() {
  return (
    <Section>
      <div className="mx-auto max-w-2xl text-center">
        <span className="chip bg-accent/10 text-accent">Who we are</span>
        <h2 className="mt-4 font-serif text-3xl font-semibold sm:text-4xl">
          The people behind the porch.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-ink/65">
          My Family Porch is a service of Technology Leadership Group, LLC — a
          small team that believes the most important things a family owns are its
          stories. We&apos;re building the keepsake we wish we&apos;d started for
          our own families sooner.
        </p>
        <p className="mt-6">
          <Link href="/contact" className="link text-base">
            Questions? Get in touch →
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
              There&apos;s a chair waiting. Start the conversation.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-white/70">
              It takes a few minutes to set up — and there&apos;s no better day to
              begin than today.
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
