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
        'loading-progress': 'loading 2s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s infinite',
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
        loading: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        'pulse-glow': {
          '0%, 100%': { 
            transform: 'scale(1)',
            boxShadow: '0 0 10px rgba(0, 240, 255, 0.3)'
          },
          '50%': { 
            transform: 'scale(1.05)',
            boxShadow: '0 0 20px rgba(0, 240, 255, 0.5)'
          }
        }
      },
    },
  },
  plugins: [],
};

export default config;
