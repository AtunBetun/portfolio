import { describe, it, expect } from 'bun:test'
import { hashFloat } from '../../sources/Game/World/Rooms/districts/Flora.js'

describe('hashFloat', () => {
  it('returns values in [0, 1)', () => {
    for (let a = -50; a <= 50; a += 7) {
      for (let b = -50; b <= 50; b += 7) {
        const v = hashFloat(a, b)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThan(1)
      }
    }
  })

  it('is deterministic (same inputs give same output)', () => {
    expect(hashFloat(3, 7)).toBe(hashFloat(3, 7))
    expect(hashFloat(-12, 5)).toBe(hashFloat(-12, 5))
    expect(hashFloat(0, 0)).toBe(hashFloat(0, 0))
  })

  it('produces different values for different inputs', () => {
    const values = new Set()
    for (let i = 0; i < 100; i++) {
      values.add(hashFloat(i * 7, i * 13))
    }
    expect(values.size).toBe(100)
  })

  it('handles zero inputs', () => {
    const v = hashFloat(0, 0)
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThan(1)
  })

  it('handles large inputs without NaN', () => {
    const v = hashFloat(10000, 20000)
    expect(Number.isNaN(v)).toBe(false)
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThan(1)
  })

  it('has reasonable distribution (no extreme clustering)', () => {
    const buckets = [0, 0, 0, 0]
    for (let i = 0; i < 200; i++) {
      const v = hashFloat(i * 41, i * 43)
      buckets[Math.floor(v * 4)]++
    }
    for (const count of buckets) {
      expect(count).toBeGreaterThan(20)
      expect(count).toBeLessThan(80)
    }
  })
})
