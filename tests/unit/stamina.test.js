import { describe, it, expect } from 'bun:test'
import StaminaModel from '../../sources/Game/Minigames/CayucoRace/logic/StaminaModel.js'
import { RACE_CONFIG } from '../../data/race-config.js'

const ZONE = [88, 112]

function makeStamina() {
  return new StaminaModel(RACE_CONFIG.stamina)
}

describe('StaminaModel', () => {
  it('starts full and not fatigued', () => {
    const s = makeStamina()
    expect(s.value).toBe(1)
    expect(s.fatigued).toBe(false)
  })

  it('drains above the zone, faster with more overshoot', () => {
    const mild = makeStamina()
    const wild = makeStamina()
    for (let i = 0; i < 60; i++) {
      mild.update(1 / 60, ZONE[1] + 10, ZONE)
      wild.update(1 / 60, ZONE[1] + 60, ZONE)
    }
    expect(mild.value).toBeLessThan(1)
    expect(wild.value).toBeLessThan(mild.value)
  })

  it('recovers in-zone and faster at rest', () => {
    const inZone = makeStamina()
    const atRest = makeStamina()
    inZone.value = 0.5
    atRest.value = 0.5
    for (let i = 0; i < 60; i++) {
      inZone.update(1 / 60, (ZONE[0] + ZONE[1]) / 2, ZONE)
      atRest.update(1 / 60, ZONE[0] - 30, ZONE)
    }
    expect(inZone.value).toBeGreaterThan(0.5)
    expect(atRest.value).toBeGreaterThan(inZone.value)
  })

  it('takes an instant hit per same-side stroke', () => {
    const s = makeStamina()
    s.onStroke({ alternated: false })
    expect(s.value).toBeCloseTo(1 - RACE_CONFIG.stamina.sameSideHit)
    s.onStroke({ alternated: true })
    expect(s.value).toBeCloseTo(1 - RACE_CONFIG.stamina.sameSideHit)
  })

  it('applies fatigue hysteresis (enter low, exit higher)', () => {
    const s = makeStamina()
    const { fatigueEnter, fatigueExit } = RACE_CONFIG.stamina

    s.value = fatigueEnter + 0.01
    s.update(1 / 60, ZONE[1] + 60, ZONE)
    // Drain until below enter threshold
    while (s.value > fatigueEnter) s.update(1 / 60, ZONE[1] + 60, ZONE)
    expect(s.fatigued).toBe(true)

    // Recover to just above enter but below exit — still fatigued
    while (s.value < (fatigueEnter + fatigueExit) / 2) s.update(1 / 60, ZONE[0] - 20, ZONE)
    expect(s.fatigued).toBe(true)

    // Recover past exit — fatigue clears
    while (s.value < fatigueExit) s.update(1 / 60, ZONE[0] - 20, ZONE)
    expect(s.fatigued).toBe(false)
  })

  it('strokeFactor spans [minStrokeFactor, 1]', () => {
    const s = makeStamina()
    expect(s.strokeFactor()).toBe(1)
    s.value = 0
    expect(s.strokeFactor()).toBeCloseTo(RACE_CONFIG.stamina.minStrokeFactor)
    s.value = 0.5
    expect(s.strokeFactor()).toBeCloseTo(1)
  })

  it('clamps value to [0, 1]', () => {
    const s = makeStamina()
    for (let i = 0; i < 600; i++) s.update(1 / 60, ZONE[1] + 100, ZONE)
    expect(s.value).toBe(0)
    for (let i = 0; i < 6000; i++) s.update(1 / 60, ZONE[0] - 30, ZONE)
    expect(s.value).toBe(1)
  })
})
