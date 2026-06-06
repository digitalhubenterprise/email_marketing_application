/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--color-brand-50)',
          100: 'var(--color-brand-100)',
          200: 'var(--color-brand-200)',
          300: 'var(--color-brand-300)',
          400: 'var(--color-brand-400)',
          500: 'var(--color-brand-500)',
          600: 'var(--color-brand-600)',
          700: 'var(--color-brand-700)',
          800: 'var(--color-brand-800)',
          900: 'var(--color-brand-900)',
          950: 'var(--color-brand-950)',
        },
        dark: {
          50: 'var(--color-dark-50)',
          100: 'var(--color-dark-100)',
          200: 'var(--color-dark-200)',
          300: 'var(--color-dark-300)',
          350: 'var(--color-dark-350)',
          400: 'var(--color-dark-400)',
          450: 'var(--color-dark-450)',
          500: 'var(--color-dark-500)',
          600: 'var(--color-dark-600)',
          700: 'var(--color-dark-700)',
          750: 'var(--color-dark-750)',
          800: 'var(--color-dark-800)',
          850: 'var(--color-dark-850)',
          900: 'var(--color-dark-900)',
          950: 'var(--color-dark-950)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
      },
      spacing: {
        '0.5': '0.125rem',
        '1.5': '0.375rem',
        '2.5': '0.625rem',
        '3.5': '0.875rem',
        '4.5': '1.125rem',
        '13': '3.25rem',
        '18': '4.5rem',
      },
      screens: {
        'xs': '320px',      // Small phones (SE, 5)
        'xs-mid': '375px',  // Most Android / iPhone 6-8
        'xs-large': '390px', // iPhone X / 11 / 12 mini
        'xs-pro': '393px',  // iPhone 14 / 15 Pro
        'xs-max': '414px',  // iPhone Plus / Max
        'large-android': '480px', // Large Android (S23+)
        'ipad-10th': '810px',     // iPad 10th gen (portrait)
        'ipad-air': '820px',      // iPad Air / Pro 11" (portrait)
        'macbook': '1366px',      // HD laptops / 13" MacBook
        'desktop-1080': '1920px', // Full HD desktop (1080p)
        'qhd': '2560px',          // 2K / QHD monitor
        'uhd': '3840px',          // 4K / UHD monitor
      },
    },
  },
  plugins: [],
}
