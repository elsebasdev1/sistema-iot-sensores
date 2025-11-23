import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Esto SÍ es necesario para que MQTT funcione en el navegador
    global: 'window',
  },
  server: {
    host: true, // Esto fuerza a escuchar en 0.0.0.0
    port: 5173, // Asegura el puerto
  }
})