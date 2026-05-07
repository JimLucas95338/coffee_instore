import type { Config } from 'tailwindcss';

/**
 * All theme colors are CSS variables defined in globals.css. Switching themes
 * at runtime swaps those vars; Tailwind classes resolve through them.
 */
function v(name: string) {
  return `rgb(var(--color-${name}) / <alpha-value>)`;
}

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/themes/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          950: v('surface-950'),
          900: v('surface-900'),
          800: v('surface-800'),
          700: v('surface-700'),
          600: v('surface-600'),
        },
        accent: {
          300: v('accent-300'),
          400: v('accent-400'),
          500: v('accent-500'),
          600: v('accent-600'),
          700: v('accent-700'),
        },
        ink: {
          DEFAULT: v('ink'),
          dark: v('ink-dark'),
        },
        glow: {
          1: v('glow-1'),
          2: v('glow-2'),
          3: v('glow-3'),
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
