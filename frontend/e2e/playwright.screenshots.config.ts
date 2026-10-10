import path from 'node:path'
import { defineConfig } from '@playwright/test'

/**
 * Regenerates the screenshots in docs/images (not part of the normal e2e run).
 * Needs the stack running (`node scripts/start.mjs`); starts the Keycloak theme preview on :5174 itself.
 *
 *   npm --prefix frontend run docs:screenshots
 */
export default defineConfig({
  testDir: './screenshots',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  },
  webServer: {
    command: 'npm run dev',
    cwd: path.resolve(import.meta.dirname, '../../keycloakify'),
    url: 'http://localhost:5174/?kc=login.ftl',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
