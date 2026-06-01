import { Atkinson_Hyperlegible, Fraunces } from "next/font/google";

// Elder-facing surface. Atkinson Hyperlegible for all UI text (designed for low
// vision), Fraunces for the warm display lines. Scoped to the (storyteller)
// route group only — the rest of the app is unaffected. Large, high-contrast,
// calm: see SPEC § Elder-facing UX principles.
const sans = Atkinson_Hyperlegible({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Fraunces({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export default function StorytellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${sans.variable} ${serif.variable} min-h-screen font-[family-name:var(--font-sans)]`}
    >
      {children}
    </div>
  );
}
