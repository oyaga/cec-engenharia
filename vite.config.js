import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // aceita localhost, 127.0.0.1 e o IP da máquina
    proxy: {
      // API + WebSocket na mesma origem do frontend (elimina CORS no dev).
      // Normaliza o header Origin para um valor que o backend aceita, para o
      // dev funcionar abrindo por localhost, 127.0.0.1 ou IP da rede.
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        ws: true, // o WebSocket do chat vive em /api/v1/ws/chat
        configure: (proxy) => {
          // Normaliza a origem tanto nas requisições HTTP quanto no upgrade do
          // WebSocket (evento separado), para o backend aceitar por qualquer host.
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('origin', 'http://localhost:5173')
          })
          proxy.on('proxyReqWs', (proxyReq) => {
            proxyReq.setHeader('origin', 'http://localhost:5173')
          })
        },
      },
      // Asaas é inteiramente proxied pelo backend Go (/api/v1/payments/*).
      // As rotas /asaas-sandbox e /asaas-production foram removidas — a chave
      // da API nunca deve ir ao browser.
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
