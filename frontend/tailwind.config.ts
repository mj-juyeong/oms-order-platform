import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        oms: {
          ink: '#172033',
          line: '#d6dde8',
          panel: '#f7f9fc',
          accent: '#0f766e',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
