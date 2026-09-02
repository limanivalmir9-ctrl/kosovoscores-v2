import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  preview: {
    host: true,
    port: 3000,
    allowedHosts: true
  },
  server: {
    host: true,
    port: 3000,
    allowedHosts: true
  }
})
