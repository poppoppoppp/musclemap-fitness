/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#070b12',
        panel: '#101827',
        line: '#223044',
        accent: '#38d5c7'
      }
    }
  },
  plugins: []
};
