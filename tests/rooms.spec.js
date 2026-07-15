import { test, expect } from '@playwright/test'

test('world loads with all zones', async ({ page }) => {
  const errors = []
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/')
  await page.waitForFunction(() => window.__game?.loadState === 'ready', { timeout: 15000 })

  const room = await page.evaluate(() => window.__game.activeRoom)
  expect(room).toBe('hub')
  expect(errors).toHaveLength(0)
})

test('entering career zone shows panel', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => window.__game?.loadState === 'ready', { timeout: 15000 })

  await page.evaluate(() => window.__game.enterRoom('career-pg'))
  await page.waitForTimeout(600)

  const panel = page.locator('.js-panel')
  await expect(panel).toBeVisible({ timeout: 3000 })

  const content = await panel.locator('.js-panel-content').innerHTML()
  expect(content).toContain('Procter')
})

test('all career zones accessible via enterRoom', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => window.__game?.loadState === 'ready', { timeout: 15000 })

  const rooms = ['career-pg', 'career-blackstone', 'career-amazon']
  for (const roomId of rooms) {
    await page.evaluate((id) => window.__game.enterRoom(id), roomId)
    const current = await page.evaluate(() => window.__game.activeRoom)
    expect(current).toBe(roomId)
  }
})
