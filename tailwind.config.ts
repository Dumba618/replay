import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

/** HSL token with alpha support, so utilities like `bg-primary/10` work. */
const token = (name: string): string => `hsl(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1280px" } },
    extend: {
      colors: {
        border: token("border"),
        input: token("input"),
        ring: token("ring"),
        background: token("background"),
        foreground: token("foreground"),
        primary: { DEFAULT: token("primary"), foreground: token("primary-foreground") },
        secondary: { DEFAULT: token("secondary"), foreground: token("secondary-foreground") },
        accent: { DEFAULT: token("accent"), foreground: token("accent-foreground") },
        muted: { DEFAULT: token("muted"), foreground: token("muted-foreground") },
        destructive: { DEFAULT: token("destructive"), foreground: token("destructive-foreground") },
        card: { DEFAULT: token("card"), foreground: token("card-foreground") },
        popover: { DEFAULT: token("popover"), foreground: token("popover-foreground") },
        lime: { DEFAULT: token("lime"), foreground: token("lime-foreground") },
        amber: { DEFAULT: token("amber"), foreground: token("amber-foreground") },
        ink: token("ink"),
        cream: token("cream"),
        sky: token("sky"),
        azure: token("azure"),
        leaf: token("leaf"),
        sun: token("sun"),
        flame: token("flame"),
        level: {
          unranked: token("level-unranked"),
          bronze: token("level-bronze"),
          silver: token("level-silver"),
          gold: token("level-gold"),
          platinum: token("level-platinum"),
          diamond: token("level-diamond"),
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.6)" },
          "70%": { opacity: "1", transform: "scale(1.08)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-8px)" },
          "40%": { transform: "translateX(8px)" },
          "60%": { transform: "translateX(-5px)" },
          "80%": { transform: "translateX(5px)" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 hsl(var(--lime) / 0.55)" },
          "100%": { boxShadow: "0 0 0 18px hsl(var(--lime) / 0)" },
        },
      },
      animation: {
        "pop-in": "pop-in 450ms cubic-bezier(0.22, 1, 0.36, 1) both",
        shake: "shake 380ms ease-in-out",
        "pulse-ring": "pulse-ring 1.6s ease-out infinite",
      },
    },
  },
  plugins: [animate],
};

export default config;
