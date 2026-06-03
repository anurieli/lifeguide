import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF8F2",
        "paper-2": "#F3EFE5",
        card: "#FFFFFF",
        ink: "#1A1D24",
        "ink-soft": "#444B58",
        "ink-mute": "#8A8F9C",
        line: "#E7E1D4",
        accent: "#1E3A5F",
        gold: "#B8945A",
        coach: "#1E232E",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
