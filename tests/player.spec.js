import { test, expect } from '@playwright/test'

test('WASD moves player position', async ({ page }) => {
  const errors = []
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/')
  await page.waitForFunction(() => window.__game?.loadState === 'ready', { timeout: 15000 })

  const startPos = await page.evaluate(() => window.__game.playerPosition)
  expect(startPos).not.toBeNull()

  await page.keyboard.down('KeyW')
  await page.waitForTimeout(300)
  await page.keyboard.up('KeyW')

  const afterW = await page.evaluate(() => window.__game.playerPosition)
  expect(afterW.z).toBeLessThan(startPos.z)

  await page.keyboard.down('KeyD')
  await page.waitForTimeout(300)
  await page.keyboard.up('KeyD')

  const afterD = await page.evaluate(() => window.__game.playerPosition)
  expect(afterD.x).toBeGreaterThan(afterW.x)

  expect(errors).toHaveLength(0)

  await page.screenshot({ path: './tests/screenshots/player-movement.png', fullPage: true })
})

test('player falls off edge and respawns', async ({ page }) => {
  const errors = []
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/')
  await page.waitForFunction(() => window.__game?.loadState === 'ready', { timeout: 15000 })

  await page.evaluate(() => window.__game.teleportPlayer(24, 1, 0))
  await page.waitForTimeout(100)

  await page.keyboard.down('KeyD')
  await page.waitForTimeout(1500)
  await page.keyboard.up('KeyD')

  const pos = await page.evaluate(() => window.__game.playerPosition)
  expect(pos.y).toBeGreaterThan(-5)

  expect(errors).toHaveLength(0)
})
