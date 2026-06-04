import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/asaas-sandbox': {
        target: 'https://sandbox.asaas.com/api/v3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/asaas-sandbox/, '')
      },
      '/asaas-production': {
        target: 'https://api.asaas.com/api/v3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/asaas-production/, '')
      }
    }
  }
})

