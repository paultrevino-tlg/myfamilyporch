import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Porchlight theme (design direction 1, .done/PLAN-porchlight.md): four warm
        // pigments, no blue. Token names are kept from the old blue theme so
        // every existing class recolors centrally. Clay is deepened from the
        // direction's #B45B3E (4.3:1 on cream, fails AA) to pass as text and
        // under white button labels; honey is decoration only (2.3:1) — text
        // that needs the warm accent uses `accent` (honey-ink).
        paper: "#FBF6EC",      // cream page background
        surface: "#FFFDF8",    // cards
        surface2: "#F3EADA",   // inset / muted surface (direction's "paper")
        ink: "#2C221B",        // umber text (opacity variants used throughout)
        line: "#E4D9C7",       // hairline borders
        brand: "#9A4A30",      // clay — primary
        brand2: "#7A3823",     // clay (deep)
        answer: "#9A4A30",     // storyteller "your turn" / primary (kept name)
        accent: "#8A5A12",     // honey-ink — warm accent that reads as text
        honey: "#D9962F",      // porch-light glow / gradient end — never as text
        clay: "#9A4A30",
        cream: "#FBF6EC",
        umber: "#2C221B",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Verdana", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      boxShadow: {
        sm: "0 1px 2px rgba(44,34,27,.05)",
        md: "0 4px 10px rgba(44,34,27,.06), 0 12px 28px rgba(44,34,27,.07)",
        lg: "0 10px 24px rgba(44,34,27,.10), 0 24px 56px rgba(44,34,27,.10)",
      },
      transitionTimingFunction: {
        porch: "cubic-bezier(.16,.84,.3,1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
