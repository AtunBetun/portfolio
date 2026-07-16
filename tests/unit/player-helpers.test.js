import { describe, it, expect } from 'bun:test'
import {
  TUNING,
  moveToward,
  dampAngle,
  stepJumpWindows,
  computePlayerState,
  computeBushMultiplier
} from '../../sources/Game/Player.js'

describe('moveToward', () => {
  it('reaches target when within maxDelta', () => {
    expect(moveToward(0, 0.5, 1)).toBe(0.5)
  })

  it('advances by maxDelta when target is far', () => {
    expect(moveToward(0, 10, 3)).toBe(3)
  })

  it('works in the negative direction', () => {
    expect(moveToward(5, 0, 2)).toBe(3)
  })

  it('returns target exactly at boundary', () => {
    expect(moveToward(0, 3, 3)).toBe(3)
  })

  it('handles zero maxDelta (no movement)', () => {
    expect(moveToward(5, 10, 0)).toBe(5)
  })

  it('handles negative target', () => {
    expect(moveToward(0, -8, 3)).toBe(-3)
  })

  it('does not overshoot', () => {
    const result = moveToward(9.9, 10, 1)
    expect(result).toBe(10)
  })
})

describe('dampAngle', () => {
  it('moves toward target by factor t', () => {
    const result = dampAngle(0, 1, 0.5)
    expect(result).toBeCloseTo(0.5)
  })

  it('wraps around +PI correctly', () => {
    const result = dampAngle(3, -3, 0.5)
    const expected = 3 + ((-3 - 3 + 2 * Math.PI) * 0.5)
    expect(result).toBeCloseTo(expected)
  })

  it('wraps around -PI correctly', () => {
    const result = dampAngle(-3, 3, 0.5)
    const expected = -3 + ((3 - (-3) - 2 * Math.PI) * 0.5)
    expect(result).toBeCloseTo(expected)
  })

  it('handles t=0 (no change)', () => {
    expect(dampAngle(1, 2, 0)).toBeCloseTo(1)
  })

  it('handles t=1 (snap to target)', () => {
    expect(dampAngle(0.5, 2.5, 1)).toBeCloseTo(2.5)
  })

  it('takes the short way around from -2.9 to 2.9', () => {
    const result = dampAngle(-2.9, 2.9, 1.0)
    const diff = 2.9 - (-2.9) - 2 * Math.PI
    expect(result).toBeCloseTo(-2.9 + diff)
  })
})

describe('stepJumpWindows (coyote time + jump buffer)', () => {
  it('triggers jump when both windows are active', () => {
    const result = stepJumpWindows({
      grounded: false,
      jumpJustPressed: true,
      coyoteTimer: 0.05,
      bufferTimer: 0,
      delta: 1 / 60
    })
    expect(result.shouldJump).toBe(true)
    expect(result.coyoteTimer).toBe(0)
    expect(result.bufferTimer).toBe(0)
  })

  it('coyote time allows jump shortly after leaving ground', () => {
    const result = stepJumpWindows({
      grounded: false,
      jumpJustPressed: true,
      coyoteTimer: TUNING.coyoteTime - 0.01,
      bufferTimer: 0,
      delta: 1 / 60
    })
    expect(result.shouldJump).toBe(true)
  })

  it('jump buffer allows landing shortly after pressing jump', () => {
    const result = stepJumpWindows({
      grounded: true,
      jumpJustPressed: false,
      coyoteTimer: 0,
      bufferTimer: TUNING.jumpBuffer - 0.01,
      delta: 1 / 60
    })
    expect(result.shouldJump).toBe(true)
  })

  it('does not jump when coyote expired', () => {
    const result = stepJumpWindows({
      grounded: false,
      jumpJustPressed: true,
      coyoteTimer: -0.01,
      bufferTimer: 0,
      delta: 1 / 60
    })
    expect(result.shouldJump).toBe(false)
  })

  it('does not jump when buffer expired', () => {
    const result = stepJumpWindows({
      grounded: false,
      jumpJustPressed: false,
      coyoteTimer: 0.05,
      bufferTimer: -0.05,
      delta: 1 / 60
    })
    expect(result.shouldJump).toBe(false)
  })

  it('resets coyote timer when grounded', () => {
    const result = stepJumpWindows({
      grounded: true,
      jumpJustPressed: false,
      coyoteTimer: 0.01,
      bufferTimer: -1,
      delta: 1 / 60
    })
    expect(result.coyoteTimer).toBe(TUNING.coyoteTime)
  })

  it('decrements coyote timer when airborne', () => {
    const delta = 1 / 60
    const result = stepJumpWindows({
      grounded: false,
      jumpJustPressed: false,
      coyoteTimer: 0.1,
      bufferTimer: -1,
      delta
    })
    expect(result.coyoteTimer).toBeCloseTo(0.1 - delta)
  })
})

