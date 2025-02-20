import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        'charcoal': '#1a1a1a',
        'electric-teal': '#00F0FF',
        'neon-magenta': '#FF00FF',
      },
      boxShadow: {
        'glow': '0 0 10px rgba(0, 240, 255, 0.3)',
        'glow-strong': '0 0 20px rgba(0, 240, 255, 0.8)',
      },
      animation: {
        'blink': 'blink 1s step-end infinite',
        'info-box-glow': 'info-box-glow 1s ease-out forwards',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'info-box-glow': {
          '0%': { 
            boxShadow: '0 0 20px rgba(0, 240, 255, 0.8)',
            borderColor: '#00F0FF',
          },
          '100%': { 
            boxShadow: '0 0 10px rgba(0, 240, 255, 0.3)',
            borderColor: '#00F0FF',
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
