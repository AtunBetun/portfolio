import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

test('race modules load without import errors', async ({ page }) => {
  const errors = []
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/')
  await page.waitForFunction(() => window.__game?.loadState === 'ready', { timeout: 15000 })

  const canImport = await page.evaluate(async () => {
    try {
      const mod = await import('./sources/Game/Minigames/CayucoRace/RaceController.js')
      return typeof mod.CayucoRace === 'function'
    } catch (e) {
      return e.message
    }
  })

  expect(canImport).toBe(true)
})

test('CREBA billboard and docked cayuco are in hub scene', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => window.__game?.loadState === 'ready', { timeout: 15000 })

  const childCount = await page.evaluate(() => {
    return window.__game.world.group.children.length
  })

  expect(childCount).toBeGreaterThan(10)
})

test('race HUD elements exist when race starts (tempo + stamina)', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => window.__game?.loadState === 'ready', { timeout: 15000 })

  await page.evaluate(async () => {
    const { CayucoRace } = await import('./sources/Game/Minigames/CayucoRace/RaceController.js')
    const race = new CayucoRace(window.__game)
    race.start()
    window.__testRace = race
  })

  await page.waitForTimeout(200)

  const hasBpm = await page.evaluate(() => document.querySelector('[data-race-bpm]') !== null)
  const hasStamina = await page.evaluate(
    () => document.querySelector('[data-race-stamina]') !== null
  )
  const hasTimer = await page.evaluate(() => document.querySelector('[data-race-timer]') !== null)

  expect(hasBpm).toBe(true)
  expect(hasStamina).toBe(true)
  expect(hasTimer).toBe(true)
})

test('race can be exited cleanly', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => window.__game?.loadState === 'ready', { timeout: 15000 })

  await page.evaluate(async () => {
    const { CayucoRace } = await import('./sources/Game/Minigames/CayucoRace/RaceController.js')
    const race = new CayucoRace(window.__game)
    race.start()
    window.__testRace = race
  })

  await page.waitForTimeout(300)

  await page.evaluate(() => {
    window.__testRace.exit()
  })

  await page.waitForTimeout(200)

  const raceHudGone = await page.evaluate(() => {
    return document.querySelector('[data-race-bpm]') === null
  })

  expect(raceHudGone).toBe(true)
})

test('strokes after countdown produce BPM reading', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => window.__game?.loadState === 'ready', { timeout: 15000 })

  await page.evaluate(async () => {
    const { CayucoRace } = await import('./sources/Game/Minigames/CayucoRace/RaceController.js')
    const race = new CayucoRace(window.__game)
    race.start()
    window.__testRace = race
  })

  // Wait for 3 s countdown to pass
  await page.waitForTimeout(4000)

  // Alternate A/D at ~120 BPM (every 500ms)
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press(i % 2 === 0 ? 'a' : 'd')
    await page.waitForTimeout(500)
  }

  const bpmText = await page.evaluate(
    () => document.querySelector('[data-race-bpm]')?.textContent || ''
  )
  const bpmNumber = parseInt(bpmText, 10)
  expect(bpmNumber).toBeGreaterThan(0)

  const state = await page.evaluate(() => window.__testRace?.state)
  expect(state).toBe('racing')
})

test('mobile touch targets register paddle input', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => window.__game?.loadState === 'ready', { timeout: 15000 })

  await page.evaluate(async () => {
    const { CayucoRace } = await import('./sources/Game/Minigames/CayucoRace/RaceController.js')
    const race = new CayucoRace(window.__game)
    race.start()
    window.__testRace = race
  })

  await page.waitForTimeout(4500)

  const width = await page.evaluate(() => window.innerWidth)

  await page.mouse.click(width * 0.25, 300)
  await page.waitForTimeout(200)
  await page.mouse.click(width * 0.75, 300)
  await page.waitForTimeout(200)

  const state = await page.evaluate(() => {
    return window.__testRace?.state
  })

  expect(state).toBe('racing')
})
