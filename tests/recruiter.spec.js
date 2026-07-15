import { test, expect } from '@playwright/test'

test('recruiter persona — visits all career rooms and sees content', async ({ page }) => {
  const errors = []
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/')
  await page.waitForFunction(() => window.__game?.loadState === 'ready', { timeout: 15000 })

  const careerRooms = [
    { id: 'career-pg', company: 'Procter', role: 'Finance' },
    { id: 'career-blackstone', company: 'Blackstone', role: 'Software Engineer' },
    { id: 'career-amazon', company: 'Amazon', role: 'Software Engineer' }
  ]

  for (const room of careerRooms) {
    await page.evaluate((id) => window.__game.enterRoom(id), room.id)
    await page.waitForTimeout(600)

    const panel = page.locator('.js-panel')
    await expect(panel).toBeVisible({ timeout: 3000 })

    const content = await panel.locator('.js-panel-content').innerHTML()
    expect(content).toContain(room.company)
    expect(content).toContain(room.role)

    await page.screenshot({
      path: `./tests/screenshots/recruiter-${room.id}.png`,
      fullPage: true
    })

    await page.locator('.js-panel-close').click()
    await page.waitForTimeout(400)
  }

  expect(errors).toHaveLength(0)
})

test('collectible tracker shows correct total', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => window.__game?.loadState === 'ready', { timeout: 15000 })

  const total = await page.locator('.js-tracker-total').textContent()
  expect(Number(total)).toBe(6)
})
