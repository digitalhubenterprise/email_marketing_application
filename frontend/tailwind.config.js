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
          50: '#f0f4ff',
          100: '#e1e9fe',
          200: '#c8d7fd',
          300: '#a1bcfa',
          400: '#7295f7',
          500: '#4c6ef5', // Primary Brand Violet-Blue
          600: '#3b51db',
          700: '#2f3eb3',
          800: '#283391',
          900: '#252e74',
          950: '#151945',
        },
        dark: {
          50: '#f6f6f9',
          100: '#ececf3',
          200: '#d5d6e3',
          300: '#b1b4cb',
          350: '#9fa3be',
          400: '#878cae',
          450: '#787ca0',
          500: '#676c96',
          600: '#51557d',
          700: '#414467',
          750: '#38405d',
          800: '#30334f', // Card background dark
          850: '#252845',
          900: '#1a1c2e', // Page background dark
          950: '#0f111f',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
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
