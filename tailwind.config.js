/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5',
          50: '#EEF0FE',
          100: '#DDE0FD',
          200: '#BCC1FB',
          300: '#9AA1F9',
          400: '#6366F1',
          500: '#4F46E5',
          600: '#4338CA',
          700: '#3730A3',
          800: '#2E2175',
          900: '#1A1242'
        },
        secondary: { DEFAULT: '#6366F1' },
        accent: { DEFAULT: '#8B5CF6' },
        bg: { DEFAULT: '#F8FAFC', soft: '#F1F5F9' },
        ink: { DEFAULT: '#0F172A', soft: '#475569', muted: '#64748B' },
        line: '#E2E8F0',
        darkbg: { DEFAULT: '#0F172A', surface: '#111827', card: '#1E293B', line: '#334155' }
      },
      borderRadius: { xl2: '20px' },
      boxShadow: {
        soft: '0 12px 30px -18px rgba(79, 70, 229, 0.45)',
        card: '0 14px 40px -28px rgba(15, 23, 42, 0.35)',
        lift: '0 22px 55px -34px rgba(15, 23, 42, 0.5)'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        'pulse-soft': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.5 } }
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
        'pulse-soft': 'pulse-soft 1.4s ease-in-out infinite'
      }
    }
  },
  plugins: []
}
