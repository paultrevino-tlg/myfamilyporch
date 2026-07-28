// Pricing — single source of truth (TODO 7.5).
//
// Every price/tier/add-on/feature shown on the public pricing page lives here so
// it is declared ONCE. Phase 8.3 (marketing pricing page) and Phase 9.1/9.2
// (Stripe products/prices + checkout) consume this module rather than
// re-declaring numbers — when Stripe is wired, attach the price IDs to the
// `stripePriceId` fields here instead of hardcoding prices a second time.
//
// v2 (2026-07-28) — repriced against a modelled per-storyteller COGS of ~$28/yr
// and a ~$36 landed hardcover (docs/PRICING.md §6). What changed and why:
//   - Book tier $149 → $189: the old +$50 upgrade bought a ~$36 book (28%
//     incremental margin) and undercut our own $79 à-la-carte hardcover.
//   - Book is included in the FIRST YEAR, not every year — a year-2 book costs
//     the same to print but carries one year of new stories. Reprints are an
//     add-on.
//   - Family $199 → $299, extra storyteller $89 → $79/yr: Family used to hand
//     over two storytellers for $50 that cost $178 à la carte and ~$56/yr to
//     serve. The ladder is now consistent ($189+$79+$79=$347 vs $299).
//   - Lifetime ($199 one-time) REMOVED. It broke even only after ~5.6 years of
//     an active storyteller, undercut two years of the book tier, and sold a
//     benefit we already give away free (forever access on cancel). The
//     one-time-purchase slot is now the prepaid GIFT below, which carries no
//     perpetual serving cost.
//   - Reprint $39 → $89 new-edition hardcover: $39 did not clear print COGS.
//   - Monthly $11 → $14, and printed books are gated behind annual or
//     PRINTED_BOOK_ELIGIBILITY paid months so one $14 charge can't extract a
//     $36 book. Exporting your own audio stays free and ungated — that promise
//     is untouched (docs/EXPORT_FEATURE.md).
//
// !!! STILL UNCONFIRMED: the print-on-demand quote. !!! Every book-bearing
// price above assumes ~$36 landed for a ~100pp color hardcover + shipping. Get a
// real POD quote before creating Stripe prices (docs/PRICING.md §6). Nothing
// here charges yet: CTAs route to /signup → /login, Stripe is Phase 9.

export const PRICING_UNCONFIRMED = true;

/** A Stripe price id, attached in Phase 9.1. Null until then. */
export type StripePriceId = string | null;

export type BillingPeriod = "year" | "one-time";

/**
 * Printed books ship on annual plans immediately; on the monthly plan only after
 * this many paid months. Guards the one real leak in "cancel anytime, keep
 * everything": a single $14 charge should not fund a ~$36 hardcover. Applies to
 * the à-la-carte copies too, not just a bundled book. Enforced at order time in
 * Phase 9.5 (entitlement gating) — this constant is the shared number.
 */
export const PRINTED_BOOK_ELIGIBILITY = { minPaidMonths: 6 } as const;

export interface PricingTier {
  id: "keepsake" | "keepsake_book" | "family";
  name: string;
  tagline: string;
  /** Whole-dollar annual price, USD. */
  price: number;
  period: BillingPeriod;
  /** Optional monthly equivalent (whole dollars), shown as a sub-line. */
  monthly?: number;
  /** Highlighted "Most popular" card. */
  recommended?: boolean;
  /** Card bullet list. */
  features: string[];
  cta: string;
  stripePriceId: StripePriceId;
  /** Stripe price id for the optional monthly plan, if offered. */
  stripeMonthlyPriceId?: StripePriceId;
}

/**
 * The one-time-purchase path. Prepaid and finite (12 months + a book) rather
 * than perpetual, so it carries no open-ended serving cost — see the v2 note at
 * the top for why Lifetime was retired in its place.
 */
