import type { Config } from "tailwindcss";

// Confectionery Warmth palette — sync dengan bakeshop-fe POS.
// Primary: pink cherry gradient (#FFB5C0 → #E11D48)
// Secondary: cream bg (#FFF4F6), warm ink (#2B1318)
// Accent: amber #F59E0B untuk badge grosir/reseller.
const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cherry: {
          50:  "#FFF4F6",
          100: "#FFE4E9",
          200: "#FFD1DB",
          300: "#FFB5C0",
          400: "#FB7185",
          500: "#E11D48",
          600: "#BE123C",
          700: "#9F1239",
          900: "#3A1F2A",
        },
        ink: {
          500: "#8B6A73",
          700: "#6E4E57",
          900: "#2B1318",
        },
        amber: {
          500: "#F59E0B",
          600: "#D97706",
        },
      },
      fontFamily: {
        display: [
          "Proxima Nova",
          "Proxima Nova Alt",
          "ProximaNova-Regular",
          "Mulish",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
