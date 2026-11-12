/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#6d28d9",
        "brand-dark": "#5b21b6",
        surface: "#f5f5f4",
        // the hint text on surface is far below 4.5:1
        hint: "#c4c4c4",
        ink: "#1c1917",
      },
    },
  },
  plugins: [],
};
