/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      colors: {
        snp: {
          dark: '#06091a',
          surface: '#0d1228',
          elevated: '#141c35',
          border: '#1e2d50',
          cyan: '#00ccf0',
          pink: '#e040fb',
          purple: '#7c3aed',
        },
      },
    },
  },
  plugins: [],
};
