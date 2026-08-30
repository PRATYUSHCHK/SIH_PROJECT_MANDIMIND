/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        forest: { DEFAULT: '#166534', deep: '#14532D', ink: '#052E16' },
        agri: '#22C55E',
        harvest: '#EAB308',
        earth: '#F5F1E8',
        warn: '#F59E0B',
        alert: '#DC2626',
        info: '#2563EB',
        canvas: '#F7F8F5',
        ink: '#17201A',
        mute: '#647067',
        line: '#E5E9E3',
        night: { bg: '#07140C', card: '#0D2115', lift: '#12301D', text: '#F0FDF4', mute: '#A7B5AA' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(5,46,22,0.06), 0 8px 24px rgba(5,46,22,0.04)',
      },
      borderRadius: {
        mm: '16px',
      },
    },
  },
  plugins: [],
};
