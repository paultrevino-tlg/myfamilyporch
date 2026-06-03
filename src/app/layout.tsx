import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

// Site-wide type: Inter for UI, Fraunces for warm display lines. Exposed as CSS
// variables so Tailwind's font-sans / font-serif resolve everywhere. The
// (storyteller) route group overrides --font-sans with Atkinson Hyperlegible for
// the elder-facing surface.
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Fraunces({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "My Family Porch",
  description: "Capture a loved one's life stories, in their own voice.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