export interface GiftOffer {
  id: "gift";
  name: string;
  tagline: string;
  price: number;
  period: BillingPeriod;
  /** Months of recording the prepaid price covers. */
  months: number;
  features: string[];
  cta: string;
  stripePriceId: StripePriceId;
}

export interface AddOn {
  id: string;
  name: string;
  /** Whole-dollar price, USD. */
  price: number;
  /** Suffix shown after the price, e.g. "/yr" or "one-time". */
  unit?: string;
  note: string;
  stripePriceId: StripePriceId;
}

export interface FeatureMatrixRow {
  feature: string;
  /** Cell value per tier id. `true` → ●, `false` → —, string → literal. */
  values: Record<PricingTier["id"], boolean | string>;
  /** Emphasize this row (the conversion-lever features). */
  highlight?: boolean;
}

export interface FaqItem {
  q: string;
  a: string;
  /** Shown in the short homepage FAQ teaser (a curated subset of the full page). */
  featured?: boolean;
}

export interface FaqGroup {
  category: string;
  items: FaqItem[];
}

// --- Tiers (docs/PRICING.md §2) -------------------------------------------

export const TIERS: PricingTier[] = [
  {
    id: "keepsake",
    name: "Keepsake",
    tagline: "Everything, kept forever.",
    price: 99,
    period: "year",
    monthly: 14,
    features: [
      "One storyteller",
      "Unlimited stories and recordings",
      "Full voice-nudge & scheduling experience",
      "Digital book (PDF) with bundled audio + voice QR codes",
      "Forever access on cancellation",
      "Printed book available as an add-on",
    ],
    cta: "Start recording",
    stripePriceId: null,
    stripeMonthlyPriceId: null,
  },
  {
    id: "keepsake_book",
    name: "Keepsake + Book",
    tagline: "The book with their voice in it.",
    price: 189,
    period: "year",
    recommended: true,
    features: [
      "Everything in Keepsake, plus:",
      "One printed hardcover color book, included in your first year",
      "Voice QR codes printed in the book",
      "New editions and extra copies any time at add-on prices",
    ],
    cta: "Get the book",
    stripePriceId: null,
  },
  {
    id: "family",
    name: "Family",
    tagline: "For the whole family.",
    price: 299,
    period: "year",
    features: [
      "Everything in Keepsake + Book, plus:",
      "Up to 3 storytellers", // cap is the margin guardrail, not a soft limit
      "Priority support",
    ],
    cta: "Set up the family",
    stripePriceId: null,
  },
];

// --- Gift (docs/PRICING.md §2) --------------------------------------------
// The one-time path, replacing Lifetime. Separate band, NOT a 4th tier column.
// Prepaid and finite: it never auto-renews, so a gift-giver is never signing
// their recipient up for a recurring charge — which is also what bounds our
// cost. Checkout + redeemable code is Phase 9.7.

const GIFT_MONTHS = 12;

export const GIFT: GiftOffer = {
  id: "gift",
  name: "The Gift",
  tagline: "One price, prepaid. Nothing to renew.",
  price: 199,
  period: "one-time",
  months: GIFT_MONTHS,
  features: [
    `${GIFT_MONTHS} months of recording, prepaid`,
    "One printed hardcover color book included",
    "Never auto-renews — no card left on file",
    "They keep every story, always",
  ],
  cta: "Give it as a gift",
  stripePriceId: null,
};

// --- À la carte add-ons (docs/PRICING.md §3) ------------------------------
// Every printed item here must clear the ~$36 landed hardcover assumption;
// re-check once the POD quote lands (PRICING §6).

export const ADD_ONS: AddOn[] = [
  {
    id: "copy_softcover",
    name: "Extra printed copy — softcover",
    price: 59,
    unit: "each",
    note: "Each adult child can have their own copy.",
    stripePriceId: null,
  },
  {
    id: "copy_hardcover",
    name: "Extra printed copy — hardcover",
    price: 79,
    unit: "each",
    note: "A keepsake-quality color hardcover.",
    stripePriceId: null,
  },
  {
    id: "extra_storyteller",
    name: "Additional storyteller",
    price: 79,
    unit: "/yr",
    note: "Add another elder to any annual plan.",
    stripePriceId: null,
  },
  {
    // Was a $39 "reprint fee" that read as a whole printed book below cost.
    // Now priced as what it ships: another hardcover, re-laid out.
    id: "new_edition",
    name: "New edition — hardcover",
    price: 89,
    unit: "each",
    note: "A fresh hardcover with another year of stories in it.",
    stripePriceId: null,
  },
];

