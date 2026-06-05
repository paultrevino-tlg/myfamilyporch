import Link from "next/link";
import { Container } from "./_components/Container";
import { PRIMARY_CTA } from "./_components/nav";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "My Family Porch",
  description:
    "My Family Porch records a loved one's life stories through short, AI-guided voice interviews — gentle to use, and kept as a keepsake your whole family can hear.",
  path: "/",
});

// Public landing. The marketing shell (Phase 8.1) now provides the nav + footer;
// this page renders the hero only. Full landing sections (problem / how-it-works
// / why-voice / what-you-get / social proof / pricing / FAQ / final CTA) land in
// Phase 8.2 and fill the /#how-it-works · /#stories · /#faq anchor targets.
export default function Home() {
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
            <Link href="/login" className="btn-ghost px-6 py-3 text-base">
              I have an invite
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
            <p className="mt-2 text-sm text-ink/60">Take your time — there&apos;s no rush, and no wrong answer.</p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
            {[
              ["31", "stories"],
              ["12", "topics"],
              ["2", "voices"],
            ].map(([v, k]) => (
              <div key={k} className="rounded-xl border border-line bg-surface2 py-3">
                <div className="font-serif text-2xl font-semibold text-brand">{v}</div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">{k}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Container>
  );
}
