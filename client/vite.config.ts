import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: '..',
  server: {
    host: 'localhost',
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
