import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Fraunces } from "next/font/google";
import "./globals.css";
import { SITE_URL, SITE_NAME, SITE_TAGLINE, DEFAULT_OG_IMAGE } from "@/lib/seo";

// Site-wide type (Porchlight): Atkinson Hyperlegible for all UI and body text —
// a legibility face, since buyers and storytellers alike skew 60+ — and Fraunces
// for display lines. Exposed as CSS variables so Tailwind's font-sans /
// font-serif resolve everywhere, the storyteller surface included.
const sans = Atkinson_Hyperlegible({
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Variable weight plus the SOFT/WONK/opsz axes the editorial display style uses.
const serif = Fraunces({
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

// metadataBase makes the relative canonical/OG URLs from lib/seo resolve to
// absolute ones. The defaults here are inherited site-wide and overridden
// per-page (marketing pages via pageMeta()).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: "Capture a loved one's life stories, in their own voice.",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    images: [DEFAULT_OG_IMAGE],
  },
};

// Next already injects width=device-width; themeColor tints the mobile browser
// chrome to match the paper background (Best Practices / brand polish, 8.11).
export const viewport: Viewport = {
  themeColor: "#FBF6EC",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
