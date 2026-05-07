/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090b', // Zinc 950
        surface: '#18181b', // Zinc 900
        surfaceHighlight: '#27272a', // Zinc 800
        primary: '#3b82f6', // Blue 500
        primaryHover: '#2563eb', // Blue 600
        textPrimary: '#f4f4f5', // Zinc 50
        textSecondary: '#a1a1aa', // Zinc 400
        border: '#3f3f46', // Zinc 700
        danger: '#ef4444', // Red 500
        dangerHover: '#dc2626',
        success: '#22c55e', // Green 500
      },
      fontFamily: {
        sans: ['Inter', 'Heebo', 'Assistant', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
