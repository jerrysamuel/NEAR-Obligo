import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"],
        serif: ["Newsreader", "Instrument Serif", "Georgia", "serif"],
      },
      colors: {
        ledger: {
          canvas: "var(--bg-canvas)",
          surface: "var(--bg-surface)",
          subtle: "var(--bg-subtle)",
          ink: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          hairline: "var(--border-hairline)",
          strong: "var(--border-strong)",
          accent: "var(--accent-primary)",
          "accent-fg": "var(--accent-primary-fg)",
          settled: "var(--status-settled)",
          hold: "var(--status-policy-hold)",
          breach: "var(--status-breach)",
        },
      },
      transitionDuration: {
        160: "160ms",
        180: "180ms",
        220: "220ms",
        240: "240ms",
      },
    },
  },
  plugins: [],
};
export default config;
