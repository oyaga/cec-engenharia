import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
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

