/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F766E',
          50: '#EDF4F2',
          100: '#DCEAE6',
          200: '#B9D7D0',
          300: '#85B8AE',
          400: '#3F958A',
          500: '#0F766E',
          600: '#0B5F59',
          700: '#0A4C48',
          800: '#083D3A',
          900: '#062F2D'
        },
        secondary: { DEFAULT: '#166534' },
        accent: { DEFAULT: '#14B8A6' },
        bg: { DEFAULT: '#F5F7F6', soft: '#EDF4F2' },
        ink: { DEFAULT: '#1C2526', soft: '#43504D', muted: '#5B6663' },
        line: '#D7DDDA',
        darkbg: { DEFAULT: '#111315', surface: '#1A1D1F', card: '#23282C', line: '#34393D' }
      },
      borderRadius: { xl2: '20px' },
      boxShadow: {
        soft: '0 14px 34px -22px rgba(15, 118, 110, 0.55)',
        card: '0 16px 40px -30px rgba(28, 37, 38, 0.38)',
        lift: '0 24px 58px -36px rgba(17, 19, 21, 0.52)'
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
