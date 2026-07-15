import { test, expect } from '@playwright/test'

test('mobile: page loads without errors at 375px', async ({ page }) => {
  const errors = []
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/')
  await page.waitForFunction(() => window.__game?.loadState === 'ready', { timeout: 15000 })

  expect(errors).toHaveLength(0)
})

test('mobile: HUD visible and canvas renders', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => window.__game?.loadState === 'ready', { timeout: 15000 })

  const hud = page.locator('.js-hud')
  await expect(hud).toBeVisible()

  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()

  await page.screenshot({ path: './tests/screenshots/mobile-hub.png', fullPage: true })
})
