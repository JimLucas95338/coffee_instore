import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 3rd Space Coffee palette — retro space-age
        space: {
          950: '#05071a', // deep void
          900: '#0a0e27',
          800: '#101633',
          700: '#1a2046',
          600: '#252b5e',
        },
        saturn: {
          50: '#fff4ec',
          100: '#ffe2cc',
          200: '#ffc499',
          300: '#ff9e5c',
          400: '#ff7a33',
          500: '#ff6b35', // primary brand
          600: '#e55421',
          700: '#b8401b',
          800: '#8a3018',
          900: '#5c2110',
        },
        cream: {
          DEFAULT: '#f4e5c2',
          dark: '#d8c79b',
        },
        nebula: {
          cyan: '#22d3ee',
          magenta: '#d946ef',
          violet: '#8b5cf6',
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
