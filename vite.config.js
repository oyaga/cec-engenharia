import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Todas as chamadas à API (incluindo pagamentos/Asaas) passam pelo
      // backend Go. Não há mais proxies diretos ao Asaas no browser.
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        ws: true,
      },
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('jspdf')) {
              return 'vendor-pdf';
            }
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
