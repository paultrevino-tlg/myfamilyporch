import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Blue theme. `paper`/`ink`/`answer`/`accent` keep their names so every
        // existing class recolors centrally; the rest extend the system.
        paper: "#EBF1F8",      // cool page background
        surface: "#FFFFFF",    // cards
        surface2: "#F4F8FC",   // inset / muted surface
        ink: "#15233B",        // deep navy text (opacity variants used throughout)
        line: "#E1E9F2",       // hairline borders
        brand: "#2563EB",      // primary blue
        brand2: "#1D4ED8",     // primary blue (deep)
        answer: "#2563EB",     // storyteller "your turn" / primary (kept name)
        accent: "#0284C7",     // secondary / question accent (kept name)
        sky2: "#38BDF8",       // bright sky for gradients
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      boxShadow: {
        sm: "0 1px 2px rgba(21,35,59,.06), 0 1px 3px rgba(21,35,59,.05)",
        md: "0 4px 10px rgba(21,35,59,.07), 0 12px 28px rgba(21,35,59,.08)",
        lg: "0 10px 24px rgba(21,35,59,.12), 0 24px 56px rgba(21,35,59,.12)",
      },
    },
  },
  plugins: [],
} satisfies Config;
