import { describe, it, expect } from 'bun:test'
import { RACE_CONFIG } from '../../data/race-config.js'

describe('RACE_CONFIG', () => {
  it('exports all required top-level keys', () => {
    const requiredKeys = [
      'courseLength',
      'strokeImpulse',
      'dragHalfLife',
      'paddleCooldown',
      'inputBuffer',
      'maxSpeed',
      'flow',
      'waves',
      'timingWindow',
      'medals',
      'drift',
      'phases',
      'camera'
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

  describe('flow', () => {
    it('has a valid cadence band', () => {
      const [min, max] = RACE_CONFIG.flow.band
      expect(min).toBeGreaterThan(0)
      expect(max).toBeGreaterThan(min)
    })

    it('has positive gain, loss, and maxBonus', () => {
      const { gain, loss, maxBonus } = RACE_CONFIG.flow
      expect(gain).toBeGreaterThan(0)
      expect(loss).toBeGreaterThan(0)
      expect(maxBonus).toBeGreaterThan(0)
    })
  })

  describe('waves', () => {
    it('has progressMarks sorted ascending and within (0, 1)', () => {
      const marks = RACE_CONFIG.waves.progressMarks
      expect(marks.length).toBeGreaterThan(0)
      for (let i = 0; i < marks.length; i++) {
        expect(marks[i]).toBeGreaterThan(0)
        expect(marks[i]).toBeLessThan(1)
        if (i > 0) expect(marks[i]).toBeGreaterThan(marks[i - 1])
      }
    })

    it('has positive sigma, speed, and triggerDistance', () => {
      const { sigma, speed, triggerDistance } = RACE_CONFIG.waves
      expect(sigma).toBeGreaterThan(0)
      expect(speed).toBeGreaterThan(0)
      expect(triggerDistance).toBeGreaterThan(0)
    })
  })

  describe('phases', () => {
    const requiredPhaseKeys = [
      'swellAmp',
      'chopAmp',
      'crestPower',
      'swellFreq',
      'swellSpeed',
      'wind',
      'foamThreshold',
      'tintToDeep'
    ]

    it('is an array of 3 phases', () => {
      expect(Array.isArray(RACE_CONFIG.phases)).toBe(true)
      expect(RACE_CONFIG.phases.length).toBe(3)
    })

    it('has all required keys on every phase', () => {
      for (const phase of RACE_CONFIG.phases) {
        for (const key of requiredPhaseKeys) {
          expect(phase).toHaveProperty(key)
        }
      }
    })

    it('has positive swellAmp and chopAmp in every phase', () => {
      for (const phase of RACE_CONFIG.phases) {
        expect(phase.swellAmp).toBeGreaterThan(0)
        expect(phase.chopAmp).toBeGreaterThan(0)
      }
    })
  })

  describe('camera', () => {
    it('has a positive baseFov', () => {
      expect(RACE_CONFIG.camera.baseFov).toBeGreaterThan(0)
    })

    it('has phaseOffsets as an array of 3', () => {
      expect(Array.isArray(RACE_CONFIG.camera.phaseOffsets)).toBe(true)
      expect(RACE_CONFIG.camera.phaseOffsets.length).toBe(3)
    })
  })

  describe('drag equilibrium sanity', () => {
    it('keeps equilibrium speed below maxSpeed at 3 strokes/s', () => {
      const { strokeImpulse, dragHalfLife, maxSpeed } = RACE_CONFIG
      const strokesPerSecond = 3
      const dragRate = Math.LN2 / dragHalfLife
      const equilibriumSpeed = (strokeImpulse * strokesPerSecond) / dragRate
      expect(equilibriumSpeed).toBeLessThan(maxSpeed)
    })
  })
})
