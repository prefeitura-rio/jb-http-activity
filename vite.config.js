import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/execute': 'http://localhost:3000',
      '/save': 'http://localhost:3000',
      '/validate': 'http://localhost:3000',
      '/publish': 'http://localhost:3000',
      '/stop': 'http://localhost:3000',
      '/health': 'http://localhost:3000'
    }
  }
})
