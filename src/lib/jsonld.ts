// Structured-data (JSON-LD) builders (Phase 8.10, brief §8). Pure functions that
// assemble schema.org objects from the SAME single sources the visible pages use
// — SITE_URL/SITE_NAME (lib/seo) and the pricing/FAQ tables (lib/pricing) — so the
// structured data can never drift from what a visitor reads. The <JsonLd> server
// component (_components/JsonLd.tsx) renders these into a <script> tag.

import { SITE_URL, SITE_NAME, SITE_TAGLINE, DEFAULT_OG_IMAGE } from "@/lib/seo";
import { TIERS, LIFETIME, FAQ_GROUPS } from "@/lib/pricing";

// A loose JSON-LD object type. schema.org graphs are deeply nested and untyped;
// `unknown` values keep the builders honest without fighting the structure.
export type JsonLdObject = Record<string, unknown>;

const absolute = (path: string) => new URL(path, SITE_URL).toString();

/**
 * Organization + WebSite for the home page. Establishes the brand entity (name,
 * logo, the operating company) and the searchable site so engines can show a
 * richer knowledge panel / sitelinks.
 */
export function organizationLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        slogan: SITE_TAGLINE,
        logo: absolute(DEFAULT_OG_IMAGE),
        // Operating entity disclosed site-wide (footer) — keep consistent here.
        legalName: "Technology Leadership Group, LLC",
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: SITE_URL,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en-US",
      },
    ],
  };
}

/**
 * FAQPage for /faq, built from every Q&A in FAQ_GROUPS (the same source the page
 * renders) so the rich result matches the visible accordion exactly.
 */
export function faqPageLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_URL}/faq#faq`,
    mainEntity: FAQ_GROUPS.flatMap((group) =>
      group.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    ),
  };
}

/**
 * Product + Offers for /pricing, built from the tier table + the Lifetime offer.
 * Prices come straight from lib/pricing (whole-dollar USD), so the structured
 * offers stay in lockstep with the cards. Annual tiers are yearly subscriptions;
 * Lifetime is a one-time purchase.
 */
export function pricingProductLd(): JsonLdObject {
  const offers = [
    ...TIERS.map((tier) => ({
      "@type": "Offer",
      name: tier.name,
      description: tier.tagline,
      price: tier.price.toString(),
      priceCurrency: "USD",
      // Annual plans renew yearly.
      url: `${SITE_URL}/pricing`,
    })),
    {
      "@type": "Offer",
      name: LIFETIME.name,
      description: LIFETIME.tagline,
      price: LIFETIME.price.toString(),
      priceCurrency: "USD",
      url: `${SITE_URL}/pricing`,
    },
  ];

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${SITE_URL}/pricing#product`,
    name: SITE_NAME,
    description:
      "Capture an elder's life stories in their own voice through short, AI-guided voice interviews, kept as a keepsake book with voice QR codes.",
    image: absolute(DEFAULT_OG_IMAGE),
    brand: { "@type": "Brand", name: SITE_NAME },
    offers,
  };
}
