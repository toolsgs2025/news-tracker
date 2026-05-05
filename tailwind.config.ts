import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        accent: "rgb(var(--accent) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "google-red": "rgb(var(--google-red) / <alpha-value>)",
        "google-yellow": "rgb(var(--google-yellow) / <alpha-value>)",
        "google-green": "rgb(var(--google-green) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};

export default config;

