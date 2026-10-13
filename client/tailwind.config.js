/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Source Sans 3"', "Segoe UI", "sans-serif"],
      },
      colors: {
        navy: {
          950: "#08131f",
          900: "#0c1b2a",
          800: "#143049",
        },
      },
    },
  },
  plugins: [],
};
