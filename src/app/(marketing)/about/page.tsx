import { Section } from "../_components/Section";
import { PRIMARY_CTA } from "../_components/nav";
import {
  PageIntro,
  SectionHead,
  Lede,
  Rows,
  PullQuote,
  MoreLink,
  ClosingBand,
} from "../_components/Editorial";
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
    <PageIntro
      label="Our story"
      title="The conversations worth keeping happen on the porch."
      photo={{
        name: "hands",
        alt: "A grandparent's hand resting over a grandchild's small hand on a weathered porch railing at dusk.",
        position: "60% 50%",
      }}
    >
      My Family Porch began with a familiar regret: the stories we always meant
      to ask about, and the people who took them with them. We built it so those
      conversations actually happen — and so they last.
    </PageIntro>
  );
}

// --- Why the porch ---------------------------------------------------------

function WhyThePorch() {
  return (
    <Section className="bg-surface2">
      <div className="grid gap-14 lg:grid-cols-[1fr_36rem] lg:gap-20">
        <div>
          <p className="eyebrow rise mb-5">An invitation, not an interview</p>
          <PullQuote
            quote="“Pull up a chair. Stay a while. Tell me about it.”"
            cite="Why the porch"
          />
        </div>
        <div className="rise">
          <h2 className="display display-md">Where the good stories always came out.</h2>
          <div className="mt-6 space-y-4 text-ink/85">
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
      </div>
    </Section>
  );
}

// --- Mission ---------------------------------------------------------------

function Mission() {
  return (
    <Section>
      <SectionHead label="Why we built it" title="Don&apos;t let the stories disappear.">
        <Lede>
          Phones are full of photos and short of voices. We can picture our
          grandparents, but the sound of them telling a story — the pause, the
          laugh, the way they said your name — fades first. My Family Porch exists
          to catch that part, gently, while there&apos;s still time, and to hand it
          back to your family in a form they&apos;ll actually keep.
        </Lede>
      </SectionHead>
    </Section>
  );
}

// --- Values ----------------------------------------------------------------

const VALUES: { title: string; body: string }[] = [
  {
    title: "Warm, never morbid",
    body: "This is a celebration, not a goodbye. Every prompt and page is designed to feel like a grandchild asking — heartfelt, never saccharine, never clinical.",
  },
  {
    title: "Private by default",
    body: "Recordings are family-isolated and visible only to the people you invite. They are never sold, and never used to train anything outside your family's keepsake.",
  },
  {
    title: "Yours to keep",
    body: "The stories belong to your family, not to us. You can download every recording, transcript, and the book at any time — even if you cancel.",
  },
];

function Values() {
  return (
    <Section className="bg-surface2">
      <SectionHead label="What we believe" title="A few things we won&apos;t compromise on." />
      <Rows items={VALUES} />
      <MoreLink href="/privacy">Read how we protect your recordings →</MoreLink>
    </Section>
  );
}

// --- Who we are ------------------------------------------------------------

function WhoWeAre() {
  return (
    <Section>
      <SectionHead label="Who we are" title="The people behind the porch." size="md">
        <Lede>
          My Family Porch is a service of Technology Leadership Group, LLC — a
          small team that believes the most important things a family owns are its
          stories. We&apos;re building the keepsake we wish we&apos;d started for
          our own families sooner.
        </Lede>
        <MoreLink href="/contact">Questions? Get in touch →</MoreLink>
      </SectionHead>
    </Section>
  );
}

// --- Closing band ----------------------------------------------------------

function FinalCta() {
  return (
    <ClosingBand
      title="There&apos;s a chair waiting. Start the conversation."
      actions={[PRIMARY_CTA, { href: "/how-it-works", label: "See how it works" }]}
    >
      It takes a few minutes to set up — and there&apos;s no better day to begin
      than today.
    </ClosingBand>
  );
}
