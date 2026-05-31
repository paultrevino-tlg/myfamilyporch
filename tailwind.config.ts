import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FBF5EA",
        ink: "#2B2218",
        answer: "#3E7A52",
        accent: "#C8743A",
      },
    },
  },
  plugins: [],
} satisfies Config;
