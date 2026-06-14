/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#F5F7FA',
          surface: '#FFFFFF',
          surfaceMuted: '#F8FAFC',
          line: '#E1E6ED',
          text: '#111827',
          muted: '#667085',
          subtle: '#98A2B3',
          accent: '#1677FF',
          accentHover: '#2563EB',
          accentActive: '#145FCF',
          accentSoft: '#EAF2FF',
          success: '#16A34A',
          successSoft: '#EAF7EE',
          warning: '#F97316',
          warningSoft: '#FFF4E8',
          danger: '#DC2626'
        },
        base: '#F5F7FA',
        panel: '#FFFFFF',
        line: '#E1E6ED',
        accent: '#1677FF',
        success: '#16A34A',
        warning: '#F97316'
      }
    }
  },
  plugins: []
};
