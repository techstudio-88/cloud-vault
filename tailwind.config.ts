import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        vault: {
          bg: "#08090f",
          panel: "#10121c",
          elevated: "#171a27",
          line: "rgba(255,255,255,.08)",
          muted: "#8b91a7",
          purple: "#8b5cf6",
          blue: "#5b8cff",
        },
      },
      boxShadow: {
        glow: "0 0 60px rgba(139,92,246,.16)",
      },
    },
  },
  plugins: [],
};
export default config;
