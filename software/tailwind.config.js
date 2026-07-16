/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        darkbg: "#f3f4f6", // Light grey workspace
        surface: "#ffffff", // Pure white for command panels and visualizers
        surfaceLight: "#f8f9fa", // Soft grey for toolstrips and grid controls
        accent: {
          DEFAULT: "#0056b3", // MATLAB steel blue
          cyan: "#17a2b8",
          gold: "#d97706",
          emerald: "#2ca02c", // Bayesian optimum green (AGENTS.md)
          red: "#d62728", // Paper baseline red (AGENTS.md)
          blue: "#0056b3",
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}
