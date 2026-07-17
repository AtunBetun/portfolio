import { describe, it, expect } from 'bun:test'
import { RACE_CONFIG } from '../../data/race-config.js'
import { validateActs } from '../../sources/Game/Minigames/CayucoRace/logic/ActTrack.js'

describe('RACE_CONFIG', () => {
  it('exports all required top-level keys', () => {
    const requiredKeys = [
      'courseLength',
      'strokeImpulse',
      'dragHalfLife',
      'paddleCooldown',
      'inputBuffer',
      'maxSpeed',
      'rhythm',
      'stamina',
      'surf',
      'audio',
      'acts',
      'waves',
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

  describe('rhythm', () => {
    it('has sane tracker parameters', () => {
      const { windowSize, smoothing, maxInterval, minInterval, graceStrokes } = RACE_CONFIG.rhythm
      expect(windowSize).toBeGreaterThan(0)
      expect(smoothing).toBeGreaterThan(0)
      expect(smoothing).toBeLessThanOrEqual(1)
      expect(minInterval).toBeGreaterThan(0)
      expect(maxInterval).toBeGreaterThan(minInterval)
      expect(graceStrokes).toBeGreaterThanOrEqual(0)
    })

    it('has an efficiency floor in (0, 1)', () => {
      expect(RACE_CONFIG.rhythm.floor).toBeGreaterThan(0)
      expect(RACE_CONFIG.rhythm.floor).toBeLessThan(1)
    })
  })

  describe('stamina', () => {
    it('has positive rates and hysteresis enter < exit', () => {
      const s = RACE_CONFIG.stamina
      expect(s.drainPerSecond).toBeGreaterThan(0)
      expect(s.recoverPerSecond).toBeGreaterThan(0)
      expect(s.restRecoverPerSecond).toBeGreaterThan(s.recoverPerSecond)
      expect(s.fatigueEnter).toBeLessThan(s.fatigueExit)
      expect(s.minStrokeFactor).toBeGreaterThan(0)
      expect(s.minStrokeFactor).toBeLessThan(1)
    })
  })

  describe('surf', () => {
    it('has a catchable window and surf speed above maxSpeed', () => {
      const { catchHalfWidth, telegraphDistance, surfSpeed, surfDuration } = RACE_CONFIG.surf
      expect(catchHalfWidth).toBeGreaterThan(0)
      expect(telegraphDistance).toBeGreaterThan(catchHalfWidth)
      expect(surfSpeed).toBeGreaterThanOrEqual(RACE_CONFIG.maxSpeed)
      expect(surfDuration).toBeGreaterThan(0)
    })
  })

  describe('acts', () => {
    it('passes validateActs (contiguous 0→1 coverage, sane zones)', () => {
      expect(validateActs(RACE_CONFIG.acts)).toBe(true)
    })

    it('keeps every bpm zone inside the HUD meter scale [40, 180]', () => {
      for (const act of RACE_CONFIG.acts) {
        expect(act.bpmZone[0]).toBeGreaterThanOrEqual(40)
        expect(act.bpmZone[1]).toBeLessThanOrEqual(180)
        if (act.surf) {
          expect(act.surf.surgeZone[0]).toBeGreaterThanOrEqual(40)
          expect(act.surf.surgeZone[1]).toBeLessThanOrEqual(180)
        }
      }
    })

    it('gives every act a name, hint, drum tempo, and sea phase', () => {
      for (const act of RACE_CONFIG.acts) {
        expect(typeof act.name).toBe('string')
        expect(typeof act.hint).toBe('string')
        expect(act.drumBpm).toBeGreaterThan(0)
        expect(act.seaPhase).toBeGreaterThanOrEqual(0)
        expect(act.seaPhase).toBeLessThan(RACE_CONFIG.phases.length)
        expect(act.impulseMult).toBeGreaterThan(0)
        expect(act.dragMult).toBeGreaterThan(0)
      }
    })

    it('sets the drum tempo inside each act zone', () => {
      for (const act of RACE_CONFIG.acts) {
        expect(act.drumBpm).toBeGreaterThanOrEqual(act.bpmZone[0])
        expect(act.drumBpm).toBeLessThanOrEqual(act.bpmZone[1])
      }
    })
  })

  describe('waves', () => {
    it('has positive sigma and speed', () => {
      const { sigma, speed } = RACE_CONFIG.waves
      expect(sigma).toBeGreaterThan(0)
      expect(speed).toBeGreaterThan(0)
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

    it('has surf kick and lift', () => {
      expect(RACE_CONFIG.camera.surfKick).toBeGreaterThan(0)
      expect(RACE_CONFIG.camera.surfLift).toBeGreaterThan(0)
    })
  })

  describe('drag equilibrium sanity', () => {
    it('reaches meaningful speed at cruise cadence', () => {
      const { strokeImpulse, dragHalfLife } = RACE_CONFIG
      const cruise = RACE_CONFIG.acts.find((a) => a.id === 'cruise')
      const strokesPerSecond = cruise.drumBpm / 60
      const dragRate = Math.LN2 / (dragHalfLife * cruise.dragMult)
      const equilibriumSpeed = (strokeImpulse * cruise.impulseMult * strokesPerSecond) / dragRate
      expect(equilibriumSpeed).toBeGreaterThan(5)
    })

    it('can finish the course in gold time at max speed', () => {
      const { courseLength, maxSpeed, medals } = RACE_CONFIG
      const timeAtMax = courseLength / maxSpeed
      expect(timeAtMax).toBeLessThan(medals.gold)
    })
  })
})
