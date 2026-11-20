import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // cores da marca
        marca: {
          50: '#effafb',
          100: '#d6f1f4',
          200: '#b0e3ea',
          300: '#7bcfda',
          400: '#3fb3c3',
          500: '#2297a9',
          600: '#1a7a8c',
          700: '#196373',
          800: '#1a525f',
          900: '#1a4550',
        },
        caramelo: { 100: '#fdf0d8', 400: '#eab04f', 500: '#e0962a', 600: '#c47a1c' },
      },
      fontFamily: { sans: ['var(--font-nunito)', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(26,122,140,.06)' },
    },
  },
  plugins: [],
} satisfies Config;
