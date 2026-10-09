import { defineConfig } from '@playwright/test'

/**
 * Runs against the real stack (`docker compose up -d`), through the nginx edge, exactly like a user:
 * edge → BFF → themed Keycloak → Mailpit. Nothing is mocked. Each run registers a brand-new account,
 * so no credentials are stored anywhere.
 *
 *   E2E_BASE_URL     edge URL           (default http://localhost:8080)
 *   E2E_MAILPIT_URL  Mailpit API/UI     (default http://127.0.0.1:8025, from compose.override.yaml)
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    // Installed Google Chrome: no browser download needed.
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
})
