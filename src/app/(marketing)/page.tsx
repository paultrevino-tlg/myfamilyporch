import Link from "next/link";

// Public landing. TODO 5: full marketing site — this is the modern hero baseline.
export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-5 sm:px-7">
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-2.5 font-bold tracking-tight">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand to-sky2 text-xl shadow-sm">
            🏡
          </span>
          My Family Porch
        </div>
        <Link href="/login" className="btn-ghost">
          Sign in
        </Link>
      </header>

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
            <Link href="/login" className="btn-primary px-6 py-3 text-base">
              Get started
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

      <footer className="border-t border-line py-8 text-sm text-ink/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>© My Family Porch</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