describe('computePlayerState', () => {
  it('returns land on ground-touch frame', () => {
    expect(computePlayerState({
      wasGrounded: false, grounded: true,
      inputActive: false, horizSpeed: 0, verticalVelocity: 0
    })).toBe('land')
  })

  it('returns idle when grounded with no input', () => {
    expect(computePlayerState({
      wasGrounded: true, grounded: true,
      inputActive: false, horizSpeed: 0, verticalVelocity: 0
    })).toBe('idle')
  })

  it('returns run when grounded with input and speed', () => {
    expect(computePlayerState({
      wasGrounded: true, grounded: true,
      inputActive: true, horizSpeed: 5, verticalVelocity: 0
    })).toBe('run')
  })

  it('returns idle when grounded with input but no speed', () => {
    expect(computePlayerState({
      wasGrounded: true, grounded: true,
      inputActive: true, horizSpeed: 0.05, verticalVelocity: 0
    })).toBe('idle')
  })

  it('returns jump when rising fast', () => {
    expect(computePlayerState({
      wasGrounded: false, grounded: false,
      inputActive: false, horizSpeed: 0, verticalVelocity: 5
    })).toBe('jump')
  })

  it('returns apex near zero vertical velocity', () => {
    expect(computePlayerState({
      wasGrounded: false, grounded: false,
      inputActive: false, horizSpeed: 0, verticalVelocity: 0.5
    })).toBe('apex')
  })

  it('returns fall when descending past threshold', () => {
    expect(computePlayerState({
      wasGrounded: false, grounded: false,
      inputActive: false, horizSpeed: 0, verticalVelocity: -5
    })).toBe('fall')
  })

  it('land takes priority over run', () => {
    expect(computePlayerState({
      wasGrounded: false, grounded: true,
      inputActive: true, horizSpeed: 5, verticalVelocity: 0
    })).toBe('land')
  })
})

describe('computeBushMultiplier', () => {
  const bushes = [
    { x: 5, z: 5, r: 0.5 },
    { x: -3, z: 8, r: 0.7 }
  ]

  it('returns 1 when far from any bush', () => {
    expect(computeBushMultiplier(0, 0, 0, bushes)).toBe(1)
  })

  it('returns 0.55 when inside a bush radius', () => {
    expect(computeBushMultiplier(5, 0.5, 5, bushes)).toBe(0.55)
  })

  it('returns 0.55 when within padding distance of a bush', () => {
    expect(computeBushMultiplier(5.7, 0.5, 5, bushes)).toBe(0.55)
  })

  it('returns 1 when just outside bush + padding', () => {
    expect(computeBushMultiplier(5, 0.5, 5.9, bushes)).toBe(1)
  })

  it('returns 0.55 when submerged (y < -0.15) regardless of bushes', () => {
    expect(computeBushMultiplier(0, -0.5, 0, [])).toBe(0.55)
  })

  it('returns 1 when at water surface level', () => {
    expect(computeBushMultiplier(0, -0.15, 0, [])).toBe(1)
  })

  it('returns 1 with empty bush list', () => {
    expect(computeBushMultiplier(5, 0, 5, [])).toBe(1)
  })
})
