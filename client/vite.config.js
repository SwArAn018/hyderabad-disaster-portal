import { defineConfig } from 'vite'
import react from '@vitejs/react-refresh' // or @vitejs/plugin-react

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'hyderabad-disaster-frontend.onrender.com'
    ]
  }
})