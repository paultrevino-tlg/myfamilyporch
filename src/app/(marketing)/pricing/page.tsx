import Link from "next/link";
import {
  TIERS,
  LIFETIME,
  ADD_ONS,
  FEATURE_MATRIX,
  FAQ,
  PRICING_COPY,
  formatPrice,
  type PricingTier,
  type FeatureMatrixRow,
} from "@/lib/pricing";
import { pageMeta } from "@/lib/seo";

// Public pricing page (TODO 7.5). Renders entirely from src/lib/pricing.ts —
// the single source of truth shared with Phase 8.3 (marketing) and 9.1/9.2
// (Stripe). No Stripe here: CTAs route to /login until the signup funnel (8.5).
// Wrapped by the marketing shell (Phase 8.1) for nav/footer + SEO.

export const metadata = pageMeta({
  title: "Pricing",
  description:
    "Capture an elder's life stories in their own voice. Simple yearly plans, a one-time Lifetime option, and a printed book with voice QR codes. Cancel anytime and keep everything, forever.",
  path: "/pricing",
});

const CTA_HREF = "/login"; // real Stripe Checkout signup is 8.5 / 9.2

function Check() {
  return (
    <span aria-hidden className="text-brand">
      ●
    </span>
  );
}

function MatrixCell({ value }: { value: boolean | string }) {
  if (value === true) return <Check />;
  if (value === false)
    return (
      <span aria-hidden className="text-ink/25">
        —
      </span>
    );
  return <span className="font-semibold">{value}</span>;
}

function TierCard({ tier }: { tier: PricingTier }) {
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
      <h3 className="font-serif text-2xl font-semibold">{tier.name}</h3>
      <p className="mt-1 text-sm text-ink/60">{tier.tagline}</p>
      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="font-serif text-4xl font-semibold tracking-tight">
          {formatPrice(tier.price)}
        </span>
        <span className="text-sm font-medium text-ink/55">/ year</span>
      </div>
      {tier.monthly != null && (
        <p className="mt-1 text-sm text-ink/55">
          or {formatPrice(tier.monthly)}/mo
        </p>
      )}
      <ul className="mt-6 flex flex-1 flex-col gap-2.5 text-sm">
        {tier.features.map((f) => (
          <li key={f} className="flex gap-2.5">
            <span aria-hidden className="mt-0.5 shrink-0 text-brand">
              ✓
            </span>
            <span className="text-ink/80">{f}</span>
          </li>
        ))}
      </ul>
      <Link
        href={CTA_HREF}
        className={[
          "mt-7 w-full px-6 py-3 text-base",
          highlighted ? "btn-primary" : "btn-ghost",
        ].join(" ")}
      >
        {tier.cta}
      </Link>
    </div>
  );
}

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-12 sm:px-7">
      {/* Hero */}
      <section className="mx-auto max-w-3xl py-12 text-center sm:py-16">
        <h1 className="font-serif text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          {PRICING_COPY.hero.h1}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink/65">
          {PRICING_COPY.hero.sub}
        </p>
      </section>

      {/* Tier cards */}
      <section className="grid gap-6 sm:grid-cols-3 sm:items-stretch">
        {TIERS.map((tier) => (
          <TierCard key={tier.id} tier={tier} />
        ))}
      </section>

      {/* Lifetime — separate band, not a 4th card */}
      <section className="card mt-10 flex flex-col items-start gap-5 p-7 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="font-serif text-2xl font-semibold">{LIFETIME.name}</h3>
            <span className="font-serif text-2xl font-semibold tracking-tight text-brand">
              {formatPrice(LIFETIME.price)}
            </span>
            <span className="text-sm font-medium text-ink/55">one-time</span>
          </div>
          <p className="mt-1 text-sm text-ink/60">{LIFETIME.tagline}</p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink/75">
            {LIFETIME.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span aria-hidden className="text-brand">
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <Link href={CTA_HREF} className="btn-ink shrink-0 px-6 py-3 text-base">
          {LIFETIME.cta}
        </Link>
      </section>

      {/* Conversion-lever callouts */}
      <section className="mt-12 grid gap-6 sm:grid-cols-2">
        <div className="card bg-surface2 p-7">
          <div className="text-2xl" aria-hidden>
            🔓
          </div>
          <h2 className="mt-3 font-serif text-2xl font-semibold">
            {PRICING_COPY.foreverCallout.h2}
          </h2>
          <p className="mt-3 leading-relaxed text-ink/70">
            {PRICING_COPY.foreverCallout.body}
          </p>
        </div>
        <div className="card bg-surface2 p-7">
          <div className="text-2xl" aria-hidden>
            🔊
          </div>
          <h2 className="mt-3 font-serif text-2xl font-semibold">
            {PRICING_COPY.bookCallout.h2}
          </h2>
          <p className="mt-3 leading-relaxed text-ink/70">
            {PRICING_COPY.bookCallout.body}
          </p>
        </div>
      </section>

      {/* À la carte add-ons */}
      <section className="mt-16">
        <h2 className="font-serif text-2xl font-semibold">Add to any plan</h2>
        <p className="mt-1 text-sm text-ink/60">
          Order more copies or add another storyteller, any time.
        </p>
        <div className="card mt-5 divide-y divide-line">
          {ADD_ONS.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-4 px-5 py-4"
            >
              <div>
                <div className="font-semibold">{a.name}</div>
                <div className="text-sm text-ink/55">{a.note}</div>
              </div>
              <div className="shrink-0 whitespace-nowrap font-serif text-lg font-semibold">
                {formatPrice(a.price)}
                {a.unit && (
                  <span className="ml-1 text-sm font-medium text-ink/55">
                    {a.unit}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature comparison matrix */}
      <section className="mt-16">
        <h2 className="font-serif text-2xl font-semibold">Compare plans</h2>
        <div className="card mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="px-5 py-4 font-semibold">Feature</th>
                {TIERS.map((t) => (
                  <th
                    key={t.id}
                    className="px-4 py-4 text-center font-semibold"
                  >
                    {t.name}
                    <div className="text-xs font-medium text-ink/55">
                      {formatPrice(t.price)}/yr
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_MATRIX.map((row: FeatureMatrixRow) => (
                <tr
                  key={row.feature}
                  className={[
                    "border-b border-line last:border-0",
                    row.highlight ? "bg-surface2" : "",
                  ].join(" ")}
                >
                  <td
                    className={[
                      "px-5 py-3.5",
                      row.highlight ? "font-semibold" : "text-ink/80",
                    ].join(" ")}
                  >
                    {row.feature}
                  </td>
                  {TIERS.map((t) => (
                    <td key={t.id} className="px-4 py-3.5 text-center">
                      <MatrixCell value={row.values[t.id]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-16">
        <h2 className="font-serif text-2xl font-semibold">Questions</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {FAQ.map((item) => (
            <div key={item.q} className="card p-6">
              <h3 className="font-semibold">{item.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mt-16 text-center">
        <h2 className="font-serif text-3xl font-semibold">
          Start with one question.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-ink/65">
          Set up in minutes. Your elder records by phone — no app, no fuss.
        </p>
        <Link
          href={CTA_HREF}
          className="btn-primary mt-7 inline-flex px-7 py-3.5 text-base"
        >
          Get started
        </Link>
      </section>
    </div>
  );
}
