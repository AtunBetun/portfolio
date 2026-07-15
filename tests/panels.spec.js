import { test, expect } from '@playwright/test'

test('HUD tracker is visible', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => window.__game?.loadState === 'ready', { timeout: 15000 })

  const hud = page.locator('.js-hud')
  await expect(hud).toBeVisible()
})

test('controls hint disappears on first keypress', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => window.__game?.loadState === 'ready', { timeout: 15000 })

  const controls = page.locator('.js-controls')
  await expect(controls).toBeVisible()

  await page.keyboard.press('KeyW')
  await page.waitForTimeout(600)

  await expect(controls).toHaveClass(/is-hidden/)
})
