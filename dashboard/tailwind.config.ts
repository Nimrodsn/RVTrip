import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1a1a1a",
        campsite: { bg: "#e8f5e9", dot: "#2e7d32", text: "#1b5e20" },
        attraction: { bg: "#ffebee", dot: "#c62828", text: "#b71c1c" },
        supply: { bg: "#e3f2fd", dot: "#1565c0", text: "#0d47a1" },
      },
    },
  },
  plugins: [],
};

export default config;