// --- Feature comparison matrix (docs/PRICING.md §4) -----------------------

export const FEATURE_MATRIX: FeatureMatrixRow[] = [
  {
    feature: "Storytellers",
    values: { keepsake: "1", keepsake_book: "1", family: "up to 3" },
  },
  {
    feature: "Unlimited stories & recordings",
    values: { keepsake: true, keepsake_book: true, family: true },
  },
  {
    feature: "Voice nudges & smart scheduling",
    values: { keepsake: true, keepsake_book: true, family: true },
  },
  {
    feature: "Digital book (PDF)",
    values: { keepsake: true, keepsake_book: true, family: true },
  },
  {
    feature: "Voice QR codes",
    values: { keepsake: true, keepsake_book: true, family: true },
  },
  {
    feature: "Download everything (audio + transcripts + book, one click)",
    values: { keepsake: true, keepsake_book: true, family: true },
    highlight: true,
  },
  {
    feature: "Forever access on cancel",
    values: { keepsake: true, keepsake_book: true, family: true },
    highlight: true,
  },
  {
    feature: "Printed hardcover color book (first year)",
    values: { keepsake: false, keepsake_book: "1", family: "1" },
  },
  {
    feature: "Extra copies & new editions",
    values: { keepsake: "add-on", keepsake_book: "add-on", family: "add-on" },
  },
  {
    feature: "Priority support",
    values: { keepsake: false, keepsake_book: false, family: true },
  },
];

// --- Page copy (docs/PRICING.md §5) ---------------------------------------

export const PRICING_COPY = {
  hero: {
    h1: "Their stories, in their own voice — kept forever.",
    sub: "My Family Porch helps your family capture an elder's life stories by phone. No app to install. You keep everything, always.",
  },
  foreverCallout: {
    h2: "Cancel anytime. Keep everything, forever.",
    body: "Unlike other services, your stories, recordings, and book never get locked behind a paywall. Download all of it — every audio recording, transcript, and your book — any time, in one click. If you ever stop, it's still yours to keep.",
  },
  bookCallout: {
    h2: "A book you can actually hear.",
    body: "Every printed book includes voice QR codes — scan a page and hear the story in their own voice. No one else does this.",
  },
  giftCallout: {
    h2: "Giving it as a gift?",
    body: "My Family Porch is one of the most meaningful gifts you can give — for a birthday, Mother's or Father's Day, a holiday, or a milestone anniversary. Set it up for someone you love and we'll help their stories find their way home.",
    cta: "Give it as a gift",
  },
  // Footnote under the add-on table. States the one gate on the "keep
  // everything" promise: it limits printed books, never a family's own audio.
  bookGateNote:
    "Printed books ship right away on any yearly plan. On the monthly plan, they can be ordered after six months. Downloading your own recordings is always free, on every plan, from day one.",
} as const;

