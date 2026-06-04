/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c7d2fe',
          400: '#a5b4fc',
          500: '#6366f1', // Primary Violet-Indigo
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        dark: {
          50: '#0f172a',  // Deepest slate text (900)
          100: '#0f172a', // Deep slate text
          200: '#1e293b', // Slate-800
          300: '#334155', // Slate-700
          350: '#475569', // Slate-600
          400: '#64748b', // Slate-500
          450: '#94a3b8', // Slate-400
          500: '#cbd5e1', // Slate-300 divider/border
          600: '#e2e8f0', // Slate-200 border
          700: '#f1f5f9', // Slate-100 bg/border
          750: '#f8fafc', // Slate-50 bg
          800: '#ffffff', // Card/sidebar background (white)
          850: '#f8fafc', // Light slate bg
          900: '#ffffff', // Card background (white)
          950: '#f8fafc', // Main page body background (slate-50)
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
    },
  },
  plugins: [],
}
