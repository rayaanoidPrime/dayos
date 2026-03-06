/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#ffffff',
        bg: '#1a1512',
        surface: 'rgba(255,255,255,0.03)',
        border: 'rgba(255,255,255,0.12)',
        text: '#ffffff',
        muted: 'rgba(255,255,255,0.75)',
        tertiary: 'rgba(255,255,255,0.45)',
        success: '#8ad6b2',
        warning: '#f8cf8f',
        cream: '#EAE0D5',
        creamMuted: '#9A9188',
        sage: '#8FA895',
        amber: '#D4A373',
        divider: '#363028',
      },
      borderRadius: {
        card: '12px',
        input: '12px',
      },
    },
  },
  plugins: [],
}

