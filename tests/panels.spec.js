import { test, expect } from '@playwright/test'

test('panel appears when entering career room', async ({ page }) => {
  const errors = []
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/#room=career-pg')
  await page.waitForFunction(() => window.__game?.loadState === 'ready', { timeout: 15000 })

  const panel = page.locator('.js-panel')
  await expect(panel).toBeVisible({ timeout: 3000 })

  const content = await panel.locator('.js-panel-content').innerHTML()
  expect(content).toContain('Procter')
  expect(content).toContain('Finance')

  expect(errors).toHaveLength(0)
  await page.screenshot({ path: './tests/screenshots/panel-career-pg.png', fullPage: true })
})

test('panel close button works', async ({ page }) => {
  await page.goto('/#room=career-blackstone')
  await page.waitForFunction(() => window.__game?.loadState === 'ready', { timeout: 15000 })

  const panel = page.locator('.js-panel')
  await expect(panel).toBeVisible({ timeout: 3000 })

  await page.locator('.js-panel-close').click()
  await page.waitForTimeout(400)

  await expect(panel).not.toBeVisible()
})

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
