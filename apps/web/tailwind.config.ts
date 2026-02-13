import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        glass: {
          DEFAULT: "rgba(255, 255, 255, 0.08)",
          heavy: "rgba(255, 255, 255, 0.12)",
          border: "rgba(255, 255, 255, 0.15)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "glass-in": "glassIn 0.6s cubic-bezier(0.4, 0, 0.2, 1) backwards",
        shimmer: "shimmer 4s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "gradient-shift": "gradientShift 8s ease infinite",
        "glass-pulse": "glassPulse 3s ease-in-out infinite",
        "progress-glow": "progressGlow 2s ease-in-out infinite",
      },
      keyframes: {
        glassIn: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        glassPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(14, 165, 233, 0.1)" },
          "50%": { boxShadow: "0 0 30px rgba(14, 165, 233, 0.2)" },
        },
        progressGlow: {
          "0%, 100%": { boxShadow: "0 0 8px rgba(14, 165, 233, 0.4)" },
          "50%": { boxShadow: "0 0 16px rgba(14, 165, 233, 0.7)" },
        },
      },
      backdropBlur: {
        glass: "20px",
        "glass-heavy": "40px",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        "glass-hover": "0 12px 40px rgba(0, 0, 0, 0.35), 0 0 20px rgba(14, 165, 233, 0.08)",
        "glow-sky": "0 0 20px rgba(14, 165, 233, 0.3)",
        "glow-cyan": "0 0 20px rgba(6, 182, 212, 0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
