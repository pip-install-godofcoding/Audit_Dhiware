/** @type {import('tailwindcss').Config} */
import colors from 'tailwindcss/colors';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Claude-like terracotta/orange to replace indigo
        indigo: {
          50: '#fcf8f6',
          100: '#f7ede8',
          200: '#efd5cb',
          300: '#e3b5a6',
          400: '#d38c75',
          500: '#c56b4f', // Claude primary accent
          600: '#b45237',
          700: '#96402a',
          800: '#7c3625',
          900: '#672e21'
        },
        // Warm grays to replace cold grays
        gray: colors.stone,
        
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        serif: ["'Playfair Display'", "Georgia", "serif"],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
