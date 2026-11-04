import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      proxy: env.BACKEND_PROXY_TARGET ? {
        '/api': { target: env.BACKEND_PROXY_TARGET, changeOrigin: true },
      } : undefined,
    },
  }
})
