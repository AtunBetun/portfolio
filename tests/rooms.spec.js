import { test, expect } from '@playwright/test'

test('world loads with hub zone', async ({ page }) => {
  const errors = []
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/')
  await page.waitForFunction(() => window.__game?.loadState === 'ready', { timeout: 15000 })

  const room = await page.evaluate(() => window.__game.activeRoom)
  expect(room).toBe('hub')
  expect(errors).toHaveLength(0)
})

test('hub reachable via enterRoom', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => window.__game?.loadState === 'ready', { timeout: 15000 })

  await page.evaluate(() => window.__game.enterRoom('hub'))
  const current = await page.evaluate(() => window.__game.activeRoom)
  expect(current).toBe('hub')
})
