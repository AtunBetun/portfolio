// The tuning harness: scripted players run the REAL formulas (tracker,
// efficiency, stamina, surf, act-scaled impulse/drag) at 60 Hz. These tests
// pin courseLength / impulseMult / medals numerically — if tuning constants
// change, the assertions here say whether the race still lands near 90 s.

import { describe, it, expect } from 'bun:test'
import { RACE_CONFIG } from '../../data/race-config.js'
import RhythmTracker from '../../sources/Game/Minigames/CayucoRace/logic/RhythmTracker.js'
import { efficiency } from '../../sources/Game/Minigames/CayucoRace/logic/PaddleModel.js'
import StaminaModel from '../../sources/Game/Minigames/CayucoRace/logic/StaminaModel.js'
import ActTrack from '../../sources/Game/Minigames/CayucoRace/logic/ActTrack.js'

const DT = 1 / 60
const MAX_SIM_TIME = 300

// bpmFor(act) decides the stroke tempo the scripted player holds per act.
// catchesWaves grants the surf speed boost for surfDuration per scheduled swell.
function simulateRace({ bpmFor, catchesWaves }) {
  const cfg = RACE_CONFIG
  const tracker = new RhythmTracker(cfg.rhythm)
  const stamina = new StaminaModel(cfg.stamina)
  const actTrack = new ActTrack(cfg.acts)

  let time = 0
  let z = 0
  let speed = 0
  let side = 'left'
  let nextStrokeAt = 0
  let nextSurfIndex = 0
  let surfTimeLeft = 0
  let wavesCaught = 0

  while (z > -cfg.courseLength && time < MAX_SIM_TIME) {
    const progress = Math.min(-z / cfg.courseLength, 1)
    const { act } = actTrack.update(progress)

    // Surf: when a scheduled swell arrives and the player catches it,
    // the wave carries the boat for surfDuration
    if (
      catchesWaves &&
      act.surf &&
      nextSurfIndex < act.surf.schedule.length &&
      progress >= act.surf.schedule[nextSurfIndex]
    ) {
      nextSurfIndex += 1
      surfTimeLeft = cfg.surf.surfDuration
      wavesCaught += 1
    }

    const surfing = surfTimeLeft > 0

    tracker.update(time)
    stamina.update(DT, tracker.bpm, act.bpmZone)

    // Strokes at the scripted tempo
    if (time >= nextStrokeAt) {
      const targetBpm = bpmFor(act, surfing)
      const { alternated } = tracker.recordStroke(time, side)
      stamina.onStroke({ alternated })
      side = side === 'left' ? 'right' : 'left'
      nextStrokeAt = time + 60 / targetBpm

      const graced = tracker.strokeCount <= cfg.rhythm.graceStrokes
      const eff = graced ? 1 : efficiency(tracker.bpm, act.bpmZone, cfg.rhythm)
      speed += cfg.strokeImpulse * act.impulseMult * eff * stamina.strokeFactor()
      speed = Math.min(speed, surfing ? cfg.surf.surfMaxSpeed : cfg.maxSpeed)
    }

    if (surfing) {
      surfTimeLeft -= DT
      // THREE.MathUtils.damp equivalent: exp decay toward surfSpeed
      const t = 1 - Math.exp(-cfg.surf.damp * DT)
      speed += (cfg.surf.surfSpeed - speed) * t
      speed = Math.min(Math.max(speed, 0), cfg.surf.surfMaxSpeed)
    } else {
      speed *= Math.pow(0.5, DT / (cfg.dragHalfLife * act.dragMult))
      speed = Math.min(Math.max(speed, 0), cfg.maxSpeed)
    }

    z -= speed * DT
    time += DT
  }

  return { time, wavesCaught, stamina: stamina.value }
}

describe('race pace simulation', () => {
  it('a perfect player finishes in 85-95s and earns gold', () => {
    const result = simulateRace({
      bpmFor: (act, surfing) => {
        if (surfing) return (act.bpmZone[0] + act.bpmZone[1]) / 2
        if (act.surf) {
          // In the wave act, live near the top of cruise so surges are quick
          return act.bpmZone[1] - 4
        }
        return (act.bpmZone[0] + act.bpmZone[1]) / 2
      },
      catchesWaves: true
    })

    expect(result.wavesCaught).toBe(3)
    expect(result.time).toBeGreaterThan(85)
    expect(result.time).toBeLessThan(95)
    expect(result.time).toBeLessThanOrEqual(RACE_CONFIG.medals.gold)
  })

  it('a sloppy player (wobbling tempo, misses waves) lands between gold and bronze', () => {
    // Oscillates ±28 BPM around zone center — drifting in and out of the
    // zone the way a real unfocused player does
    let stroke = 0
    const result = simulateRace({
      bpmFor: (act) => {
        stroke += 1
        const center = (act.bpmZone[0] + act.bpmZone[1]) / 2
        return center + Math.sin(stroke * 0.35) * 28
      },
      catchesWaves: false
    })

    expect(result.time).toBeGreaterThan(RACE_CONFIG.medals.gold)
    expect(result.time).toBeLessThanOrEqual(RACE_CONFIG.medals.bronze)
  })

  it('sustained overpacing collapses — far slower than holding the zone', () => {
    const perfect = simulateRace({
      bpmFor: (act) => (act.bpmZone[0] + act.bpmZone[1]) / 2,
      catchesWaves: false
    })
    const overpacer = simulateRace({
      bpmFor: (act) => act.bpmZone[1] + 20,
      catchesWaves: false
    })
    const masher = simulateRace({
      bpmFor: () => 200,
      catchesWaves: false
    })

    expect(overpacer.time).toBeGreaterThan(perfect.time * 1.5)
    expect(masher.time).toBeGreaterThan(perfect.time * 1.5)
  })

  it('catching waves is meaningfully faster than skipping them', () => {
    const zoneBpm = (act, surfing) =>
      surfing || !act.surf ? (act.bpmZone[0] + act.bpmZone[1]) / 2 : act.bpmZone[1] - 4
    const withWaves = simulateRace({ bpmFor: zoneBpm, catchesWaves: true })
    const withoutWaves = simulateRace({ bpmFor: zoneBpm, catchesWaves: false })

    expect(withoutWaves.time - withWaves.time).toBeGreaterThan(4)
  })
})
