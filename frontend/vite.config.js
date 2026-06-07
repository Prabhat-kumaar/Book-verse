import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['recharts', 'es-toolkit']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Group primary React libraries
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('react-router-dom') ||
              id.includes('react-helmet-async')
            ) {
              return 'vendor-core'
            }
            // Group heavy charting packages
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-charts'
            }
            // Group heavy e-reading & document parsers
            if (
              id.includes('epubjs') ||
              id.includes('pdfjs-dist') ||
              id.includes('jszip')
            ) {
              return 'vendor-reader'
            }
            // Group text editing libraries
            if (id.includes('@tiptap') || id.includes('prosemirror')) {
              return 'vendor-editor'
            }
            // Group other generic modules
            return 'vendor-misc'
          }
          return undefined
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
})
