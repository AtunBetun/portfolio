import { describe, it, expect } from 'bun:test'
import { RACE_CONFIG } from '../../data/race-config.js'

describe('RACE_CONFIG', () => {
  it('exports all required keys', () => {
    const requiredKeys = [
      'duration',
      'courseLength',
      'paddleBaseSpeed',
      'perfectBoost',
      'badPenalty',
      'waveInterval',
      'timingWindow',
      'medals',
      'drift'
    ]
    for (const key of requiredKeys) {
      expect(RACE_CONFIG).toHaveProperty(key)
    }
  })

  it('orders medal thresholds gold < silver < bronze', () => {
    const { gold, silver, bronze } = RACE_CONFIG.medals
    expect(gold).toBeLessThan(silver)
    expect(silver).toBeLessThan(bronze)
  })

  it('has positive timing windows with perfect < good', () => {
    const { perfect, good } = RACE_CONFIG.timingWindow
    expect(perfect).toBeGreaterThan(0)
    expect(good).toBeGreaterThan(0)
    expect(perfect).toBeLessThan(good)
  })

  it('has a valid wave interval range', () => {
    const [min, max] = RACE_CONFIG.waveInterval
    expect(min).toBeGreaterThan(0)
    expect(max).toBeGreaterThan(min)
  })

  it('has a positive courseLength', () => {
    expect(RACE_CONFIG.courseLength).toBeGreaterThan(0)
  })

  it('has a positive paddleBaseSpeed', () => {
    expect(RACE_CONFIG.paddleBaseSpeed).toBeGreaterThan(0)
  })

  it('has perfectBoost greater than 1', () => {
    expect(RACE_CONFIG.perfectBoost).toBeGreaterThan(1)
  })

  it('has badPenalty less than 1', () => {
    expect(RACE_CONFIG.badPenalty).toBeLessThan(1)
  })
})
