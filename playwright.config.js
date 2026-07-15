import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '*.spec.js',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:4173',
    screenshot: 'on',
    video: 'off'
  },
  webServer: {
    command: 'bun run preview',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 15000
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: 'mobile.spec.js',
      use: { viewport: { width: 1280, height: 720 } }
    },
    {
      name: 'mobile',
      testMatch: 'mobile.spec.js',
      use: {
        viewport: { width: 375, height: 667 },
        isMobile: true,
        hasTouch: true
      }
    }
  ],
  outputDir: './tests/screenshots'
})
