import { test, expect } from '@playwright/test'

test('page loads and renders without errors', async ({ page }) => {
  const errors = []
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/')
  await page.waitForFunction(() => window.__game?.loadState === 'ready', { timeout: 10000 })

  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()

  expect(errors).toHaveLength(0)

  await page.screenshot({ path: './tests/screenshots/smoke-loaded.png', fullPage: true })
})
