/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#f4efe8',
        bg: '#1a1512',
        surface: '#2a221d',
        border: 'rgba(255,255,255,0.14)',
        text: '#f6f1ea',
        muted: 'rgba(255,255,255,0.66)',
        success: '#8ad6b2',
        warning: '#f8cf8f',
      },
      borderRadius: {
        card: '16px',
        input: '12px',
      },
    },
  },
  plugins: [],
}

