import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Allow phones on the same Wi‑Fi to load the web app (mobile → web checkout)
    host: true,
    port: 5173,
    strictPort: true,
  },
})
