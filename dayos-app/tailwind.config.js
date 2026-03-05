/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#3A86FF',
        bg: '#FFFFFF',
        surface: '#F7F8FA',
        border: '#E8E8E8',
        text: '#1A1A2E',
        muted: '#6B7280',
        success: '#10B981',
        warning: '#F59E0B',
      },
      borderRadius: {
        card: '12px',
        input: '8px',
      },
    },
  },
  plugins: [],
}

