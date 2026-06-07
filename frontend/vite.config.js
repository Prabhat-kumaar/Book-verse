import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['es-toolkit']
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router-dom')) return 'vendor.react-router'
            if (id.includes('/react-dom') || id.includes('/react/') || id.includes('/scheduler/')) return 'vendor.react'
            if (id.includes('recharts')) return 'vendor.recharts'
            if (id.includes('pdfjs-dist')) return 'vendor.pdfjs'
            if (id.includes('epubjs')) return 'vendor.epubjs'
            if (id.includes('framer-motion')) return 'vendor.framer-motion'
            if (id.includes('axios')) return 'vendor.axios'
            return 'vendor'
          }
          if (id.includes('src/pages/admin/AdminBlogCreateEditPage')) return 'admin-blog-create-edit'
          if (id.includes('src/pages/admin/AdminBlogAnalyticsPage')) return 'admin-blog-analytics'
          if (id.includes('src/pages/admin/AdminDashboardPage')) return 'admin-dashboard'
          if (id.includes('src/pages/admin/AdminUsersPage')) return 'admin-users'
          if (id.includes('src/pages/admin/AdminManageBooksPage')) return 'admin-manage-books'
          if (id.includes('src/pages/AdminAnalyticsPage')) return 'admin-analytics'
          if (id.includes('src/pages/AdminAddBookPage')) return 'admin-add-book'
          if (id.includes('src/pages/EpubReaderPage')) return 'reader-epub'
          if (id.includes('src/pages/PdfReaderPage')) return 'reader-pdf'
          if (id.includes('src/pages/UnifiedReaderPage')) return 'reader-unified'
          return undefined
        },
      },
    },
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
