/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#09090b",       // Deepest matte black
          surface: "#121215",  // Soft charcoal card background
          elevated: "#18181b", // Slightly elevated container
          hover: "#222226",    // Hover state
          border: "#27272a",   // Clean subtle gray border
          muted: "#71717a",    // Soft muted text
          text: "#f4f4f5",     // Primary crisp text
        }
      },
    },
  },
  plugins: [],
};
