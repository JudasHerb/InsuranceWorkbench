import { defineConfig, devices } from '@playwright/test'

const stagingUrl = process.env.PLAYWRIGHT_BASE_URL
const localUrl = 'http://localhost:5173'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: stagingUrl ?? localUrl,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Only start the local dev server when not pointing at a remote URL
  webServer: stagingUrl ? undefined : {
    command: 'npm run dev',
    url: localUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
