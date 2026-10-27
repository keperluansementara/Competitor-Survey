import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repoName = "Competitor-Survey"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES ? `/${repoName}/` : "/",
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      '.ngrok-free.app'
    ]
  }
})


