// Pricing — single source of truth (TODO 7.5).
//
// Every price/tier/add-on/feature shown on the public pricing page lives here so
// it is declared ONCE. Phase 8.3 (marketing pricing page) and Phase 9.1/9.2
// (Stripe products/prices + checkout) consume this module rather than
// re-declaring numbers — when Stripe is wired, attach the price IDs to the
// `stripePriceId` fields here instead of hardcoding prices a second time.
//
// !!! PRICES ARE UNCONFIRMED RECOMMENDATIONS (from docs/PRICING.md §2/§3). !!!
// They must be validated against loaded COGS (book POD quote, per-storyteller
// software cost, Lifetime guardrail — docs/PRICING.md §6) before charging real
// money. Nothing here charges yet: CTAs route to /login, Stripe is Phase 9.
// Revise these values (and the `unconfirmed` flag) once COGS is known.

export const PRICING_UNCONFIRMED = true;

/** A Stripe price id, attached in Phase 9.1. Null until then. */
export type StripePriceId = string | null;

export type BillingPeriod = "year" | "one-time";

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

export interface LifetimeOffer {
  id: "lifetime";
  name: string;
  tagline: string;
  price: number;
  period: BillingPeriod;
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
    monthly: 11, // TODO: confirm monthly maps to ~$99/yr intent (PRICING §2)
    features: [
      "One storyteller",
      "Unlimited stories and recordings",
      "Full voice-nudge & scheduling experience",
      "Digital book (PDF) with bundled audio + voice QR codes",
      "Forever access on cancellation",
      "Physical book available as an add-on",
    ],
    cta: "Start recording",
    stripePriceId: null,
    stripeMonthlyPriceId: null,
  },
  {
    id: "keepsake_book",
    name: "Keepsake + Book",
    tagline: "The book with their voice in it.",
    price: 149,
    period: "year",
    recommended: true,
    features: [
      "Everything in Keepsake, plus:",
      "One printed hardcover color book shipped per year",
      "Voice QR codes printed in the book",
    ],
    cta: "Get the book",
    stripePriceId: null,
  },
  {
    id: "family",
    name: "Family",
    tagline: "For the whole family.",
    price: 199,
    period: "year",
    features: [
      "Everything in Keepsake + Book, plus:",
      "Up to 3 storytellers", // TODO: confirm storyteller cap (PRICING §2)
      "Priority support",
    ],
    cta: "Set up the family",
    stripePriceId: null,
  },
];

// --- Lifetime (docs/PRICING.md §2) ----------------------------------------
// Separate path, NOT a 4th tier column. TODO: define the ongoing-cost guardrail
// (prompting cap / low-cost "keep recording" renewal) before launch (PRICING §6).

export const LIFETIME: LifetimeOffer = {
  id: "lifetime",
  name: "Lifetime",
  tagline: "Own it outright. No subscription.",
  price: 199,
  period: "one-time",
  features: [
    "One storyteller, lifetime access",
    "One printed book included",
    "Forever access — nothing to renew",
  ],
  cta: "Buy it once",
  stripePriceId: null,
};

// --- À la carte add-ons (docs/PRICING.md §3) ------------------------------
// TODO: confirm each price clears COGS before launch (PRICING §3/§6).

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
    price: 89,
    unit: "/yr",
    note: "Add another elder to any annual plan.",
    stripePriceId: null,
  },
  {
    id: "reprint",
    name: "New edition / reprint",
    price: 39,
    unit: "one-time",
    note: "Add a year of new stories and reprint the book.",
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
    feature: "Printed hardcover color book / yr",
    values: { keepsake: false, keepsake_book: "1", family: "1" },
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
        q: "Can I delete everything?",
        a: "Yes. You can download all your stories at any time, and you can ask us to permanently delete a single recording or your entire account by contacting us.",
      },
    ],
  },
];

// Short teaser for the homepage — the items marked `featured` above, in source
// order. The full, grouped list lives on /faq.
export const FAQ: FaqItem[] = FAQ_GROUPS.flatMap((g) =>
  g.items.filter((i) => i.featured),
);

/** Format a whole-dollar USD price, e.g. 99 → "$99". */
export function formatPrice(dollars: number): string {
  return `$${dollars.toLocaleString("en-US")}`;
}
