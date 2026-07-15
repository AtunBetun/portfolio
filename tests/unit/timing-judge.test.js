import { describe, it, expect } from 'bun:test'
import { RACE_CONFIG } from '../../data/race-config.js'

function judgeTiming(delta) {
  const abs = Math.abs(delta)
  if (abs <= RACE_CONFIG.timingWindow.perfect) return 'perfect'
  if (abs <= RACE_CONFIG.timingWindow.good) return 'good'
  return 'bad'
}

describe('timing judgment', () => {
  it('returns perfect for delta = 0', () => {
    expect(judgeTiming(0)).toBe('perfect')
  })

  it('returns perfect for delta within perfect window (0.05)', () => {
    expect(judgeTiming(0.05)).toBe('perfect')
  })

  it('returns perfect at the perfect boundary (0.08)', () => {
    expect(judgeTiming(0.08)).toBe('perfect')
  })

  it('returns good for delta within good window (0.1)', () => {
    expect(judgeTiming(0.1)).toBe('good')
  })

  it('returns good at the good boundary (0.2)', () => {
    expect(judgeTiming(0.2)).toBe('good')
  })

  it('returns bad for delta outside good window (0.3)', () => {
    expect(judgeTiming(0.3)).toBe('bad')
  })

  it('returns perfect for negative delta within perfect window', () => {
    expect(judgeTiming(-0.05)).toBe('perfect')
  })

  it('returns good for negative delta within good window', () => {
    expect(judgeTiming(-0.15)).toBe('good')
  })

  it('returns bad for negative delta outside good window', () => {
    expect(judgeTiming(-0.5)).toBe('bad')
  })

  it('returns perfect exactly at the configured perfect boundary', () => {
    expect(judgeTiming(RACE_CONFIG.timingWindow.perfect)).toBe('perfect')
    expect(judgeTiming(-RACE_CONFIG.timingWindow.perfect)).toBe('perfect')
  })
})
