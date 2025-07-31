/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      keyframes: {
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shine: {
          '0%': { 'background-position': '100%' },
          '100%': { 'background-position': '-100%' },
        },
      },
      animation: {
        bounce: 'bounce 0.8s infinite ease-in-out',
        shine: 'shine 5s linear infinite',
      },
    },
  },
  plugins: [],
};


 // keyframes: {
//         
//       },
//       animation: {
//         
//       },