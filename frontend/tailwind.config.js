/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0B0F17",
        foreground: "#F8FAFC",
        card: {
          DEFAULT: "#111827",
          foreground: "#F8FAFC",
          subtle: "#161F30",
        },
        popover: {
          DEFAULT: "#111827",
          foreground: "#F8FAFC",
        },
        primary: {
          DEFAULT: "#3B82F6",
          foreground: "#FFFFFF",
          glow: "rgba(59, 130, 246, 0.35)",
        },
        secondary: {
          DEFAULT: "#1E293B",
          foreground: "#94A3B8",
        },
        muted: {
          DEFAULT: "#1E293B",
          foreground: "#64748B",
        },
        accent: {
          DEFAULT: "#0EA5E9",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        online: {
          DEFAULT: "#10B981",
          glow: "rgba(16, 185, 129, 0.4)",
        },
        offline: {
          DEFAULT: "#EF4444",
          glow: "rgba(239, 68, 68, 0.4)",
        },
        warning: {
          DEFAULT: "#F59E0B",
          glow: "rgba(245, 158, 11, 0.4)",
        },
        border: "#1E293B",
        input: "#1E293B",
        ring: "#3B82F6",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
