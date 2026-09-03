/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary-container": "#0b4f4a",
        "primary": "#003733",
        "on-primary": "#ffffff",
        "primary-fixed-dim": "#96d2cb",
        "on-primary-container": "#84bfb8",
        "warm-gold": "#C98A2B",
        "status-error": "#B23A2E",
        "status-success": "#4C7A63",
        "status-neutral": "#94A3B8",
        "panel-bg": "#EEF1F3",
        "border-refined": "#D8DEE2",
        "surface": "#f9f9f9",
        "on-surface": "#1a1c1c",
        "on-surface-variant": "#3f4947",
        "surface-container": "#eeeeee",
        "surface-container-high": "#e8e8e8",
        "surface-container-low": "#f3f3f4",
      },
      fontFamily: {
        headline: ["Space Grotesk", "sans-serif"],
        body: ["IBM Plex Sans", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
