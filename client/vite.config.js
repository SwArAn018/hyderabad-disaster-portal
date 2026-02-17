import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'hyderabad-disaster-frontend.onrender.com'
    ]
  },
  preview: {
    allowedHosts: [
      'hyderabad-disaster-frontend.onrender.com'
    ]
  }
})