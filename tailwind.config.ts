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
        glass: {
          DEFAULT: "rgb(var(--glass-bg) / <alpha-value>)",
          border: "rgb(var(--glass-border) / <alpha-value>)",
        },
      },
      backgroundImage: {
        "app-gradient":
          "radial-gradient(circle at 15% 10%, rgb(var(--accent-1) / 0.45), transparent 45%), radial-gradient(circle at 85% 90%, rgb(var(--accent-2) / 0.45), transparent 45%), linear-gradient(135deg, rgb(var(--bg-from)), rgb(var(--bg-to)))",
      },
    },
  },
  plugins: [],
};

export default config;
