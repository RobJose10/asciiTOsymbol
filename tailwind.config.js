/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b1220',
        panel: '#f7fbff',
        accent: '#0f766e',
        accentSoft: '#ccfbf1',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        lift: '0 14px 35px rgba(2, 6, 23, 0.12)',
      },
    },
  },
  plugins: [],
}

