import { defineConfig } from '@playwright/test'
import { randomBytes } from 'node:crypto'
import { mkdirSync, mkdtempSync } from 'node:fs'
import path from 'node:path'

const host = process.env.E2E_HOST || '127.0.0.1'
const frontendPort = Number(process.env.E2E_FRONTEND_PORT || 5274)
const backendPort = Number(process.env.E2E_BACKEND_PORT || 8200)
const frontendOrigin = `http://${host}:${frontendPort}`
const backendOrigin = `http://${host}:${backendPort}`
process.env.E2E_ADMIN_EMAIL ||= 'evaluator@example.com'
process.env.E2E_ADMIN_PASSWORD ||= randomBytes(24).toString('base64url')
const output = path.resolve('test-results')
mkdirSync(output, { recursive: true })
const database = path.join(
  mkdtempSync(path.join(output, 'database-')),
  'e2e.sqlite3',
)

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results/browser',
  workers: 1,
  use: {
    baseURL: frontendOrigin,
    browserName: 'chromium',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: `.venv\\Scripts\\python.exe -m app.seed && .venv\\Scripts\\python.exe -m uvicorn app.main:create_app --factory --host ${host} --port ${backendPort}`,
      cwd: path.resolve('../backend'),
      url: `${backendOrigin}/api/health`,
      env: {
        CREDISURE_DATABASE_PATH: database,
        CREDISURE_ADMIN_EMAIL: process.env.E2E_ADMIN_EMAIL,
        CREDISURE_ADMIN_PASSWORD: process.env.E2E_ADMIN_PASSWORD,
        CREDISURE_ALLOWED_ORIGINS: JSON.stringify([frontendOrigin]),
      },
    },
    {
      command: `npm run dev -- --host ${host} --port ${frontendPort} --strictPort`,
      url: frontendOrigin,
      env: { BACKEND_PROXY_TARGET: backendOrigin, VITE_API_BASE_URL: '/api' },
    },
  ],
})
