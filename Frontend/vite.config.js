import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    // Ensure every output file carries a content hash so immutable CDN
    // caching is safe and cache-busting happens automatically on deploy.
    rollupOptions: {
      output: {
        // JS entry points
        entryFileNames: 'assets/[name]-[hash].js',
        // JS code-split chunks
        chunkFileNames: 'assets/[name]-[hash].js',
        // CSS, fonts, images, and other static assets
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    // Raise the chunk-size warning threshold slightly (optional)
    chunkSizeWarningLimit: 1000,
  },
})

