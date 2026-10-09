import {
  TIERS,
  GIFT,
  ADD_ONS,
  FEATURE_MATRIX,
  FAQ,
  PRICING_COPY,
  formatPrice,
  type FeatureMatrixRow,
} from "@/lib/pricing";
import { pageMeta } from "@/lib/seo";
import { pricingProductLd } from "@/lib/jsonld";
import { GIFT_HREF } from "../_components/nav";
import { JsonLd } from "../_components/JsonLd";
import { Section } from "../_components/Section";
import { PageIntro, SectionHead, Rows, FaqList, ClosingBand } from "../_components/Editorial";
import { PricingLedger, GiftBand } from "../_components/PricingLedger";

// Public pricing page (TODO 7.5). Renders entirely from src/lib/pricing.ts —
// the single source of truth shared with Phase 8.3 (marketing) and 9.1/9.2
// (Stripe). No Stripe here: CTAs route to /login until the signup funnel (8.5).
// Wrapped by the marketing shell (Phase 8.1) for nav/footer + SEO; laid out as
// Porchlight (ruled ledger, hairline rows, umber gift + closing bands).

export const metadata = pageMeta({
  title: "Pricing",
  description:
    "Capture an elder's life stories in their own voice. Simple yearly plans, a one-time prepaid gift, and a printed book with voice QR codes. Cancel anytime and keep everything, forever.",
  path: "/pricing",
});

const CTA_HREF = "/login"; // real Stripe Checkout signup is 8.5 / 9.2
// GIFT_HREF points at the dedicated /gift landing page (8.7, imported above).

function MatrixCell({ value }: { value: boolean | string }) {
  if (value === true)
    return (
      <span className="text-brand">
        <span aria-hidden>●</span>
        <span className="sr-only">Included</span>
      </span>
    );
  if (value === false)
    return (
      <span className="text-ink/55">
        <span aria-hidden>—</span>
        <span className="sr-only">Not included</span>
      </span>
    );
  return <span className="font-semibold">{value}</span>;
}

export default function PricingPage() {
  return (
    <>
      <JsonLd data={pricingProductLd()} />
      <PageIntro label="Pricing" title={PRICING_COPY.hero.h1}>
        {PRICING_COPY.hero.sub}
      </PageIntro>

      <Section className="pt-0">
        <PricingLedger ctaHref={CTA_HREF} />

        {/* Gift — the one-time path (replaced Lifetime). A separate band, not a
            4th tier, so it doesn't muddy the annual comparison. Gifting is also
            a primary use case (brief §4.7), so the band carries both the price
            and the emotional pitch. Routes to the /gift landing page (8.7); the
            gift checkout itself is wired in 9.7. */}
        <GiftBand as="h2" note="nothing to renew" heading={PRICING_COPY.giftCallout.h2} cta={{ href: GIFT_HREF, label: GIFT.cta }}>
          {PRICING_COPY.giftCallout.body}
        </GiftBand>
      </Section>

      {/* Conversion-lever callouts */}
      <Section className="bg-surface2">
        <Rows
          className=""
          items={[
            { title: PRICING_COPY.foreverCallout.h2, body: PRICING_COPY.foreverCallout.body },
            { title: PRICING_COPY.bookCallout.h2, body: PRICING_COPY.bookCallout.body },
          ]}
        />
      </Section>

      {/* À la carte add-ons */}
      <Section>
        <SectionHead label="Add-ons" title="Add to any plan" size="md">
          <p className="mt-4 text-ink/80">
            Order more copies or add another storyteller, any time.
          </p>
        </SectionHead>
        <div className="mt-12 border-t border-line">
          {ADD_ONS.map((a) => (
            <div key={a.id} className="rise flex items-baseline justify-between gap-6 border-b border-line py-6">
              <div>
                <h3 className="font-serif text-xl">{a.name}</h3>
                <p className="mt-1 text-[0.95rem] text-ink/75">{a.note}</p>
              </div>
              <div className="shrink-0 whitespace-nowrap font-serif text-2xl font-light">
                {formatPrice(a.price)}
                {a.unit && (
                  <span className="ml-1 font-sans text-[0.8rem] uppercase tracking-[0.14em] text-ink/70">
                    {a.unit}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-3xl text-[0.95rem] text-ink/75">{PRICING_COPY.bookGateNote}</p>
      </Section>

      {/* Feature comparison matrix. Scrolls sideways on phones with the
          feature column pinned, so each row stays labelled. */}
      <Section className="bg-surface2">
        <SectionHead label="Compare" title="Compare plans" size="md" />
        {/* relative: keeps the sr-only (absolute) cell labels inside the scroller. */}
        <div className="rise relative mt-12 overflow-x-auto border-t-2 border-ink">
          <table className="w-full min-w-[34rem] border-collapse text-[0.95rem]">
            <thead>
              <tr className="border-b border-ink/15 text-left">
                <th className="sticky left-0 bg-surface2 py-4 pr-4 font-bold">Feature</th>
                {TIERS.map((t) => (
                  <th key={t.id} className="px-4 py-4 text-center font-serif text-lg font-medium">
                    {t.name}
                    <div className="font-sans text-xs font-normal uppercase tracking-[0.14em] text-ink/70">
                      {formatPrice(t.price)}/yr
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_MATRIX.map((row: FeatureMatrixRow) => (
                <tr key={row.feature} className="border-b border-ink/15">
                  <td
                    className={[
                      "sticky left-0 bg-surface2 py-3.5 pr-4",
                      row.highlight ? "font-bold" : "text-ink/85",
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
      </Section>

      {/* FAQ */}
      <Section>
        <SectionHead label="FAQ" title="Questions" size="md" />
        <FaqList items={FAQ} />
      </Section>

      <ClosingBand
        title="Start with one question."
        actions={[{ href: CTA_HREF, label: "Get started" }]}
      >
        Set up in minutes. Your elder records by phone — no app, no fuss.
      </ClosingBand>
    </>
  );
}
