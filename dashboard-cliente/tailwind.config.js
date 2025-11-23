/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Aquí podemos agregar colores personalizados para tu dashboard industrial más adelante
      colors: {
        'industrial-dark': '#0f172a',
        'alert-red': '#ef4444',
        'sensor-blue': '#3b82f6',
      }
    },
  },
  plugins: [],
}