import { test, expect } from '@playwright/test'

test('room transition via programmatic enterRoom', async ({ page }) => {
  const errors = []
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/')
  await page.waitForFunction(() => window.__game?.loadState === 'ready', { timeout: 15000 })

  expect(await page.evaluate(() => window.__game.activeRoom)).toBe('hub')

  await page.evaluate(() => window.__game.enterRoom('career-pg'))
  expect(await page.evaluate(() => window.__game.activeRoom)).toBe('career-pg')

  expect(errors).toHaveLength(0)
  await page.screenshot({ path: './tests/screenshots/room-transition.png', fullPage: true })
})

test('hash spawn puts player in specific room', async ({ page }) => {
  await page.goto('/#room=career-amazon')
  await page.waitForFunction(() => window.__game?.loadState === 'ready', { timeout: 15000 })

  expect(await page.evaluate(() => window.__game.activeRoom)).toBe('career-amazon')
})

test('all rooms navigable programmatically', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => window.__game?.loadState === 'ready', { timeout: 15000 })

  const rooms = ['hub', 'career-pg', 'career-blackstone', 'career-amazon']
  for (const roomId of rooms) {
    await page.evaluate((id) => window.__game.enterRoom(id), roomId)
    expect(await page.evaluate(() => window.__game.activeRoom)).toBe(roomId)
  }
})
