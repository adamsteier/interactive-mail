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
      },
      animation: {
        'blink': 'blink 1s step-end infinite',
        'float-to-corner': 'float-to-corner 1.5s ease-out forwards',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'float-to-corner': {
          '0%': {
            transform: 'translateX(-50%) translateY(0) scale(0.8)',
            opacity: '0',
          },
          '20%': {
            transform: 'translateX(-30%) translateY(-100px) scale(0.9)',
            opacity: '0.5',
          },
          '40%': {
            transform: 'translateX(-10%) translateY(-150px) scale(0.95)',
            opacity: '0.7',
          },
          '60%': {
            transform: 'translateX(-40%) translateY(-200px) scale(1)',
            opacity: '0.8',
          },
          '80%': {
            transform: 'translateX(-20%) translateY(-250px) scale(1)',
            opacity: '0.9',
          },
          '100%': {
            transform: 'translateX(0) translateY(-300px) scale(1)',
            opacity: '1',
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
