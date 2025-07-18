import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'



// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Make sure asset paths are relative
  build: {
    outDir: path.resolve(__dirname, '../ui/questions/dist'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
