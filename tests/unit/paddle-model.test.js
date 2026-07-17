import { describe, it, expect } from 'bun:test'
import { efficiency } from '../../sources/Game/Minigames/CayucoRace/logic/PaddleModel.js'
import { RACE_CONFIG } from '../../data/race-config.js'

const ZONE = [88, 112]
const CFG = RACE_CONFIG.rhythm

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
