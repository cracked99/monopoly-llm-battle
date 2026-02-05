import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        'breathe-glow': {
          '0%, 100%': { 
            opacity: '0.4', 
            transform: 'scale(1)' 
          },
          '50%': { 
            opacity: '0.9', 
            transform: 'scale(1.05)' 
          },
        },
        'soft-pulse': {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.7' },
        },
        'border-breathe': {
          '0%, 100%': { 
            opacity: '0.5',
          },
          '50%': { 
            opacity: '1',
          },
        },
        'ambient-glow': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        'gentle-pulse': {
          '0%, 100%': { 
            transform: 'scale(1)', 
            opacity: '0.8' 
          },
          '50%': { 
            transform: 'scale(1.2)', 
            opacity: '1' 
          },
        },
        'player-bounce': {
          '0%, 100%': { transform: 'scale(1) translateY(0)' },
          '50%': { transform: 'scale(1.1) translateY(-2px)' },
        },
        'glow-ring': {
          '0%, 100%': { 
            boxShadow: '0 0 8px 2px var(--glow-color, rgba(255,255,255,0.3))',
            opacity: '0.5'
          },
          '50%': { 
            boxShadow: '0 0 16px 4px var(--glow-color, rgba(255,255,255,0.5))',
            opacity: '0.9'
          },
        },
        'title-glow': {
          '0%, 100%': { 
            textShadow: '0 0 20px rgba(251, 191, 36, 0.3)',
            filter: 'brightness(1)'
          },
          '50%': { 
            textShadow: '0 0 40px rgba(251, 191, 36, 0.6)',
            filter: 'brightness(1.1)'
          },
        },
      },
      animation: {
        'breathe-glow': 'breathe-glow 4s ease-in-out infinite',
        'soft-pulse': 'soft-pulse 4s ease-in-out infinite',
        'border-breathe': 'border-breathe 4s ease-in-out infinite',
        'ambient-glow': 'ambient-glow 4s ease-in-out infinite',
        'gentle-pulse': 'gentle-pulse 4s ease-in-out infinite',
        'player-bounce': 'player-bounce 4s ease-in-out infinite',
        'glow-ring': 'glow-ring 4s ease-in-out infinite',
        'title-glow': 'title-glow 4s ease-in-out infinite',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
      },
    }
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
