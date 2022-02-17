import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vitejs.dev/config/
export default defineConfig({
  root: "src",
  publicDir: "../dist",
  plugins: [svelte()],
  server: {
    port: 5000
  },
  build: {
    outDir: '../dist',
    rollupOptions: {
      output: {
        // remove hashes from asset names
        // https://github.com/vitejs/vite/issues/378
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  }
})
