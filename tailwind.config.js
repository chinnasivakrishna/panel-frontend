/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif"
        ]
      },
      colors: {
        root: "var(--root-color)",
        secondary: "var(--secondary-color)",
        tertiary: "var(--tertiary-color)"
      }
    }
  },
  plugins: []
};
