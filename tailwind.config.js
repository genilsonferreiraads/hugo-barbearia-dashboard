/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#ff0000",
        "background-light": "#f8f6f6",
        "background-dark": "#181211",
        "card-dark": "#221410",
        "border-dark": "#392c28",
        "text-dark-primary": "#ffffff",
        "text-dark-secondary": "#b9a29d",
        "text-light-primary": "#181211",
        "text-light-secondary": "#54403b",
      },
      fontFamily: {
        display: ["Be Vietnam Pro", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
    },
  },
  plugins: [],
}
