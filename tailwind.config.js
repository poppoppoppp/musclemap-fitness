/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#000000',
        panel: '#1d1d1f',
        line: '#3a3a3c',
        accent: '#0071e3'
      }
    }
  },
  plugins: []
};
