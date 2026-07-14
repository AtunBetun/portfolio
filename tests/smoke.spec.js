import { test, expect } from '@playwright/test'

test('page loads and renders without errors', async ({ page }) => {
  const errors = []
  const logs = []
  page.on('pageerror', (err) => errors.push(err.message))
  page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`))

  await page.goto('/')
  await page.waitForFunction(() => window.__game?.loadState === 'ready', { timeout: 15000 })

  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()

  expect(errors).toHaveLength(0)

  await page.screenshot({ path: './tests/screenshots/smoke-loaded.png', fullPage: true })
})