// Full FAQ, grouped by category — the single source of truth for the dedicated
// /faq page (8.4). The short homepage teaser (`FAQ` below) is derived from the
// `featured` items here so the two never drift. Privacy/security answers are
// kept consistent with /privacy and /terms.
export const FAQ_GROUPS: FaqGroup[] = [
  {
    category: "Getting started",
    items: [
      {
        q: "Does the storyteller need a smartphone or app?",
        a: "No. It works over a normal phone with SMS. There is nothing to install, no account for them to manage, and no password to remember.",
        featured: true,
      },
      {
        q: "How does an interview actually work?",
        a: "At a scheduled time we send a private link (or call). An AI guide asks a few warm, simple questions, and your elder just talks. Sessions are short — usually about 10–15 minutes — and they can stop and pick up again any time.",
      },
      {
        q: "Can more than one person record?",
        a: "Yes, on the Family plan, or add a storyteller to any annual plan.",
        featured: true,
      },
    ],
  },
  {
    category: "Privacy & security",
    items: [
      {
        q: "Who can hear the recordings?",
        a: "Only signed-in members of your family account, after an access check — and the storyteller, through their own private link. Recordings are kept in private storage and are never made public. We serve audio only over short-lived, signed links after that same check.",
      },
      {
        q: "Is my family's data separate from other families'?",
        a: "Yes. Every family's stories, recordings, and account are fully isolated. One family can never see, hear, or reach another family's content.",
      },
      {
        q: "Do you sell our data or recordings?",
        a: "Never. We do not sell your information or recordings, and we don't share them with third parties for their own marketing. The vendors that help us run the service (for example, to transcribe audio or send reminders) may only process data on our behalf, never for their own purposes.",
      },
      {
        q: "Is the cloned voice safe? Who controls it?",
        a: "A cloned voice is only created with your family's consent and is used solely to help guide your own family's interviews. It is never shared, sold, or used anywhere else.",
      },
    ],
  },
  {
    category: "Your keepsake",
    items: [
      {
        q: "What are the voice QR codes?",
        a: "Printed codes in the book that play the original recording when scanned, so you can hear the story in their own voice.",
        featured: true,
      },
      {
        q: "Can I download all the recordings?",
        a: "Yes — any time, on every plan. One click gives you a ZIP with every audio recording, the transcripts, and your book. If you ever cancel, it's all still yours to download and keep.",
        featured: true,
      },
      {
        q: "Can I order more printed copies?",
        a: "Yes, any time, softcover or hardcover.",
        featured: true,
      },
    ],
  },
  {
    category: "Billing & ownership",
    items: [
      {
        q: "What happens if I cancel?",
        a: "You keep all stories, audio, and your digital book. Nothing is deleted or locked.",
        featured: true,
      },
      {
        q: "Do I get a new printed book every year?",
        a: `Your first printed book is included with the Keepsake + Book and Family plans. After that you order a new edition whenever it's worth printing again — ${addOnPrice("new_edition")} for a fresh hardcover with another year of stories in it. Most families print one beautiful book, not one a year.`,
      },
      {
        q: "Is there a lifetime plan?",
        a: "You already have the part that matters. Every plan keeps your stories, recordings, and digital book forever — even after you cancel — so there's nothing to buy to make them permanent. If you'd rather pay once, The Gift is prepaid for a year and never auto-renews.",
      },
      {
        q: "Yearly or monthly?",
        a: `Yearly is the better value and the printed book ships right away. Monthly is ${formatPrice(TIERS[0].monthly ?? 0)} and works the same, except printed books can be ordered after six months. Downloading your own recordings is free from day one either way.`,
      },
      {
        q: "Can I delete everything?",
        a: "Yes. You can download all your stories at any time, and you can ask us to permanently delete a single recording or your entire account by contacting us.",
      },
    ],
  },
];

// Prices quoted inside FAQ answers are interpolated from the tables above so the
// copy can never drift from the cards. (Function declarations hoist, so this is
// callable from the FAQ initializer even though `formatPrice` is defined below.)
function addOnPrice(id: string): string {
  const a = ADD_ONS.find((x) => x.id === id);
  return a ? formatPrice(a.price) : "";
}

// Short teaser for the homepage — the items marked `featured` above, in source
// order. The full, grouped list lives on /faq.
export const FAQ: FaqItem[] = FAQ_GROUPS.flatMap((g) =>
  g.items.filter((i) => i.featured),
);

/** Format a whole-dollar USD price, e.g. 99 → "$99". */
export function formatPrice(dollars: number): string {
  return `$${dollars.toLocaleString("en-US")}`;
}
