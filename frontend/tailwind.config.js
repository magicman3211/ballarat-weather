/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: 'rgb(var(--color-obsidian) / <alpha-value>)',
        champagne: 'rgb(var(--color-champagne) / <alpha-value>)',
        ivory: 'rgb(var(--color-ivory) / <alpha-value>)',
        slate: 'rgb(var(--color-slate) / <alpha-value>)',
        background: 'rgb(var(--bg-primary) / <alpha-value>)',
        surface: 'rgb(var(--bg-surface) / <alpha-value>)',
        textPrimary: 'rgb(var(--text-primary) / <alpha-value>)',
        textMuted: 'rgb(var(--text-muted) / <alpha-value>)'
      },
      fontFamily: {
        heading: ['Inter', 'sans-serif'],
        drama: ['"Playfair Display"', 'serif'],
        data: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
