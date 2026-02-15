import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        electric: {
          50: '#e6f0ff',
          100: '#cce0ff',
          200: '#99c2ff',
          300: '#66a3ff',
          400: '#3385ff',
          500: '#0066ff',
          600: '#0052cc',
          700: '#003d99',
          800: '#002966',
          900: '#001433',
        },
        coral: {
          50: '#fff3ef',
          100: '#ffe7df',
          200: '#ffcfbf',
          300: '#ffb79f',
          400: '#ff9f7f',
          500: '#ff8c42',
          600: '#ff6b35',
          700: '#cc5629',
          800: '#99401f',
          900: '#662b14',
        },
      },
    },
  },
  plugins: [],
};

export default config;