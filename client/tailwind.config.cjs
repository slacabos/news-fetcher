/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 12px 30px -18px rgba(15, 23, 42, 0.5)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
