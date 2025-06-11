import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Especificamos las múltiples entradas de nuestra extensión
      input: {
        popup: 'index.html', // Nuestra página de popup
        background: 'src/background/main.ts', // Nuestro service worker
      },
      output: {
        // Se asegura de que los nombres de los archivos de salida sean predecibles
        entryFileNames: `[name].js`,
        chunkFileNames: `chunks/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
})