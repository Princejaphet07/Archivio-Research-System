import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5175
  },
  build: {
    // Increase the warning limit since Firebase is naturally large
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split large vendor libraries into separate cached chunks
        manualChunks: {
          // Firebase core — rarely changes, cached long-term by the browser
          'vendor-firebase': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage',
          ],
          // UI libraries
          'vendor-ui': [
            'sweetalert2',
            'lucide-react',
          ],
        },
      },
    },
  },
})