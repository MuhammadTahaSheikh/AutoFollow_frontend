/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef0ff',
          100: '#dde1ff',
          500: '#2a1fe0',
          600: '#2013d1',
          700: '#1a0fb0',
        },
      },
    },
  },
  plugins: [],
};
