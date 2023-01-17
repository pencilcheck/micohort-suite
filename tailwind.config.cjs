/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  corePlugins: {
    preflight: false // avoid conflict with mantine theming, https://stackoverflow.com/questions/72083381/load-mantine-styles-after-tailwind-preflight
  },
  theme: {
    extend: {},
  },
  plugins: [],
};
