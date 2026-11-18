/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: "var(--bg)",
        panel: "var(--surface)",
        panelLight: "var(--surface-2)",
        line: "var(--line)",
        cyan: { DEFAULT: "var(--mint)", dim: "#5f9e88" },
        amber: { DEFAULT: "var(--lime)", dim: "#9dad4e" },
        ink: "var(--text)",
        muted: "var(--muted)",
      },
      fontFamily: {
        pixel: ['"JetBrains Mono"', "monospace"],
        display: ['"Space Grotesk"', "sans-serif"],
        body: ['"DM Sans"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
        akira: ['"Akira"', "sans-serif"],
        mustardo: ['"Mustardo"', "sans-serif"],
        milkyway: ['"Space Grotesk"', "sans-serif"],
      },
      boxShadow: {
        pixel: "4px 4px 0 rgba(0,0,0,.35)",
        glow: "0 0 24px rgba(168,240,208,.2)",
      },
    },
  },
  plugins: [],
};
