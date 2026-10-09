import Link from "next/link";
import type { ReactNode } from "react";
import { TIERS, GIFT, formatPrice, type PricingTier } from "@/lib/pricing";
import type { Action } from "./Editorial";

// Pricing as a ruled ledger, not cards (Porchlight), shared by the home
// preview and /pricing. Everything renders from lib/pricing, the single source
// of truth. `ctaHref` differs by page: the home preview points at /pricing, the
// pricing page at the signup entry.

function Tier({ tier, ctaHref }: { tier: PricingTier; ctaHref: string }) {
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
        <Link href={ctaHref} className="link mt-3 inline-block text-sm">
          {tier.cta} →
        </Link>
      </div>
    </div>
  );
}

export function PricingLedger({ ctaHref }: { ctaHref: string }) {
  return (
    <div className="mt-12 border-t-2 border-ink">
      {TIERS.map((tier) => (
        <Tier key={tier.id} tier={tier} ctaHref={ctaHref} />
      ))}
    </div>
  );
}

// The prepaid gift on an umber band — a separate band, not a fourth tier, so it
// doesn't muddy the annual comparison.
export function GiftBand({
  heading,
  as: Heading = "h3",
  note,
  children,
  cta,
}: {
  heading: ReactNode;
  as?: "h2" | "h3";
  // Extra words after the price in the label (pricing page: "nothing to renew").
  note?: string;
  children?: ReactNode;
  cta: Action;
}) {
  return (
    <div className="on-dark rise mt-12 grid items-center gap-x-12 gap-y-6 bg-ink p-[clamp(2rem,5vw,3.5rem)] text-cream md:grid-cols-[1fr_auto]">
      <div>
        <p className="eyebrow text-honey">
          {GIFT.name} · {formatPrice(GIFT.price)} one-time{note && ` · ${note}`}
        </p>
        <Heading className="mt-2.5 font-serif text-[clamp(1.35rem,1.2rem+0.6vw,1.8rem)] font-medium leading-tight">
          {heading}
        </Heading>
        {children && <div className="mt-2 max-w-[40rem] text-cream/75">{children}</div>}
        <p className="mt-2 max-w-[40rem] text-cream/75">{GIFT.features.join(" · ")}</p>
      </div>
      <Link
        href={cta.href}
        className="btn-line-cream justify-self-start px-7 py-3.5 font-serif text-base font-medium"
      >
        {cta.label}
      </Link>
    </div>
  );
}
