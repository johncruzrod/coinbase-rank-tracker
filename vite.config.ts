import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist'
  },
  server: {
    proxy: {
      '/api/apps': {
        target: 'https://cryptoapptracker.com',
        changeOrigin: true,
        secure: true,
      }
    }
  }
})
