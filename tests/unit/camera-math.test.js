import { describe, it, expect } from 'bun:test'

describe('camera exponential damping', () => {
  function expDamp(current, target, k, delta) {
    const t = 1 - Math.exp(-k * delta)
    return current + (target - current) * t
  }

  it('converges to target over time', () => {
    let pos = 0
    const target = 10
    const k = 4
    for (let i = 0; i < 120; i++) {
      pos = expDamp(pos, target, k, 1 / 60)
    }
    expect(pos).toBeCloseTo(target, 1)
  })

  it('is frame-rate independent (60fps ≈ 30fps over same duration)', () => {
    const start = 0
    const target = 10
    const k = 4
    const duration = 1.0

    let pos60 = start
    for (let i = 0; i < 60; i++) {
      pos60 = expDamp(pos60, target, k, 1 / 60)
    }

    let pos30 = start
    for (let i = 0; i < 30; i++) {
      pos30 = expDamp(pos30, target, k, 1 / 30)
    }

    expect(Math.abs(pos60 - pos30)).toBeLessThan(0.01)
  })

  it('never overshoots target', () => {
    let pos = 0
    const target = 5
    const k = 8
    for (let i = 0; i < 300; i++) {
      pos = expDamp(pos, target, k, 1 / 60)
      expect(pos).toBeLessThanOrEqual(target + 1e-10)
    }
  })

  it('higher k converges faster', () => {
    const target = 10
    const steps = 30
    const dt = 1 / 60

    let slow = 0
    let fast = 0
    for (let i = 0; i < steps; i++) {
      slow = expDamp(slow, target, 2, dt)
      fast = expDamp(fast, target, 8, dt)
    }
    expect(fast).toBeGreaterThan(slow)
  })
})

describe('camera occlusion logic', () => {
  function simulateOcclusion(occlusionDist, fullDist, hitToi, recoverRate, delta) {
    if (hitToi !== null && hitToi < fullDist) {
      return hitToi * 0.9
    } else {
      const recovered = occlusionDist + recoverRate * delta
      return recovered > fullDist ? fullDist : recovered
    }
  }

  it('pulls camera in on hit', () => {
    const result = simulateOcclusion(12, 12, 5, 2, 1 / 60)
    expect(result).toBeCloseTo(4.5)
  })

  it('recovers gradually when no hit', () => {
    const result = simulateOcclusion(5, 12, null, 2, 1 / 60)
    expect(result).toBeCloseTo(5 + 2 / 60)
  })

  it('caps recovery at full distance', () => {
    const result = simulateOcclusion(11.99, 12, null, 2, 1)
    expect(result).toBe(12)
  })

  it('snaps to hit distance when closer than current', () => {
    const result = simulateOcclusion(10, 12, 3, 2, 1 / 60)
    expect(result).toBeCloseTo(2.7)
  })

  it('ignores hit beyond full distance', () => {
    const result = simulateOcclusion(10, 12, 15, 2, 1 / 60)
    expect(result).toBeCloseTo(10 + 2 / 60)
  })
})
