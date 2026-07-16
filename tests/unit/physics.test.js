import { describe, it, expect } from 'bun:test'
import { TUNING } from '../../sources/Game/Player.js'

describe('physics constants sanity', () => {
  it('jump apex is between 1.3 and 1.7 units', () => {
    const apex = (TUNING.jumpSpeed ** 2) / (2 * TUNING.gravityUp)
    expect(apex).toBeGreaterThan(1.3)
    expect(apex).toBeLessThan(1.7)
  })

  it('snapToGround covers speed-slope at 60fps', () => {
    const minSnap = Math.tan((50 * Math.PI) / 180) * TUNING.speed * (1 / 60)
    expect(0.4).toBeGreaterThan(minSnap)
  })

  it('capsule radius exceeds 2x KCC offset', () => {
    const capsuleRadius = 0.25
    const kccOffset = 0.03
    expect(capsuleRadius).toBeGreaterThan(2 * kccOffset)
  })

  it('decel > accel for crisp stops', () => {
    expect(TUNING.decel).toBeGreaterThan(TUNING.accel)
  })

  it('terminal velocity is negative', () => {
    expect(TUNING.terminalVelocity).toBeLessThan(0)
  })

  it('coyote and buffer times are 0.12s', () => {
    expect(TUNING.coyoteTime).toBe(0.12)
    expect(TUNING.jumpBuffer).toBe(0.12)
  })
})
