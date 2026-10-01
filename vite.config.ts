import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  // Dual-stack listen so both http://localhost:5173 and http://127.0.0.1:5173 work
  // (Node on macOS often binds Vite to ::1 only, which makes 127.0.0.1 refuse connections).
  server: {
    host: true,
    port: 5173,
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        hero: resolve(__dirname, 'hero.html'),
        showcase: resolve(__dirname, 'showcase.html'),
        crowdfundStages: resolve(__dirname, 'crowdfund-stages.html'),
        myposition: resolve(__dirname, 'myposition.html'),
        mypositionSplit: resolve(__dirname, 'myposition-split.html'),
        mypositionHero: resolve(__dirname, 'myposition-hero.html'),
        invite: resolve(__dirname, 'invite.html'),
        brand: resolve(__dirname, 'brand.html'),
      },
    },
  },
})
