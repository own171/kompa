import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    process: {
      env: {},
      nextTick: '((fn, ...args) => setTimeout(() => fn(...args), 0))'
    }
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      stream: 'stream-browserify',
      util: 'util',
      process: 'process/browser',
      events: 'events',
    },
  },
  optimizeDeps: {
    include: ['buffer', 'stream-browserify', 'util', 'process', 'events'],
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    fs: {
      allow: ['..']
    }
  },
})