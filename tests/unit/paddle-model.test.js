import { describe, it, expect } from 'bun:test'
import { efficiency, rampFactor } from '../../sources/Game/Minigames/CayucoRace/logic/PaddleModel.js'
import { RACE_CONFIG } from '../../data/race-config.js'

const ZONE = [88, 112]
const CFG = RACE_CONFIG.rhythm
const STROKE = RACE_CONFIG.stroke

describe('efficiency', () => {
  it('is 1.0 across the whole zone plateau', () => {
    for (let bpm = ZONE[0]; bpm <= ZONE[1]; bpm += 2) {
      expect(efficiency(bpm, ZONE, CFG)).toBe(1)
    }
  })

  it('returns 1 for bpm 0 (grace handled by caller)', () => {
    expect(efficiency(0, ZONE, CFG)).toBe(1)
  })

  it('degrades below the zone', () => {
    const at70 = efficiency(70, ZONE, CFG)
    const at50 = efficiency(50, ZONE, CFG)
    expect(at70).toBeLessThan(1)
    expect(at50).toBeLessThan(at70)
  })

  it('degrades above the zone, harsher than below', () => {
    const over = efficiency(ZONE[1] + 20, ZONE, CFG)
    const under = efficiency(ZONE[0] - 20, ZONE, CFG)
    expect(over).toBeLessThan(1)
    expect(over).toBeLessThan(under)
  })

  it('never falls below the floor', () => {
    expect(efficiency(300, ZONE, CFG)).toBeGreaterThanOrEqual(CFG.floor)
    expect(efficiency(1, ZONE, CFG)).toBeGreaterThanOrEqual(CFG.floor)
  })

})

describe('rampFactor (blade grip over hold time)', () => {
  it('ramps up linearly from 0 to full grip', () => {
    expect(rampFactor(0, STROKE)).toBeCloseTo(0, 5)
    const half = rampFactor(STROKE.rampTime / 2, STROKE)
    expect(half).toBeGreaterThan(0)
    expect(half).toBeLessThan(1)
    expect(rampFactor(STROKE.rampTime, STROKE)).toBeCloseTo(1, 5)
  })

  it('holds full grip across the plateau', () => {
    for (let t = STROKE.rampTime; t <= STROKE.stallStart; t += 0.05) {
      expect(rampFactor(t, STROKE)).toBeCloseTo(1, 5)
    }
  })

  it('stalls toward zero well past the stall point — holding forever never wins', () => {
    expect(rampFactor(STROKE.stallStart, STROKE)).toBeCloseTo(1, 5)
    expect(rampFactor(STROKE.stallStart + 0.6, STROKE)).toBeLessThan(0.1)
    // Monotonically decreasing in the stall region
    expect(rampFactor(STROKE.stallStart + 1.0, STROKE)).toBeLessThan(
      rampFactor(STROKE.stallStart + 0.3, STROKE)
    )
  })
})

describe('efficiency (continued)', () => {
  describe('anti-mash invariant: bpm × efficiency peaks inside every act zone', () => {
    for (const act of RACE_CONFIG.acts) {
      it(`act "${act.id}" zone [${act.bpmZone}]`, () => {
        let bestBpm = 0
        let bestPower = -Infinity
        for (let bpm = 40; bpm <= 220; bpm += 1) {
          const power = bpm * efficiency(bpm, act.bpmZone, CFG)
          if (power > bestPower) {
            bestPower = power
            bestBpm = bpm
          }
        }
        expect(bestBpm).toBeGreaterThanOrEqual(act.bpmZone[0])
        expect(bestBpm).toBeLessThanOrEqual(act.bpmZone[1])
      })
    }
  })
})
